import type { ChildProcess } from 'node:child_process';

export const killProcess = (childProcess: ChildProcess, timeoutMs = 2000) => {
  return new Promise((resolve) => {
    // Set up timeout to prevent hanging forever
    const timeout = setTimeout(() => {
      resolve({ code: null, signal: null, timedOut: true });
    }, timeoutMs);

    childProcess.on('exit', (code, signal) => {
      clearTimeout(timeout);
      resolve({ code, signal, timedOut: false });
    });

    // Try SIGTERM first for graceful shutdown
    childProcess.kill('SIGTERM');

    // If still alive after half the timeout, use SIGKILL
    setTimeout(() => {
      if (!childProcess.killed) {
        childProcess.kill('SIGKILL');
      }
    }, timeoutMs / 2);
  });
}
