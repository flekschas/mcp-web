export const camelToSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

export const camelToSnakeCaseProps = (obj: Record<string, unknown>): Record<string, unknown> => {
  return Object.fromEntries(Object.entries(obj).map(([key, value]) => [camelToSnakeCase(key), value]))
};
