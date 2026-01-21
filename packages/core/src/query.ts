import type { QueryResponseResult, QueryResponseResultComplete, QueryResponseResultFailure } from './types';

export class QueryResponse {
  #streamIterator: AsyncIterableIterator<QueryResponseResult>;
  #uuid: string;
  #cancelFn?: () => void;

  constructor(uuid: string, stream: AsyncIterableIterator<QueryResponseResult>, cancelFn?: () => void) {
    this.#uuid = uuid;
    this.#streamIterator = stream;
    this.#cancelFn = cancelFn;
  }

  /**
   * The unique identifier for this query
   */
  get uuid() {
    return this.#uuid;
  }

  /**
   * Stream of query events (progress, completion, failure)
   * Use this for fine-grained control over query lifecycle
   *
   * @example
   * ```typescript
   * for await (const event of query.stream) {
   *   if (event.type === 'query_progress') {
   *     console.log(event.message);
   *   }
   * }
   * ```
   */
  get stream(): AsyncIterableIterator<QueryResponseResult> {
    return this.#streamIterator;
  }

  /**
   * Simplified interface: just get the final result
   * Waits for query completion and returns the result or throws on failure
   *
   * @example
   * ```typescript
   * try {
   *   const result = await query.result;
   *   console.log('Query completed:', result);
   * } catch (error) {
   *   console.error('Query failed:', error);
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
   * Cancel this query
   * Triggers cancellation either via AbortController or directly through the bridge
   */
  cancel(): void {
    if (this.#cancelFn) {
      this.#cancelFn();
    } else {
      throw new Error('Cancel function not available for this query');
    }
  }
}
