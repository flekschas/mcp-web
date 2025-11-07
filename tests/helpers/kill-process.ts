import type { ChildProcess } from 'node:child_process';

export const killProcess = (childProcess: ChildProcess) => {
  return new Promise((resolve) => {
    childProcess.on('exit', (code, signal) => {
      resolve({ code, signal });
    });
    childProcess.kill('SIGKILL');
  });
}
