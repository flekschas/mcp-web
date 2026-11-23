const CODE_MODE_KEY = 'mcp-web-demo:codeMode';
const SWITCHED_KEY = 'mcp-web-demo:codeModeSwitched';
const KEPT_STATE_KEY = 'mcp-web-demo:keptState';

/** Reads and removes a value, or `null` if the browser blocks storage. */
function take(storage: () => Storage, key: string): string | null {
  try {
    const value = storage().getItem(key);
    storage().removeItem(key);
    return value;
  } catch {
    return null;
  }
}

function read(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}

/**
 * Whether the demo offers its state through one code tool. The choice is
 * remembered in localStorage.
 */
export const codeMode = read(() => localStorage, CODE_MODE_KEY) === '1';

/** Whether this page load follows a switch of code mode. */
export const codeModeSwitched =
  take(() => sessionStorage, SWITCHED_KEY) !== null;

/**
 * Sets the mode and reloads the page, since tools are registered at startup.
 * `state` is kept for `takeKeptState` after the reload. If the browser can't
 * keep the mode or the state, nothing changes and the user is told.
 */
export function setCodeMode(enabled: boolean, state: unknown): void {
  try {
    sessionStorage.setItem(KEPT_STATE_KEY, JSON.stringify(state));
    sessionStorage.setItem(SWITCHED_KEY, '1');
    localStorage.setItem(CODE_MODE_KEY, enabled ? '1' : '0');
  } catch {
    window.alert(
      'Code mode was not switched: the browser did not let the page keep ' +
        'the mode and your spec across the reload that switching needs.',
    );
    return;
  }
  window.location.reload();
}

/** The state passed to `setCodeMode` before this page load, if any. */
export function takeKeptState(): unknown {
  const text = take(() => sessionStorage, KEPT_STATE_KEY);
  try {
    return text === null ? undefined : JSON.parse(text);
  } catch {
    return undefined;
  }
}
