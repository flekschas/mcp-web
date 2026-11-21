/**
 * Cloudflare Workers adapter for the MCP Web Bridge.
 *
 * A Worker routes requests to Durable Objects; each Durable Object runs one
 * {@link MCPWebBridge} core. Objects are keyed by room id, derived from the
 * auth token, so every session and MCP client belonging to one token lands in
 * the same object and the core's in-memory maps work unchanged.
 *
 * @example
 * ```typescript
 * // worker.ts
 * import { createCloudflareBridge } from '@mcp-web/bridge/cloudflare';
 *
 * const bridge = createCloudflareBridge({
 *   config: { name: 'My App', description: 'My awesome app' },
 * });
 *
 * export const MCPWebBridgeObject = bridge.DurableObject;
 * export const MCPWebQueryIndex = bridge.QueryIndex;
 * export default bridge.worker;
 * ```
 *
 * @remarks
 * Sockets are accepted with `accept()`, so an object stays in memory while a
 * client is connected. Hibernation would need the per-session tool and resource
 * registries moved out of memory into storage.
 *
 * Scheduled work uses timers, not alarms. Everything the core schedules acts on
 * in-memory state, which is gone once the object is evicted, so an alarm would
 * only wake an object up to inspect maps that no longer exist.
 *
 * MCP sessions live in memory too. A client idle across an eviction or a deploy
 * gets `404` for its `Mcp-Session-Id` and re-initializes, as the MCP spec
 * requires.
 *
 * @see https://developers.cloudflare.com/durable-objects/
 */

import type { MCPWebConfig } from '@mcp-web/types';
import { deriveRoomId } from '@mcp-web/types';
import { MCPWebBridge } from '../core.js';
import { TimerScheduler } from '../runtime/scheduler.js';
import type { HttpRequest, WebSocketConnection } from '../runtime/types.js';
import { isSSEResponse } from '../runtime/types.js';
import type {
  AssetsBinding,
  CloudflareResponseInit,
  CloudflareWebSocket,
  DurableObjectNamespace,
  DurableObjectState,
  DurableObjectStorage,
} from './cloudflare-types.js';
import { newWebSocketPair } from './cloudflare-types.js';

// ============================================
// Configuration
// ============================================

/**
 * Bindings the adapter expects on the Worker `env`.
 *
 * Names are configurable via {@link CloudflareBridgeOptions.bindings}; these
 * are the defaults.
 */
export interface CloudflareBridgeEnv {
  /** Namespace holding the bridge Durable Objects. */
  MCP_WEB_BRIDGE: DurableObjectNamespace;

  /** Namespace holding the single query-index object. Only needed with an agent. */
  MCP_WEB_QUERY_INDEX?: DurableObjectNamespace;

  /** Static assets binding. Present when the Worker also serves a frontend. */
  ASSETS?: AssetsBinding;
}

/**
 * Reads a binding by its configured name.
 *
 * Binding names are chosen at runtime, so they cannot be expressed in the `Env`
 * type a caller supplies.
 */
function binding<T>(env: unknown, name: string): T | undefined {
  return (env as Record<string, unknown>)[name] as T | undefined;
}

export interface CloudflareBridgeBindings {
  /** Default: `MCP_WEB_BRIDGE` */
  bridge?: string;

  /** Default: `MCP_WEB_QUERY_INDEX` */
  queryIndex?: string;

  /** Default: `ASSETS` */
  assets?: string;
}

export interface CloudflareBridgeOptions<Env = CloudflareBridgeEnv> {
  /**
   * Bridge configuration, or a factory receiving the Worker `env` for
   * configuration that depends on secrets or vars.
   */
  config:
    | Omit<MCPWebConfig, 'bridgeUrl'>
    | ((env: Env) => Omit<MCPWebConfig, 'bridgeUrl'>);

  /** Override the default binding names. */
  bindings?: CloudflareBridgeBindings;

  /**
   * Serve unmatched requests from the `ASSETS` binding.
   * Defaults to true when the binding exists.
   */
  serveAssets?: boolean;
}

/** Room used for requests that carry no auth token, such as CORS preflights. */
const ANONYMOUS_ROOM = 'anonymous';

const DEFAULT_BINDINGS = {
  bridge: 'MCP_WEB_BRIDGE',
  queryIndex: 'MCP_WEB_QUERY_INDEX',
  assets: 'ASSETS',
} as const;

/** How long a callback route stays valid after it is registered. */
const QUERY_INDEX_TTL_MS = 60 * 60 * 1000;

// ============================================
// Wrappers
// ============================================

interface DispatchingConnection extends WebSocketConnection {
  dispatchMessage(data: string): void;
}

function wrapWebSocket(socket: CloudflareWebSocket): DispatchingConnection {
  const messageHandlers = new Set<(data: string) => void>();

  return {
    send(data: string): void {
      if (socket.readyState === 1) {
        socket.send(data);
      }
    },

    close(code?: number, reason?: string): void {
      socket.close(code, reason);
    },

    get readyState(): 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED' {
      switch (socket.readyState) {
        case 0:
          return 'CONNECTING';
        case 1:
          return 'OPEN';
        case 2:
          return 'CLOSING';
        default:
          return 'CLOSED';
      }
    },

    onMessage(handler: (data: string) => void): void {
      messageHandlers.add(handler);
    },

    offMessage(handler: (data: string) => void): void {
      messageHandlers.delete(handler);
    },

    dispatchMessage(data: string): void {
      for (const handler of messageHandlers) {
        handler(data);
      }
    },
  };
}

function wrapRequest(request: Request, body: string): HttpRequest {
  return {
    method: request.method,
    url: request.url,
    headers: {
      get: (name: string) => request.headers.get(name),
    },
    text: () => Promise.resolve(body),
  };
}

// ============================================
// Durable Object
// ============================================

/**
 * Constructor for the Durable Object class that hosts the bridge core.
 *
 * Declared rather than inferred: the class has private fields, and a
 * declaration file cannot describe those on an anonymous class.
 */
export interface BridgeDurableObjectConstructor<Env> {
  new (
    state: DurableObjectState,
    env: Env,
  ): { fetch(request: Request): Promise<Response> };
}

/**
 * Builds the Durable Object class that hosts the bridge core.
 */
function createBridgeDurableObject<Env>(
  options: CloudflareBridgeOptions<Env>,
): BridgeDurableObjectConstructor<Env> {
  const resolveConfig = (env: Env) =>
    typeof options.config === 'function' ? options.config(env) : options.config;

  return class MCPWebBridgeDurableObject {
    #core: MCPWebBridge;
    #queryIndex: QueryIndexClient;

    constructor(_state: DurableObjectState, env: Env) {
      this.#core = new MCPWebBridge(
        resolveConfig(env) as MCPWebConfig,
        new TimerScheduler(),
      );
      this.#queryIndex = new QueryIndexClient(
        binding<DurableObjectNamespace>(
          env,
          options.bindings?.queryIndex ?? DEFAULT_BINDINGS.queryIndex,
        ),
      );
    }

    async fetch(request: Request): Promise<Response> {
      const url = new URL(request.url);

      if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
        return this.#handleWebSocketUpgrade(url);
      }

      const body =
        request.method === 'GET' || request.method === 'HEAD'
          ? ''
          : await request.text();

      const response = await this.#core
        .getHandlers()
        .onHttpRequest(wrapRequest(request, body));

      if (!isSSEResponse(response)) {
        return new Response(response.body, {
          status: response.status,
          headers: response.headers,
        });
      }

      const encoder = new TextEncoder();
      let keepAlive: ReturnType<typeof setInterval> | undefined;

      const stopKeepAlive = () => {
        if (keepAlive === undefined) return;
        clearInterval(keepAlive);
        keepAlive = undefined;
      };

      const stream = new ReadableStream({
        start(controller) {
          // Enqueueing throws once the stream is closed or cancelled, which is
          // the only signal a disconnect gives between keepalives.
          const write = (chunk: string): boolean => {
            try {
              controller.enqueue(encoder.encode(chunk));
              return true;
            } catch {
              stopKeepAlive();
              return false;
            }
          };

          keepAlive = setInterval(() => write(': keepalive\n\n'), 30_000);

          response.setup(
            (data) => {
              write(`data: ${data}\n\n`);
            },
            () => {
              stopKeepAlive();
              try {
                controller.close();
              } catch {
                // Already closed by a cancel
              }
            },
          );
        },

        // The client went away.
        cancel() {
          stopKeepAlive();
        },
      });

      return new Response(stream, {
        status: response.status,
        headers: response.headers,
      });
    }

    #handleWebSocketUpgrade(url: URL): Response {
      const sessionId = url.searchParams.get('session');
      // The Worker refuses a room-less upgrade, so this matches the room the
      // request was routed with.
      const room = url.searchParams.get('room') ?? ANONYMOUS_ROOM;

      if (!sessionId) {
        return new Response('Missing session parameter', { status: 400 });
      }

      const pair = newWebSocketPair();
      const client = pair[0];
      const server = pair[1];

      server.accept();

      const connection = wrapWebSocket(server);
      const handlers = this.#core.getHandlers();

      handlers.onWebSocketConnect(sessionId, connection, url);

      // Registering a query has to finish before the core forwards it to the
      // agent, or the agent can call back before the index knows the room.
      // Messages are chained so that wait cannot reorder them.
      let pending = Promise.resolve();

      server.addEventListener('message', (event) => {
        const data =
          typeof event.data === 'string'
            ? event.data
            : new TextDecoder().decode(event.data);

        pending = pending
          .then(async () => {
            if (await claimsAnotherRoom(data, room)) {
              server.close(1008, 'Auth token does not belong to this room');
              return;
            }

            const registration = await this.#queryIndex.registerFromMessage(
              data,
              room,
            );
            if (
              registration.status === 'taken' ||
              registration.status === 'unroutable'
            ) {
              connection.send(
                JSON.stringify({
                  type: 'query_failure',
                  uuid: registration.uuid,
                  error:
                    registration.status === 'taken'
                      ? 'Query id already in use'
                      : 'Query routing unavailable',
                }),
              );
              return;
            }

            connection.dispatchMessage(data);
            handlers.onWebSocketMessage(sessionId, connection, data);
          })
          .catch((error) => {
            console.error('[MCPWebBridge] Error handling message:', error);
          });
      });

      server.addEventListener('close', () => {
        handlers.onWebSocketClose(sessionId);
      });

      server.addEventListener('error', (error) => {
        console.error(
          `[MCPWebBridge] WebSocket error for session ${sessionId}:`,
          error,
        );
        handlers.onWebSocketClose(sessionId);
      });

      return new Response(null, {
        status: 101,
        webSocket: client,
      } as CloudflareResponseInit);
    }
  };
}

/**
 * Reports an `authenticate` whose token belongs to a different room.
 *
 * The room comes from the connection URL, so a client can address any object.
 * Per-token session and query limits only hold when the token's own object is
 * the one counting them.
 */
async function claimsAnotherRoom(data: string, room: string): Promise<boolean> {
  let message: { type?: unknown; authToken?: unknown };

  try {
    message = JSON.parse(data);
  } catch {
    return false;
  }

  if (message?.type !== 'authenticate') return false;
  if (typeof message.authToken !== 'string' || !message.authToken) return false;

  return (await deriveRoomId(message.authToken)) !== room;
}

// ============================================
// Query Index
// ============================================

/**
 * Durable Object mapping query uuid to room.
 *
 * Agents call back to `/query/:uuid/*` with only the uuid, so the router has no
 * token to derive a room from. The bridge object records the mapping when the
 * frontend starts a query and the router reads it here.
 *
 * Entries are not removed when a query ends, only swept once they pass
 * {@link QUERY_INDEX_TTL_MS}, so a query running longer than that loses its
 * route.
 *
 * A uuid already routed to another room is refused, because the uuid comes from
 * the frontend and nothing else stops one frontend naming another's query.
 */
export class MCPWebQueryIndexDurableObject {
  #storage: DurableObjectStorage;

  constructor(state: DurableObjectState) {
    this.#storage = state.storage;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const uuid = url.searchParams.get('uuid');

    if (!uuid) {
      return new Response('Missing uuid', { status: 400 });
    }

    if (request.method === 'PUT') {
      const room = url.searchParams.get('room');
      if (!room) {
        return new Response('Missing room', { status: 400 });
      }

      // Frontends choose their own query ids. A live route is never handed to a
      // second room, and the adapter refuses that frontend's query, so the two
      // cannot share a callback path.
      const existing = await this.#storage.get<{
        room: string;
        expiresAt: number;
      }>(`q:${uuid}`);
      if (
        existing &&
        existing.expiresAt >= Date.now() &&
        existing.room !== room
      ) {
        return new Response('Query id already routed', { status: 409 });
      }

      await this.#storage.put(`q:${uuid}`, {
        room,
        expiresAt: Date.now() + QUERY_INDEX_TTL_MS,
      });
      await this.#scheduleSweep();
      return new Response(null, { status: 204 });
    }

    if (request.method === 'GET') {
      const entry = await this.#storage.get<{
        room: string;
        expiresAt: number;
      }>(`q:${uuid}`);
      if (!entry || entry.expiresAt < Date.now()) {
        return new Response('Unknown query', { status: 404 });
      }
      return new Response(entry.room, { status: 200 });
    }

    return new Response('Method not allowed', { status: 405 });
  }

  /** Drops expired entries; queries that never complete would otherwise linger. */
  async alarm(): Promise<void> {
    const now = Date.now();
    const entries = await this.#storage.list<{
      room: string;
      expiresAt: number;
    }>({ prefix: 'q:' });

    let remaining = 0;
    for (const [key, entry] of entries) {
      if (entry.expiresAt < now) {
        await this.#storage.delete(key);
      } else {
        remaining++;
      }
    }

    if (remaining > 0) {
      await this.#storage.setAlarm(now + QUERY_INDEX_TTL_MS);
    }
  }

  async #scheduleSweep(): Promise<void> {
    if ((await this.#storage.getAlarm()) === null) {
      await this.#storage.setAlarm(Date.now() + QUERY_INDEX_TTL_MS);
    }
  }
}

/**
 * Outcome of recording a query's callback route.
 *
 * `taken` means another room owns the uuid; `unroutable` means the route was
 * not written at all. Both leave the agent unable to reach this frontend.
 */
type QueryRegistration =
  | { status: 'not-a-query' }
  | { status: 'registered'; uuid: string }
  | { status: 'taken'; uuid: string }
  | { status: 'unroutable'; uuid: string };

/** Thin client the bridge object and router use to reach the query index. */
class QueryIndexClient {
  #namespace: DurableObjectNamespace | undefined;

  constructor(namespace: DurableObjectNamespace | undefined) {
    this.#namespace = namespace;
  }

  #stub() {
    if (!this.#namespace) return undefined;
    return this.#namespace.get(this.#namespace.idFromName('query-index'));
  }

  /**
   * Records the room if `data` is a frontend `query` message.
   *
   * The agent calls back with the uuid alone, so a query whose route was not
   * written has nowhere to return its results. The caller refuses those rather
   * than starting the agent.
   */
  async registerFromMessage(
    data: string,
    room: string,
  ): Promise<QueryRegistration> {
    let uuid: unknown;
    try {
      const message = JSON.parse(data);
      if (message?.type !== 'query') return { status: 'not-a-query' };
      uuid = message.uuid;
    } catch {
      return { status: 'not-a-query' };
    }

    if (typeof uuid !== 'string' || !uuid) return { status: 'not-a-query' };

    const stub = this.#stub();
    if (!stub) {
      console.error(
        '[MCPWebBridge] No query index binding; agent callbacks cannot be routed',
      );
      return { status: 'unroutable', uuid };
    }

    try {
      const response = await stub.fetch(
        new Request(
          `https://query-index/?uuid=${encodeURIComponent(uuid)}&room=${encodeURIComponent(room)}`,
          { method: 'PUT' },
        ),
      );

      if (response.status === 409) return { status: 'taken', uuid };
      if (!response.ok) {
        console.error(
          `[MCPWebBridge] Query index refused the route: ${response.status}`,
        );
        return { status: 'unroutable', uuid };
      }
    } catch (error) {
      console.error('[MCPWebBridge] Failed to record query room:', error);
      return { status: 'unroutable', uuid };
    }

    return { status: 'registered', uuid };
  }

  async lookup(uuid: string): Promise<string | undefined> {
    const stub = this.#stub();
    if (!stub) return undefined;

    try {
      const response = await stub.fetch(
        new Request(`https://query-index/?uuid=${encodeURIComponent(uuid)}`),
      );
      return response.ok ? await response.text() : undefined;
    } catch (error) {
      console.error('[MCPWebBridge] Failed to look up query room:', error);
      return undefined;
    }
  }
}

// ============================================
// Worker
// ============================================

const QUERY_CALLBACK_PATH =
  /^\/query\/([^/]+)\/(progress|complete|fail|cancel)$/;

/**
 * Separates the room from the session id in the `Mcp-Session-Id` header.
 *
 * Remote MCP clients open the SSE stream and close the session with that header
 * alone, so the room has to travel inside the value the client was handed. The
 * core generates UUIDs, which never contain this character.
 */
const SESSION_ROOM_SEPARATOR = '~';

/** Splits a client-facing session id into the room and the core's own id. */
function splitSessionId(header: string | null): {
  room?: string;
  sessionId: string;
} {
  const separator = header?.indexOf(SESSION_ROOM_SEPARATOR) ?? -1;

  if (!header || separator <= 0) return { sessionId: header ?? '' };

  return {
    room: header.slice(0, separator),
    sessionId: header.slice(separator + 1),
  };
}

/**
 * Decides which room a request belongs to, in this order:
 *
 * 1. WebSocket upgrade: the `room` parameter, since no token has been sent yet.
 * 2. Agent callback on `/query/:uuid/*`: the query index.
 * 3. `Mcp-Session-Id`: the room prefixed onto the id the Worker issued. A
 *    Remote MCP client sends nothing else on its stream or on delete.
 * 4. A query id in the body: the query index, because an agent acting inside a
 *    query is scoped to that query's session and may present no token.
 * 5. The auth token, or the shared anonymous object when there is none.
 *
 * A query id the index does not know falls through to the token, and the core
 * reports the unknown query.
 */
async function resolveRoom(
  request: Request,
  url: URL,
  body: string | undefined,
  queryIndex: QueryIndexClient,
): Promise<string> {
  if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
    return url.searchParams.get('room') ?? ANONYMOUS_ROOM;
  }

  const callback = url.pathname.match(QUERY_CALLBACK_PATH);
  if (callback) {
    const room = await queryIndex.lookup(callback[1]);
    if (room) return room;
  }

  const { room: sessionRoom } = splitSessionId(
    request.headers.get('mcp-session-id'),
  );
  if (sessionRoom) return sessionRoom;

  const queryId = body === undefined ? undefined : readQueryId(body);
  if (queryId) {
    const room = await queryIndex.lookup(queryId);
    if (room) return room;
  }

  // Parsed exactly as the core parses it, so the router and the core never
  // disagree about what the token is.
  const token =
    request.headers.get('authorization')?.replace('Bearer ', '') ??
    url.searchParams.get('token');

  // Requests without a token — CORS preflights, plain server-info GETs — need
  // no session state, so any object can answer them.
  if (!token) return ANONYMOUS_ROOM;

  // Workers always expose Web Crypto, so this resolves.
  return (await deriveRoomId(token)) ?? ANONYMOUS_ROOM;
}

/** Reads `params._meta.queryId` out of a JSON-RPC body. */
function readQueryId(body: string): string | undefined {
  try {
    const queryId = JSON.parse(body)?.params?._meta?.queryId;
    return typeof queryId === 'string' && queryId ? queryId : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Creates the Durable Object classes and Worker handler for a bridge deployment.
 */
export function createCloudflareBridge<Env = CloudflareBridgeEnv>(
  options: CloudflareBridgeOptions<Env>,
) {
  const bridgeBinding = options.bindings?.bridge ?? DEFAULT_BINDINGS.bridge;
  const queryIndexBinding =
    options.bindings?.queryIndex ?? DEFAULT_BINDINGS.queryIndex;
  const assetsBinding = options.bindings?.assets ?? DEFAULT_BINDINGS.assets;

  const DurableObject = createBridgeDurableObject(options);

  const worker = {
    async fetch(request: Request, env: Env): Promise<Response> {
      const url = new URL(request.url);
      const assets = binding<AssetsBinding>(env, assetsBinding);
      const serveAssets = options.serveAssets !== false && assets;

      if (url.pathname === '/health') {
        return Response.json({
          status: 'ok',
          timestamp: new Date().toISOString(),
        });
      }

      if (!isBridgeRequest(request, url)) {
        if (serveAssets) {
          return assets.fetch(request);
        }
        return new Response('Not Found', { status: 404 });
      }

      // Routing happens before the socket reaches an object, so a room-less
      // upgrade cannot be placed and has to be refused here.
      if (
        request.headers.get('Upgrade')?.toLowerCase() === 'websocket' &&
        !url.searchParams.get('room')
      ) {
        return new Response(
          'Missing room parameter. The Cloudflare bridge needs a version of ' +
            '@mcp-web/core that sends one on the WebSocket URL.',
          { status: 400 },
        );
      }

      const namespace = binding<DurableObjectNamespace>(env, bridgeBinding);
      if (!namespace) {
        return new Response(
          `Missing Durable Object binding "${bridgeBinding}"`,
          { status: 500 },
        );
      }

      const queryIndex = new QueryIndexClient(
        binding<DurableObjectNamespace>(env, queryIndexBinding),
      );

      // A query-scoped MCP request identifies its room through the body, so
      // POSTs are buffered here and replayed to the object.
      const body = request.method === 'POST' ? await request.text() : undefined;
      const room = await resolveRoom(request, url, body, queryIndex);

      // The object knows nothing about rooms, so the prefix is stripped here
      // and put back on the way out.
      const session = splitSessionId(request.headers.get('mcp-session-id'));
      const rewriteSessionId = session.room !== undefined;

      let forwarded = request;
      if (body !== undefined) {
        const headers = new Headers(request.headers);
        if (rewriteSessionId) headers.set('mcp-session-id', session.sessionId);
        forwarded = new Request(request.url, {
          method: request.method,
          headers,
          body,
        });
      } else if (rewriteSessionId) {
        // Built from the request so that a method with a body — an agent
        // callback carrying the session header, say — keeps it.
        const headers = new Headers(request.headers);
        headers.set('mcp-session-id', session.sessionId);
        forwarded = new Request(request, { headers });
      }

      const response = await namespace
        .get(namespace.idFromName(room))
        .fetch(forwarded);

      const issued = response.headers.get('mcp-session-id');
      if (!issued) return response;

      const headers = new Headers(response.headers);
      headers.set(
        'mcp-session-id',
        `${room}${SESSION_ROOM_SEPARATOR}${issued}`,
      );

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    },
  };

  return {
    DurableObject,
    QueryIndex: MCPWebQueryIndexDurableObject,
    worker,
  };
}

/**
 * Distinguishes bridge traffic from frontend asset requests.
 *
 * Mirrors the bridge's own dispatch: it claims every method except plain `GET`,
 * and claims `GET` only for SSE streams and JSON server-info probes. A JSON
 * `GET` is only claimed on the root path, where the bridge serves server info;
 * elsewhere it is an application's own JSON asset.
 */
function isBridgeRequest(request: Request, url: URL): boolean {
  if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
    return true;
  }

  if (QUERY_CALLBACK_PATH.test(url.pathname)) {
    return true;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return true;
  }

  const accept = request.headers.get('accept') ?? '';

  return (
    accept.includes('text/event-stream') ||
    (url.pathname === '/' && accept.includes('application/json'))
  );
}
