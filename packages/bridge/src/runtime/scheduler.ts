/**
 * Scheduler abstraction for timing operations.
 *
 * Different runtimes have different timing APIs:
 * - Node.js/Deno/Bun: setTimeout/setInterval
 * - PartyKit/Cloudflare: Alarms via Party.storage.setAlarm()
 *
 * This abstraction allows the bridge core to schedule tasks
 * without knowing which runtime it's running on.
 */

/**
 * Abstract scheduler interface.
 * Implementations handle the runtime-specific timing mechanism.
 */
export interface Scheduler {
  /**
   * Schedule a one-time callback after a delay.
   * @param callback - Function to execute
   * @param delayMs - Delay in milliseconds
   * @returns An ID that can be used to cancel the scheduled callback
   */
  schedule(callback: () => void, delayMs: number): string;

  /**
   * Cancel a scheduled one-time callback.
   * @param id - The ID returned by schedule()
   */
  cancel(id: string): void;

  /**
   * Schedule a repeating callback.
   * @param callback - Function to execute repeatedly
   * @param intervalMs - Interval in milliseconds
   * @returns An ID that can be used to cancel the interval
   */
  scheduleInterval(callback: () => void, intervalMs: number): string;

  /**
   * Cancel a repeating callback.
   * @param id - The ID returned by scheduleInterval()
   */
  cancelInterval(id: string): void;

  /**
   * Clean up all scheduled tasks.
   * Called when the bridge is shutting down.
   */
  dispose(): void;
}

/**
 * Timer-based scheduler using setTimeout/setInterval.
 * Works with Node.js, Deno, and Bun.
 */
export class TimerScheduler implements Scheduler {
  #timeouts = new Map<string, ReturnType<typeof setTimeout>>();
  #intervals = new Map<string, ReturnType<typeof setInterval>>();

  schedule(callback: () => void, delayMs: number): string {
    const id = crypto.randomUUID();
    const timeout = setTimeout(() => {
      this.#timeouts.delete(id);
      callback();
    }, delayMs);
    this.#timeouts.set(id, timeout);
    return id;
  }

  cancel(id: string): void {
    const timeout = this.#timeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.#timeouts.delete(id);
    }
  }

  scheduleInterval(callback: () => void, intervalMs: number): string {
    const id = crypto.randomUUID();
    const interval = setInterval(callback, intervalMs);
    this.#intervals.set(id, interval);
    return id;
  }

  cancelInterval(id: string): void {
    const interval = this.#intervals.get(id);
    if (interval) {
      clearInterval(interval);
      this.#intervals.delete(id);
    }
  }

  dispose(): void {
    for (const timeout of this.#timeouts.values()) {
      clearTimeout(timeout);
    }
    this.#timeouts.clear();

    for (const interval of this.#intervals.values()) {
      clearInterval(interval);
    }
    this.#intervals.clear();
  }
}

/**
 * No-op scheduler for environments where timing isn't needed or supported.
 * Callbacks are simply not executed.
 */
export class NoopScheduler implements Scheduler {
  schedule(_callback: () => void, _delayMs: number): string {
    return crypto.randomUUID();
  }

  cancel(_id: string): void {
    // No-op
  }

  scheduleInterval(_callback: () => void, _intervalMs: number): string {
    return crypto.randomUUID();
  }

  cancelInterval(_id: string): void {
    // No-op
  }

  dispose(): void {
    // No-op
  }
}
