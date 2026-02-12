import { PythonTool } from '@mcp-web/tools/python';
import { ScreenshotTool } from '@mcp-web/tools/screenshot';
import { getDefaultStore } from 'jotai';
import { mcp } from '../mcp/mcp.ts';
import {
  higlassGeneSearchResultSchema,
  higlassGeneSearchSchema,
  higlassTilesetSearchSchema,
  higlassTilesetSearchResultSchema,
} from './schemas/others.ts';
import { higlassViewConfigSchema } from './schemas/view-config.ts';
import { higlassViewConfigSplitPlan } from './schemas/view-config-split.ts';
import {
  higlassChromosomeInfoByViewAtom,
  higlassDefaultChromosomeInfoAtom,
  higlassTilesetsAtom,
  higlassViewConfigAtom,
} from './states.ts';
import type {
  ChromosomeInfo,
  HiglassGeneSearchResponse,
  HiglassGeneSearchResult,
} from './types.ts';
import { getCurrentViewDataset } from './utils.ts';

const store = getDefaultStore();

// Read-write state with schema decomposition
mcp.addStateTools({
  name: 'higlass_view_config',
  description:
    'The HiGlass view config describes the layout, UI, and track visualizations',
  get: () => store.get(higlassViewConfigAtom),
  set: (value) => store.set(higlassViewConfigAtom, value),
  schema: higlassViewConfigSchema,
  schemaSplit: higlassViewConfigSplitPlan,
});

// Read-only async state (tilesets)
mcp.addTool({
  name: 'higlass_tileset_search',
  description:
    'Search for tilesets by name or description. Returns a list of all matching tilesets that can be visualized with HiGlass',
  inputSchema: higlassTilesetSearchSchema,
  outputSchema: higlassTilesetSearchResultSchema,
  handler: async ({ search, datatype }) => {
    const allTilesets = await store.get(higlassTilesetsAtom);
    const searchLower = search.toLowerCase();
    const results = allTilesets.filter((tileset) => {
      const matches = tileset.name.includes(searchLower) || tileset.description.includes(searchLower);
      if (datatype) {
        return matches && tileset.datatype === datatype;
      }
      return matches;
    });
    return {
      tilesets: results.map((tileset) => ({
        uuid: tileset.uuid,
        filetype: tileset.filetype,
        datatype: tileset.datatype,
        name: tileset.name,
        description: tileset.description,
        coordSystem: tileset.coordSystem,
      })),
    };
  },
});

mcp.addTool({
  name: 'higlass_gene_search',
  description:
    'Gene search function by view that returns a list of genes and their locations. To show a gene in HiGlass, set `intialXDomain` (and/or `initialYDomain`) to `[absoluteStart, absoluteEnd]`.',
  inputSchema: higlassGeneSearchSchema,
  outputSchema: higlassGeneSearchResultSchema,
  handler: async ({ view, gene }) => {
    let chromosomeInfo: ChromosomeInfo | undefined;

    if (view) {
      const chromosomeInfosByView = await store.get(
        higlassChromosomeInfoByViewAtom,
      );
      chromosomeInfo = chromosomeInfosByView[view];
    } else {
      chromosomeInfo = await store.get(higlassDefaultChromosomeInfoAtom);
    }

    if (!chromosomeInfo) {
      throw new Error(
        'No chromosome info found, which is required convert relative coordinates to absolute coordinates.',
      );
    }

    const response = await fetch(
      `https://higlass.io/api/v1/suggest/?d=OHJakQICQD6gTD7skx4EWA&ac=${gene}`,
    );
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

    return { genes: results };
  },
});

mcp.addTool(
  new ScreenshotTool({
    name: 'higlass_screenshot',
    description: 'Take a screenshot of the current HiGlass view',
    elementSelector: '#higlass-container',
  }),
);

mcp.addTool(
  new PythonTool(getCurrentViewDataset, {
    name: 'higlass_analyze_view_data',
    description:
      'Analyze the currently visualized data in HiGlass using Python 3.10',
  }),
);
