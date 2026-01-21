import { addAtomTool } from '@mcp-web/core/integrations/jotai';
import { PythonTool } from '@mcp-web/core/tools/python';
import { ScreenshotTool } from '@mcp-web/core/tools/screenshot';
import { getDefaultStore } from 'jotai';
import { z } from 'zod';
import { mcp } from '../mcp/mcp.ts';
import { higlassGeneSearchSchema } from './schemas/others.ts';
import { higlassViewConfigSchema } from './schemas/view-config.ts';
import { higlassViewConfigSplitPlan } from './schemas/view-config-split.ts';
import { higlassChromosomeInfoByViewAtom, higlassDefaultChromosomeInfoAtom, higlassTilesetsAtom, higlassViewConfigAtom } from './states.ts';
import type { ChromosomeInfo, HiglassGeneSearchResponse, HiglassGeneSearchResult } from './types.ts';
import { getCurrentViewDataset } from './utils.ts';

// Schema for Promise-wrapped values - using z.any() for simplicity with async atoms
const higlassTilesetsSchema = z.any();

addAtomTool({
  mcp,
  atom: higlassViewConfigAtom,
  name: 'higlass-view-config',
  description:
    'The HiGlass view config describes the layout, UI, and track visualizations',
  atomSchema: higlassViewConfigSchema,
  atomSchemaSplit: higlassViewConfigSplitPlan,
});

addAtomTool({
  mcp,
  atom: higlassTilesetsAtom,
  name: 'higlass-tilesets',
  description:
    'A list of all available tilesets that can be visualized with HiGlass',
  atomSchema: higlassTilesetsSchema,
});

mcp.addTool({
  name: 'higlass-gene-search',
  description: 'Gene search function by view that returns a list of genes and their locations. To show a gene in HiGlass, set `intialXDomain` (and/or `initialYDomain`) to `[absoluteStart, absoluteEnd]`.',
  inputSchema: higlassGeneSearchSchema,
  handler: async ({ view, gene }) => {
    const store = getDefaultStore();

    let chromosomeInfo: ChromosomeInfo | undefined;

    if (view) {
      const chromosomeInfosByView = await store.get(higlassChromosomeInfoByViewAtom);
      chromosomeInfo = chromosomeInfosByView[view];
    } else {
      chromosomeInfo = await store.get(higlassDefaultChromosomeInfoAtom);
    }

    if (!chromosomeInfo) {
      throw new Error('No chromosome info found, which is required convert relative coordinates to absolute coordinates.');
    }

    const response = await fetch(`https://higlass.io/api/v1/suggest/?d=OHJakQICQD6gTD7skx4EWA&ac=${gene}`);
    const data: HiglassGeneSearchResponse[] = await response.json();

    const results: HiglassGeneSearchResult[] = [];

    for (const d of data) {
      const chromosome = chromosomeInfo[d.chr];

      if (!chromosome) {
        continue;
      }

      results.push({
        chromosomeName: d.chr,
        geneName: d.geneName,
        absoluteStart: chromosome.absoluteStart + d.txStart,
        absoluteEnd: chromosome.absoluteStart + d.txEnd,
        relativeStart: d.txStart,
        relativeEnd: d.txEnd,
        importanceScore: d.score,
      });
    }

    return results;
  },
});

mcp.addTool(new ScreenshotTool({
  name: 'higlass-screenshot',
  description: 'Take a screenshot of the current HiGlass view',
  elementSelector: '#higlass-container',
}));

mcp.addTool(new PythonTool(getCurrentViewDataset, {
  name: 'higlass-analyze-view-data',
  description: 'Analyze the currently visualized data in HiGlass using Python 3.10',
}));
