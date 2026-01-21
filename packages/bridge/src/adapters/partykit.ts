/**
 * MCPWebBridgeParty - PartyKit adapter for the MCP Web Bridge.
 *
 * Enables deployment to Cloudflare's edge network via PartyKit.
 * Uses PartyKit's Party.Server interface with Durable Objects for state management.
 *
 * @example
 * ```typescript
 * // server.ts - PartyKit server entry point
 * import { createPartyKitBridge } from '@mcp-web/bridge';
 *
 * export default createPartyKitBridge({
 *   name: 'My App',
 *   description: 'My awesome app on the edge',
 * });
 * ```
 *
 * @example With partykit.json configuration
 * ```json
 * {
 *   "name": "my-mcp-bridge",
 *   "main": "server.ts",
 *   "compatibility_date": "2024-01-01"
 * }
 * ```
 *
 * @example Deploy to PartyKit
 * ```bash
 * npx partykit deploy
 * ```
 *
 * @remarks
 * PartyKit provides:
 * - Global edge deployment via Cloudflare
 * - Durable Objects for stateful WebSocket handling
 * - Hibernation support for cost efficiency
 * - Alarms for scheduled tasks (used instead of setInterval)
 *
 * Key differences from other adapters:
 * - No explicit port configuration (managed by PartyKit/Cloudflare)
 * - Uses `Party.storage.setAlarm()` for session timeout checks
 * - State can persist across hibernation cycles
 *
 * @see https://docs.partykit.io/
 * @see https://docs.partykit.io/guides/scheduling-tasks-with-alarms/
 */

import type { MCPWebConfig } from '@mcp-web/types';
import { MCPWebBridge } from '../core.js';
import type { Scheduler } from '../runtime/scheduler.js';
import type { HttpRequest, HttpResponse, WebSocketConnection } from '../runtime/types.js';

// ============================================================================
// PartyKit Type Definitions (simplified for stub)
// In production, import from 'partykit/server'
// ============================================================================

/**
 * PartyKit connection interface (simplified).
 * @see https://docs.partykit.io/reference/partyserver-api/
 */
interface PartyConnection {
  id: string;
  send(message: string | ArrayBuffer): void;
  close(code?: number, reason?: string): void;
  readyState: number;
}

/**
 * PartyKit room interface (simplified).
 */
interface PartyRoom {
  id: string;
  storage: {
    get<T>(key: string): Promise<T | undefined>;
    put<T>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<boolean>;
    setAlarm(time: number | Date): Promise<void>;
    getAlarm(): Promise<number | null>;
    deleteAlarm(): Promise<void>;
  };
  broadcast(message: string, exclude?: string[]): void;
}

/**
 * PartyKit connection context (simplified).
 */
interface PartyConnectionContext {
  request: Request;
}

/**
 * PartyKit server interface that bridge implements.
 */
interface PartyServer {
  onConnect?(connection: PartyConnection, ctx: PartyConnectionContext): void | Promise<void>;
  onMessage?(message: string, sender: PartyConnection): void | Promise<void>;
  onClose?(connection: PartyConnection): void | Promise<void>;
  onError?(connection: PartyConnection, error: Error): void | Promise<void>;
  onRequest?(request: Request): Response | Promise<Response>;
  onAlarm?(): void | Promise<void>;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration for the PartyKit bridge adapter.
 * Note: Port is not configurable - PartyKit manages this.
 */
export interface MCPWebBridgePartyConfig extends Omit<MCPWebConfig, 'wsPort' | 'mcpPort' | 'host'> {
  /**
   * Session timeout check interval in milliseconds.
   * PartyKit uses alarms instead of setInterval, so this determines
   * how often the alarm fires to check for expired sessions.
   * Default: 60000 (1 minute)
   */
  sessionCheckIntervalMs?: number;
}

// ============================================================================
// Alarm-based Scheduler
// ============================================================================

/**
 * Scheduler implementation using PartyKit alarms.
 *
 * PartyKit only supports one alarm at a time per room, so this scheduler
 * tracks multiple scheduled callbacks and uses the alarm for the soonest one.
 *
 * @see https://docs.partykit.io/guides/scheduling-tasks-with-alarms/
 */
export class AlarmScheduler implements Scheduler {
  #room: PartyRoom;
  #callbacks = new Map<string, { callback: () => void; fireAt: number }>();
  #intervals = new Map<string, { callback: () => void; intervalMs: number; nextFireAt: number }>();
  #nextAlarmId: string | null = null;

  constructor(room: PartyRoom) {
    this.#room = room;
  }

  schedule(callback: () => void, delayMs: number): string {
    const id = crypto.randomUUID();
    const fireAt = Date.now() + delayMs;
    this.#callbacks.set(id, { callback, fireAt });
    this.#updateAlarm();
    return id;
  }

  cancel(id: string): void {
    this.#callbacks.delete(id);
    this.#updateAlarm();
  }

  scheduleInterval(callback: () => void, intervalMs: number): string {
    const id = crypto.randomUUID();
    const nextFireAt = Date.now() + intervalMs;
    this.#intervals.set(id, { callback, intervalMs, nextFireAt });
    this.#updateAlarm();
    return id;
  }

  cancelInterval(id: string): void {
    this.#intervals.delete(id);
    this.#updateAlarm();
  }

  dispose(): void {
    this.#callbacks.clear();
    this.#intervals.clear();
    this.#room.storage.deleteAlarm().catch(() => {});
  }

  /**
   * Called by the PartyKit server's onAlarm() handler.
   * Executes due callbacks and reschedules the next alarm.
   */
  async handleAlarm(): Promise<void> {
    const now = Date.now();

    // Execute due one-time callbacks
    for (const [id, { callback, fireAt }] of this.#callbacks) {
      if (fireAt <= now) {
        this.#callbacks.delete(id);
        try {
          callback();
        } catch (error) {
          console.error('Alarm callback error:', error);
        }
      }
    }

    // Execute due interval callbacks and reschedule them
    for (const [id, interval] of this.#intervals) {
      if (interval.nextFireAt <= now) {
        interval.nextFireAt = now + interval.intervalMs;
        try {
          interval.callback();
        } catch (error) {
          console.error('Interval callback error:', error);
        }
      }
    }

    // Schedule next alarm
    await this.#updateAlarm();
  }

  async #updateAlarm(): Promise<void> {
    // Find the soonest scheduled callback
    let soonest: number | null = null;

    for (const { fireAt } of this.#callbacks.values()) {
      if (soonest === null || fireAt < soonest) {
        soonest = fireAt;
      }
    }

    for (const { nextFireAt } of this.#intervals.values()) {
      if (soonest === null || nextFireAt < soonest) {
        soonest = nextFireAt;
      }
    }

    if (soonest !== null) {
      await this.#room.storage.setAlarm(soonest);
    } else {
      await this.#room.storage.deleteAlarm();
    }
  }
}

// ============================================================================
// WebSocket Wrapper
// ============================================================================

/**
 * Extended WebSocket connection with internal dispatch method.
 */
interface PartyWebSocketConnection extends WebSocketConnection {
  _dispatchMessage(data: string): void;
}

/**
 * Wraps a PartyKit Connection in our runtime-agnostic interface.
 */
function wrapPartyConnection(connection: PartyConnection): PartyWebSocketConnection {
  const messageHandlers = new Set<(data: string) => void>();

  return {
    send(data: string): void {
      if (connection.readyState === 1) {
        // OPEN
        connection.send(data);
      }
    },

    close(code?: number, reason?: string): void {
      connection.close(code, reason);
    },

    get readyState(): 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED' {
      switch (connection.readyState) {
        case 0:
          return 'CONNECTING';
        case 1:
          return 'OPEN';
        case 2:
          return 'CLOSING';
        case 3:
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

    // Internal: called by the PartyKit server to dispatch messages
    _dispatchMessage(data: string): void {
      for (const handler of messageHandlers) {
        handler(data);
      }
    },
  };
}

/**
 * Wraps a PartyKit/Cloudflare Request in our runtime-agnostic HttpRequest interface.
 */
function wrapPartyRequest(req: Request): HttpRequest {
  return {
    method: req.method,
    url: req.url,
    headers: {
      get(name: string): string | null {
        return req.headers.get(name);
      },
    },
    text(): Promise<string> {
      return req.text();
    },
  };
}

// ============================================================================
// PartyKit Bridge Server
// ============================================================================

/**
 * Creates a PartyKit-compatible bridge server class.
 *
 * @example
 * ```typescript
 * // server.ts
 * import { createPartyKitBridge } from '@mcp-web/bridge';
 *
 * export default createPartyKitBridge({
 *   name: 'My Bridge',
 *   description: 'MCP Web bridge on the edge',
 * });
 * ```
 */
export function createPartyKitBridge(config: MCPWebBridgePartyConfig): new (room: PartyRoom) => PartyServer {
  return class MCPWebBridgeParty implements PartyServer {
    #room: PartyRoom;
    #core: MCPWebBridge;
    #scheduler: AlarmScheduler;
    #connections = new Map<string, PartyWebSocketConnection>();
    #connectionSessionIds = new Map<string, string>(); // connectionId -> sessionId

    constructor(room: PartyRoom) {
      this.#room = room;
      this.#scheduler = new AlarmScheduler(room);
      this.#core = new MCPWebBridge(
        {
          ...config,
          // These are not used by PartyKit but required by the schema
          wsPort: 0,
          mcpPort: 0,
        },
        this.#scheduler
      );

      console.log(`🌉 MCP Web Bridge (PartyKit) initialized for room: ${room.id}`);
    }

    /**
     * Handle new WebSocket connections.
     */
    async onConnect(connection: PartyConnection, ctx: PartyConnectionContext): Promise<void> {
      const url = new URL(ctx.request.url);
      const sessionId = url.searchParams.get('session');

      if (!sessionId) {
        connection.close(1008, 'Missing session parameter');
        return;
      }

      const wrapped = wrapPartyConnection(connection);
      this.#connections.set(connection.id, wrapped);
      this.#connectionSessionIds.set(connection.id, sessionId);

      const handlers = this.#core.getHandlers();
      handlers.onWebSocketConnect(sessionId, wrapped, url);
    }

    /**
     * Handle incoming WebSocket messages.
     */
    async onMessage(message: string, sender: PartyConnection): Promise<void> {
      const sessionId = this.#connectionSessionIds.get(sender.id);
      const wrapped = this.#connections.get(sender.id);

      if (!sessionId || !wrapped) {
        return;
      }

      // Dispatch to message handlers on the wrapper
      wrapped._dispatchMessage(message);

      // Notify the bridge core
      const handlers = this.#core.getHandlers();
      handlers.onWebSocketMessage(sessionId, wrapped, message);
    }

    /**
     * Handle WebSocket connection close.
     */
    async onClose(connection: PartyConnection): Promise<void> {
      const sessionId = this.#connectionSessionIds.get(connection.id);

      if (sessionId) {
        const handlers = this.#core.getHandlers();
        handlers.onWebSocketClose(sessionId);
      }

      this.#connections.delete(connection.id);
      this.#connectionSessionIds.delete(connection.id);
    }

    /**
     * Handle WebSocket errors.
     */
    async onError(connection: PartyConnection, error: Error): Promise<void> {
      const sessionId = this.#connectionSessionIds.get(connection.id);
      console.error(`WebSocket error for session ${sessionId}:`, error);
    }

    /**
     * Handle HTTP requests (MCP JSON-RPC, query endpoints).
     */
    async onRequest(request: Request): Promise<Response> {
      const wrappedReq = wrapPartyRequest(request);
      const handlers = this.#core.getHandlers();
      const httpResponse = await handlers.onHttpRequest(wrappedReq);

      return new Response(httpResponse.body, {
        status: httpResponse.status,
        headers: httpResponse.headers,
      });
    }

    /**
     * Handle PartyKit alarms for scheduled tasks.
     * @see https://docs.partykit.io/guides/scheduling-tasks-with-alarms/
     */
    async onAlarm(): Promise<void> {
      await this.#scheduler.handleAlarm();
    }
  };
}

/**
 * Pre-configured bridge class for direct export.
 * Use `createPartyKitBridge()` if you need custom configuration.
 *
 * @example
 * ```typescript
 * // For simple cases where you configure via environment
 * export { MCPWebBridgeParty } from '@mcp-web/bridge';
 * ```
 */
export const MCPWebBridgeParty = createPartyKitBridge({
  name: 'MCP Web Bridge',
  description: 'MCP Web bridge server on PartyKit',
});
