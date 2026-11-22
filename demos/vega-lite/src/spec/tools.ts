import { createStateTools } from '@mcp-web/core';
import { createCodeMode } from '@mcp-web/tools/code';
import { getDefaultStore } from 'jotai';
import { z } from 'zod';
import { codeMode } from '../mcp/code-mode.ts';
import { mcp } from '../mcp/mcp.ts';
import { DATASETS_URL } from './examples.ts';
import { createLearnedHints } from './hints.ts';
import { HINTS_BY_POINTER, PROMOTED_POINTERS } from './learned-hints.ts';
import { vegaLiteSpecSchema, vegaLiteSpecShape } from './schema.ts';
import { specAtom, waitForRenderStatus } from './states.ts';

const store = getDefaultStore();

const RENDER_WAIT_MS = 5000;

const hints = createLearnedHints(HINTS_BY_POINTER, PROMOTED_POINTERS);

const SPEC_DESCRIPTION = [
  'The Vega-Lite v6 spec of the chart shown in the app, next to an editor where the user can change it too.',
  'A new spec replaces the whole chart. It must pass the official Vega-Lite JSON Schema.',
  `Data can be inline (data.values) or a URL, e.g. ${DATASETS_URL}/<file> with cars.json, seattle-weather.csv, stocks.csv, movies.json, population.json, barley.json, penguins.json or gapminder.json.`,
].join('\n');

const created = createStateTools({
  name: 'spec',
  description:
    codeMode || !hints.description
      ? SPEC_DESCRIPTION
      : `${SPEC_DESCRIPTION}\n\n${hints.description}`,
  get: () => store.get(specAtom),
  set: (value) => store.set(specAtom, value),
  schema: vegaLiteSpecSchema,
  codeMode: codeMode ? createCodeMode({ hints }) : undefined,
});

// The user can type a spec that fails the schema, and the getter must still
// return it so AI can fix it. The hints are about writing specs, so the
// getter's description leaves them out.
const getter = {
  ...created.getter,
  description: `Get the current value of spec. ${SPEC_DESCRIPTION}`,
  outputSchema: vegaLiteSpecShape,
};
mcp.addStateTools({
  ...created,
  getter,
  tools: created.tools.map((tool) => (tool === created.getter ? getter : tool)),
});

mcp.addTool({
  name: 'get_render_status',
  description: `Whether the current spec rendered, and the error from Vega-Lite if it did not. Waits up to ${RENDER_WAIT_MS / 1000} s while the chart is rendering. Check it after changing the spec.`,
  inputSchema: z.object({}),
  outputSchema: z.object({
    status: z.enum(['rendering', 'rendered', 'error']),
    error: z.string().nullable(),
  }),
  handler: () => waitForRenderStatus(RENDER_WAIT_MS),
});
