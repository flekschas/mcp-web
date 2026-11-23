const CODE_MODE_KEY = 'mcp-web-demo:codeMode';
const SWITCHED_KEY = 'mcp-web-demo:codeModeSwitched';

/**
 * Whether the demo offers its tools through one code tool. The choice is
 * remembered in localStorage.
 */
export const codeMode = (() => {
  try {
    return localStorage.getItem(CODE_MODE_KEY) === '1';
  } catch {
    return false;
  }
})();

/** Whether this page load follows a switch of code mode. */
export const codeModeSwitched = (() => {
  try {
    const switched = sessionStorage.getItem(SWITCHED_KEY) !== null;
    sessionStorage.removeItem(SWITCHED_KEY);
    return switched;
  } catch {
    return false;
  }
})();

/**
 * Sets the mode and reloads the page, since tools are registered at startup.
 * If the browser can't keep the mode, nothing changes and the user is told.
 */
export function setCodeMode(enabled: boolean): void {
  try {
    sessionStorage.setItem(SWITCHED_KEY, '1');
    localStorage.setItem(CODE_MODE_KEY, enabled ? '1' : '0');
  } catch {
    window.alert(
      'Code mode was not switched: the browser did not let the page keep ' +
        'the mode across the reload that switching needs.',
    );
    return;
  }
  window.location.reload();
}
