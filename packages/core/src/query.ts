import type { QueryResponseResult, QueryResponseResultComplete, QueryResponseResultFailure } from './types';

/**
 * Represents an in-flight query to an AI agent.
 *
 * QueryResponse provides multiple ways to interact with query results:
 * - `stream` for fine-grained event handling
 * - `result` for simple await-the-final-result usage
 * - `cancel()` to abort the query
 *
 * @example Streaming events
 * ```typescript
 * const query = mcp.query({ prompt: 'Analyze the data' });
 *
 * for await (const event of query.stream) {
 *   if (event.type === 'query_progress') {
 *     console.log('Progress:', event.message);
 *   } else if (event.type === 'query_complete') {
 *     console.log('Done:', event.message);
 *   }
 * }
 * ```
 *
 * @example Simple result awaiting
 * ```typescript
 * const query = mcp.query({ prompt: 'Analyze the data' });
 * const result = await query.result;
 *
 * if (result.type === 'query_complete') {
 *   console.log('Success:', result.message);
 * }
 * ```
 */
export class QueryResponse {
  #streamIterator: AsyncIterableIterator<QueryResponseResult>;
  #uuid: string;
  #cancelFn?: () => void;

  /**
   * Creates a new QueryResponse instance.
   * @internal This is typically created by MCPWeb.query(), not directly.
   */
  constructor(uuid: string, stream: AsyncIterableIterator<QueryResponseResult>, cancelFn?: () => void) {
    this.#uuid = uuid;
    this.#streamIterator = stream;
    this.#cancelFn = cancelFn;
  }

  /**
   * Unique identifier for this query.
   * Can be used to track or reference the query externally.
   */
  get uuid() {
    return this.#uuid;
  }

  /**
   * Async iterator of query events (progress, completion, failure, cancel).
   *
   * Use this for fine-grained control over query lifecycle, such as
   * displaying progress updates to users.
   *
   * @example
   * ```typescript
   * for await (const event of query.stream) {
   *   switch (event.type) {
   *     case 'query_progress':
   *       updateProgress(event.message);
   *       break;
   *     case 'query_complete':
   *       showResult(event);
   *       break;
   *   }
   * }
   * ```
   */
  get stream(): AsyncIterableIterator<QueryResponseResult> {
    return this.#streamIterator;
  }

  /**
   * Promise that resolves to the final query result.
   *
   * This is a convenience property for when you only care about the final
   * outcome and don't need to track progress events.
   *
   * @returns Promise resolving to complete or failure event
   * @throws {Error} If query ends without completion or failure
   *
   * @example
   * ```typescript
   * const result = await query.result;
   * if (result.type === 'query_complete') {
   *   console.log('Success:', result.toolCalls);
   * } else {
   *   console.error('Failed:', result.error);
   * }
   * ```
   */
  get result(): Promise<QueryResponseResultComplete | QueryResponseResultFailure> {
    return (async () => {
      for await (const event of this.#streamIterator) {
        if (event.type === 'query_complete' || event.type === 'query_failure') {
          return event;
        }
      }
      throw new Error('Query ended without completion or failure event');
    })();
  }

  /**
   * Cancels the in-flight query.
   *
   * Triggers cancellation via AbortController or directly through the bridge,
   * depending on how the query was created.
   *
   * @throws {Error} If cancel function is not available
   *
   * @example
   * ```typescript
   * const query = mcp.query({ prompt: 'Long task' });
   *
   * // Cancel after 5 seconds
   * setTimeout(() => query.cancel(), 5000);
   * ```
   */
  cancel(): void {
    if (this.#cancelFn) {
      this.#cancelFn();
    } else {
      throw new Error('Cancel function not available for this query');
    }
  }
}
