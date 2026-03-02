/**
 * Generates the srcdoc HTML for the sandboxed iframe.
 *
 * The iframe:
 * 1. Creates global proxy functions for each tool
 * 2. Receives 'execute' messages with code to run
 * 3. Proxy functions postMessage back to parent and await results
 * 4. Sends execution result back to parent when done
 */
export function generateSrcdoc(functionNames: string[]): string {
  const proxyFunctions = functionNames
    .map(
      (name) =>
        `globalThis[${JSON.stringify(name)}] = async function(params) {
      const callId = crypto.randomUUID();
      return new Promise((resolve, reject) => {
        pendingCalls.set(callId, {
          resolve,
          reject: (err) => {
            let argsStr;
            try { argsStr = JSON.stringify(params); } catch { argsStr = String(params); }
            reject(new Error(${JSON.stringify(name)} + '(' + argsStr + ') failed: ' + err.message));
          }
        });
        parent.postMessage({
          type: 'function_call',
          id: currentExecutionId,
          callId: callId,
          name: ${JSON.stringify(name)},
          args: params
        }, '*');
      });
    };`,
    )
    .join('\n\n    ');

  return `<!DOCTYPE html>
<html>
<head><title>MCP-Web Code Sandbox</title></head>
<body>
<script>
  const pendingCalls = new Map();
  let currentExecutionId = null;

  ${proxyFunctions}

  window.addEventListener('message', async (event) => {
    const msg = event.data;

    if (msg.type === 'function_result') {
      const pending = pendingCalls.get(msg.callId);
      if (pending) {
        pendingCalls.delete(msg.callId);
        if (msg.error) {
          pending.reject(new Error(msg.error));
        } else {
          pending.resolve(msg.result);
        }
      }
      return;
    }

    if (msg.type === 'execute') {
      currentExecutionId = msg.id;

      try {
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        const fn = new AsyncFunction(msg.code);
        const result = await fn();

        parent.postMessage({
          type: 'execution_result',
          id: msg.id,
          result: result !== undefined ? JSON.parse(JSON.stringify(result)) : undefined
        }, '*');
      } catch (err) {
        parent.postMessage({
          type: 'execution_result',
          id: msg.id,
          error: err instanceof Error ? err.message : String(err)
        }, '*');
      } finally {
        currentExecutionId = null;
      }
    }
  });

  parent.postMessage({ type: 'ready' }, '*');
</script>
</body>
</html>`;
}
