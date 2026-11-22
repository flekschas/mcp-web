import { createStateTools } from '@mcp-web/core';
import { createCodeMode } from '@mcp-web/tools/code';
import { getDefaultStore } from 'jotai';
import { z } from 'zod';
import { codeMode } from '../mcp/code-mode.ts';
import { mcp } from '../mcp/mcp.ts';
import { createLearnedHints } from './hints.ts';
import { HINTS_BY_POINTER, PROMOTED_POINTERS } from './learned-hints.ts';
import { genomeSpySpecSchema, genomeSpySpecShape } from './schema.ts';
import { specAtom, waitForRenderStatus } from './states.ts';

const store = getDefaultStore();

const RENDER_WAIT_MS = 5000;

const hints = createLearnedHints(HINTS_BY_POINTER, PROMOTED_POINTERS);

const SPEC_DESCRIPTION = [
  'The GenomeSpy 0.88 spec of the genomics chart shown in the app, next to an editor where the user can change it too.',
  'A new spec replaces the whole chart. It must pass the official GenomeSpy JSON Schema.',
  'Data can be inline (data.values), a URL to a CSV, TSV or JSON file, or an indexed file read lazily (data.lazy), e.g. bigWig or BAM.',
].join('\n');

const created = createStateTools({
  name: 'spec',
  description:
    codeMode || !hints.description
      ? SPEC_DESCRIPTION
      : `${SPEC_DESCRIPTION}\n\n${hints.description}`,
  get: () => store.get(specAtom),
  set: (value) => store.set(specAtom, value),
  schema: genomeSpySpecSchema,
  codeMode: codeMode ? createCodeMode({ hints }) : undefined,
});

// The user can type a spec that fails the schema, and the getter must still
// return it so AI can fix it. The hints are about writing specs, so the
// getter's description leaves them out.
const getter = {
  ...created.getter,
  description: `Get the current value of spec. ${SPEC_DESCRIPTION}`,
  outputSchema: genomeSpySpecShape,
};
mcp.addStateTools({
  ...created,
  getter,
  tools: created.tools.map((tool) => (tool === created.getter ? getter : tool)),
});

mcp.addTool({
  name: 'get_render_status',
  description: `Whether the current spec rendered, and the error from GenomeSpy if it did not. Waits up to ${RENDER_WAIT_MS / 1000} s while the chart is rendering. Check it after changing the spec.`,
  inputSchema: z.object({}),
  outputSchema: z.object({
    status: z.enum(['rendering', 'rendered', 'error']),
    error: z.string().nullable(),
  }),
  handler: () => waitForRenderStatus(RENDER_WAIT_MS),
});
