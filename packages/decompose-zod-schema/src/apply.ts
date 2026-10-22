import { produce } from 'immer';
import { parseEnumSplit, setNestedValue } from './utils.js';

export const applyPartialUpdate = (
  currentState: unknown,
  targetPaths: string[],
  partialUpdate: unknown,
) => {
  return produce(currentState, (draft: unknown) => {
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
