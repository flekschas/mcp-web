import { atomWithStorage, createJSONStorage } from 'jotai/utils';

type StringStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * `localStorage`, or storage in memory where the page can't use it, such as
 * in the sandboxed frame of an MCP App view.
 */
export const storage: StringStorage = (() => {
  try {
    // Some browsers only throw once storage is used.
    window.localStorage.getItem('');
    return window.localStorage;
  } catch {
    const items = new Map<string, string>();
    return {
      getItem: (key) => items.get(key) ?? null,
      setItem: (key, value) => void items.set(key, String(value)),
      removeItem: (key) => void items.delete(key),
    };
  }
})();

/** An atom whose value is kept in `storage`. */
export function atomWithDemoStorage<Value>(key: string, initialValue: Value) {
  return atomWithStorage(
    key,
    initialValue,
    createJSONStorage<Value>(() => storage),
  );
}
