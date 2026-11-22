/**
 * Code tool hints from a table of schema contracts keyed by JSON Schema
 * pointer. Promoted contracts go into the tool description. Any contract whose
 * pointer a problem names is shown below that problem; the messages of
 * `createJsonSchemaCheck` list pointers as `(schema: a, b)`.
 */
export function createLearnedHints(
  hintsByPointer: Record<string, string>,
  promotedPointers: string[],
  maxHintsPerProblem = 3,
) {
  const description =
    promotedPointers.length > 0
      ? [
          'Contracts that specs often got wrong. Each restates the schema at a location where specs were often rejected; it is not an example.',
          '',
          promotedPointers
            .map((pointer) => hintsByPointer[pointer])
            .join('\n\n'),
        ].join('\n')
      : undefined;

  const onError = (problem: string) => {
    const matched = Object.keys(hintsByPointer)
      .filter(
        (pointer) =>
          problem.includes(`${pointer},`) || problem.includes(`${pointer})`),
      )
      .slice(0, maxHintsPerProblem);
    if (matched.length === 0) return undefined;
    return `The schema at the failing location:\n${matched
      .map((pointer) => hintsByPointer[pointer])
      .join('\n')}`;
  };

  return { description, onError };
}
