import { produce } from 'immer';
import { parseEnumSplit, setNestedValue } from './utils.js';

// Helper to get nested value
const get = (obj: unknown, path: string): unknown => {
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current == null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
};

export const applyPartialUpdate = (
  currentState: unknown,
  targetPaths: string[],
  partialUpdate: unknown,
) => {
  return produce(currentState, (draft: unknown) => {
    // Check if this is an array or record split update
    const firstTargetPath = targetPaths[0];
    const parsed = parseEnumSplit(firstTargetPath);

    if (parsed.isArraySplit) {
      // Handle array split update: partialUpdate should be { index: number, value: T }
      const { index, value } = partialUpdate as { index: number, value: unknown };
      const arrayPath = parsed.path;

      const arrayRef = get(draft, arrayPath) as unknown[];
      if (!arrayRef || !Array.isArray(arrayRef)) {
        console.warn(`Array not found at path: ${arrayPath}`);
        return;
      }

      if (index < 0 || index >= arrayRef.length) {
        console.warn(`Index ${index} out of bounds for array at ${arrayPath} (length: ${arrayRef.length})`);
        return;
      }

      // Update the array element
      Object.assign(arrayRef[index] as Record<string, unknown>, value);
      return;
    }

    if (parsed.isRecordSplit) {
      // Handle record split update: partialUpdate should be { key: K, value: V }
      const { key, value } = partialUpdate as { key: string, value: unknown };
      const recordPath = parsed.path;

      const recordRef = get(draft, recordPath) as Record<string, unknown>;
      if (!recordRef || typeof recordRef !== 'object') {
        console.warn(`Record not found at path: ${recordPath}`);
        return;
      }

      // Update the record entry
      recordRef[key] = value;
      return;
    }

    // Handle regular property updates
    Object.entries(partialUpdate as Record<string, unknown>).forEach(
      ([key, value]) => {
        // Find matching target path
        const targetPath = targetPaths.find((path) => {
          const parsedPath = parseEnumSplit(path);

          // Exact match for leaf property
          if (parsedPath.path.endsWith(`.${key}`) || parsedPath.path === key)
            return true;

          return false;
        });

        if (targetPath) {
          const parsedPath = parseEnumSplit(targetPath);
          setNestedValue(
            draft as Record<string, unknown>,
            parsedPath.path,
            value,
          );
        }
      },
    );
  });
};
