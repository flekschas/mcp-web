import { afterEach, expect, test } from 'bun:test';
import {
  type BridgeList,
  watchBridgeNotifications,
} from './bridge-notifications.js';

type StreamHandler = (request: Request) => Response | Promise<Response>;

interface FakeBridge {
  url: string;
  requests: { method: string; authorization: string | null }[];
  stop: () => void;
}

let bridge: FakeBridge | undefined;
let stopWatching: (() => void) | undefined;

afterEach(() => {
  stopWatching?.();
  bridge?.stop();
  stopWatching = undefined;
  bridge = undefined;
});

/** A bridge that accepts `initialize` and answers stream GETs with `onStream`. */
function startFakeBridge(
  onStream: StreamHandler,
  onDelete: StreamHandler = () => new Response(null, { status: 204 }),
): FakeBridge {
  const requests: FakeBridge['requests'] = [];
  const server = Bun.serve({
    port: 0,
    idleTimeout: 0,
    fetch(request) {
      requests.push({
        method: request.method,
        authorization: request.headers.get('authorization'),
      });
      if (request.method === 'POST') {
        return Response.json(
          { jsonrpc: '2.0', id: 1, result: {} },
          { headers: { 'Mcp-Session-Id': 'session-1' } },
        );
      }
      if (request.method === 'DELETE') return onDelete(request);
      return onStream(request);
    },
  });
  return {
    url: `http://localhost:${server.port}`,
    requests,
    stop: () => server.stop(true),
  };
}

function sseResponse(
  events: string[],
  keepOpen: boolean,
  contentType = 'text/event-stream',
): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      // A comment makes the server send headers before any event.
      controller.enqueue(encoder.encode(': open\n\n'));
      for (const event of events) {
        controller.enqueue(encoder.encode(`data: ${event}\n\n`));
      }
      if (!keepOpen) controller.close();
    },
  });
  return new Response(body, {
    headers: { 'Content-Type': contentType },
  });
}

/** Never answers until the request is aborted. */
function stalledResponse(request: Request): Promise<Response> {
  return new Promise((resolve) => {
    request.signal.addEventListener('abort', () => {
      resolve(new Response(null, { status: 204 }));
    });
  });
}

/** Starts watching and returns the lists reported as changed, in order. */
function watch(url: string, timeout = 1000): BridgeList[] {
  const changes: BridgeList[] = [];
  stopWatching = watchBridgeNotifications({
    url,
    authToken: 'token',
    timeout,
    onListChanged: (list) => changes.push(list),
  });
  return changes;
}

const listChanged = (list: string) =>
  JSON.stringify({
    jsonrpc: '2.0',
    method: `notifications/${list}/list_changed`,
  });

test('reports every list when the stream opens and each list_changed event', async () => {
  bridge = startFakeBridge(() =>
    sseResponse(
      [listChanged('tools'), listChanged('resources'), listChanged('prompts')],
      true,
    ),
  );
  const changes = watch(bridge.url);

  await Bun.sleep(300);
  expect(changes).toEqual(['tools', 'resources', 'tools', 'resources']);
});

test('sends the auth token with every request', async () => {
  bridge = startFakeBridge(() => sseResponse([], false));
  watch(bridge.url);

  await Bun.sleep(300);
  const methods = bridge.requests.map((request) => request.method);
  expect(methods).toEqual(['POST', 'GET', 'DELETE']);
  for (const request of bridge.requests) {
    expect(request.authorization).toBe('Bearer token');
  }
});

test('does not treat a non-stream response as an open stream', async () => {
  bridge = startFakeBridge(
    () =>
      new Response('<html></html>', {
        headers: { 'Content-Type': 'text/html' },
      }),
  );
  const changes = watch(bridge.url);

  await Bun.sleep(1500);
  expect(changes).toEqual([]);
});

test('compares the stream media type exactly', async () => {
  bridge = startFakeBridge(() =>
    sseResponse([], true, 'Text/Event-Stream; charset=utf-8'),
  );
  const accepted = watch(bridge.url);
  await Bun.sleep(300);
  expect(accepted).toEqual(['tools', 'resources']);

  stopWatching?.();
  bridge.stop();
  bridge = startFakeBridge(() =>
    sseResponse([], true, 'text/event-stream-extra'),
  );
  const rejected = watch(bridge.url);
  await Bun.sleep(300);
  expect(rejected).toEqual([]);
});

test('retries a stream request whose headers do not arrive in time', async () => {
  let streamCount = 0;
  bridge = startFakeBridge((request) => {
    streamCount++;
    return streamCount === 1 ? stalledResponse(request) : sseResponse([], true);
  });
  const changes = watch(bridge.url, 200);

  // The first request is aborted at 200ms and the retry follows 1s later.
  await Bun.sleep(1600);
  expect(streamCount).toBe(2);
  expect(changes).toEqual(['tools', 'resources']);
});

test('backs off when the bridge keeps ending streams right away', async () => {
  bridge = startFakeBridge(() => sseResponse([], false));
  watch(bridge.url);

  // Streams open at 0s, 1s, and 3s. Without backoff, a fourth opens at 3s.
  await Bun.sleep(3500);
  const streams = bridge.requests.filter((request) => request.method === 'GET');
  expect(streams.length).toBeGreaterThanOrEqual(2);
  expect(streams.length).toBeLessThanOrEqual(3);
});

test('gives up on a session DELETE the bridge does not answer', async () => {
  let deleteAborted = false;
  bridge = startFakeBridge(
    () => sseResponse([], true),
    (request) => {
      request.signal.addEventListener('abort', () => {
        deleteAborted = true;
      });
      return stalledResponse(request);
    },
  );
  const changes = watch(bridge.url);
  await Bun.sleep(200);
  expect(changes).toEqual(['tools', 'resources']);

  stopWatching?.();
  await Bun.sleep(2500);
  expect(deleteAborted).toBe(true);
});
