const PARAM = 'codeMode';

/** Whether the demo offers its tools through one code tool (`?codeMode=1`). */
export const codeMode =
  new URLSearchParams(window.location.search).get(PARAM) === '1';

/** Sets the mode and reloads the page, since tools are registered at startup. */
export function setCodeMode(enabled: boolean): void {
  const url = new URL(window.location.href);
  if (enabled) url.searchParams.set(PARAM, '1');
  else url.searchParams.delete(PARAM);
  window.location.replace(url);
}
