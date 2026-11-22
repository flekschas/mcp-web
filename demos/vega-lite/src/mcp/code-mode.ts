const PARAM = 'codeMode';
const KEPT_STATE_KEY = 'mcp-web-demo:keptState';

/** Whether the demo offers its state through one code tool (`?codeMode=1`). */
export const codeMode =
  new URLSearchParams(window.location.search).get(PARAM) === '1';

/**
 * Sets the mode and reloads the page, since tools are registered at startup.
 * `state` is kept for `takeKeptState` after the reload. If the browser can't
 * keep it, nothing changes and the user is told.
 */
export function setCodeMode(enabled: boolean, state: unknown): void {
  try {
    sessionStorage.setItem(KEPT_STATE_KEY, JSON.stringify(state));
  } catch {
    window.alert(
      'Code mode was not switched: the browser did not let the page keep ' +
        'your spec across the reload that switching needs.',
    );
    return;
  }
  const url = new URL(window.location.href);
  if (enabled) url.searchParams.set(PARAM, '1');
  else url.searchParams.delete(PARAM);
  window.location.replace(url);
}

/** The state passed to `setCodeMode` before this page load, if any. */
export function takeKeptState(): unknown {
  try {
    const text = sessionStorage.getItem(KEPT_STATE_KEY);
    sessionStorage.removeItem(KEPT_STATE_KEY);
    return text === null ? undefined : JSON.parse(text);
  } catch {
    return undefined;
  }
}
