import { createStateTools } from '@mcp-web/core';
import { createCodeMode } from '@mcp-web/tools/code';
import { getDefaultStore } from 'jotai';
import { z } from 'zod';
import { codeMode } from '../mcp/code-mode.ts';
import { mcp } from '../mcp/mcp.ts';
import { goslingSpecSchema, goslingSpecShape } from './schema.ts';
import { specAtom, waitForRenderStatus } from './states.ts';

const store = getDefaultStore();

const RENDER_WAIT_MS = 5000;

const SPEC_DESCRIPTION = [
  'The Gosling 1.0.7 spec of the genomics chart shown in the app, next to an editor where the user can change it too.',
  'A new spec replaces the whole chart. It must pass the official Gosling JSON Schema.',
  'Data can be inline ({ type: "json", values, chromosomeField, genomicFields }) or a URL to a CSV, bigWig or HiGlass tileset.',
].join('\n');

const created = createStateTools({
  name: 'spec',
  description: SPEC_DESCRIPTION,
  get: () => store.get(specAtom),
  set: (value) => store.set(specAtom, value),
  schema: goslingSpecSchema,
  codeMode: codeMode ? createCodeMode() : undefined,
});

// The user can type a spec that fails the schema, and the getter must still
// return it so AI can fix it.
const getter = { ...created.getter, outputSchema: goslingSpecShape };
mcp.addStateTools({
  ...created,
  getter,
  tools: created.tools.map((tool) => (tool === created.getter ? getter : tool)),
});

mcp.addTool({
  name: 'get_render_status',
  description: `Whether Gosling compiled the current spec into a view ("rendered"), and the error if it did not. Drawing the view and loading its data happen after that, and their errors are not reported. Waits up to ${RENDER_WAIT_MS / 1000} s while the chart is rendering. Check it after changing the spec.`,
  inputSchema: z.object({}),
  outputSchema: z.object({
    status: z.enum(['rendering', 'rendered', 'error']),
    error: z.string().nullable(),
  }),
  handler: () => waitForRenderStatus(RENDER_WAIT_MS),
});
