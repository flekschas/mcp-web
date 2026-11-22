/**
 * Minimal structural types for the Cloudflare Workers runtime.
 *
 * Covers only what the adapter uses. `@cloudflare/workers-types` declares
 * globals that clash with the `@types/node` globals this package compiles
 * against.
 */

export interface DurableObjectStorage {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<boolean>;
  list<T>(options?: { prefix?: string }): Promise<Map<string, T>>;
  setAlarm(scheduledTime: number | Date): Promise<void>;
  getAlarm(): Promise<number | null>;
}

export interface DurableObjectState {
  readonly storage: DurableObjectStorage;
}

export interface DurableObjectStub {
  fetch(request: Request): Promise<Response>;
}

export interface DurableObjectNamespace {
  idFromName(name: string): unknown;
  get(id: unknown): DurableObjectStub;
}

/** Static assets binding produced by wrangler's `assets` config. */
export interface AssetsBinding {
  fetch(request: Request): Promise<Response>;
}

/**
 * A Cloudflare `WebSocket`, which adds `accept()` to the standard interface.
 */
export interface CloudflareWebSocket {
  accept(): void;
  send(message: string | ArrayBuffer): void;
  close(code?: number, reason?: string): void;
  readonly readyState: number;
  addEventListener(
    type: 'message',
    handler: (event: { data: string | ArrayBuffer }) => void,
  ): void;
  addEventListener(
    type: 'close',
    handler: (event: { code: number; reason: string }) => void,
  ): void;
  addEventListener(type: 'error', handler: (event: unknown) => void): void;
}

export interface CloudflareWebSocketPair {
  0: CloudflareWebSocket;
  1: CloudflareWebSocket;
}

export interface CloudflareResponseInit extends ResponseInit {
  webSocket?: CloudflareWebSocket;
}

/**
 * Constructs a `WebSocketPair`.
 *
 * It is a Workers global with no standard-library equivalent. Reading it off
 * `globalThis` keeps it out of the global type space, where a consumer loading
 * `@cloudflare/workers-types` would get a duplicate declaration.
 */
export function newWebSocketPair(): CloudflareWebSocketPair {
  const ctor = (
    globalThis as {
      WebSocketPair?: new () => CloudflareWebSocketPair;
    }
  ).WebSocketPair;

  if (!ctor) {
    throw new Error('WebSocketPair is only available on Cloudflare Workers');
  }

  return new ctor();
}
