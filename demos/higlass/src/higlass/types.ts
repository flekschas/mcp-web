import type { z } from 'zod';
import type { higlassOptionsSchema } from './schemas/options.ts';
import type { higlassViewConfigSchema } from './schemas/view-config.ts';

export type HiglassViewConfig = z.infer<typeof higlassViewConfigSchema>;
export type HiglassOptions = z.infer<typeof higlassOptionsSchema>;

/**
 * This is the data as returned by the HiGlass API.
 */
export interface HiglassGeneSearchResponse {
  chr: string;
  txStart: number;
  txEnd: number;
  score: number;
  geneName: string;
}

/**
 * This is the data returned by the MCP tool.
 *
 * Some fields are renamed for clarity and absolute coordinates are added for
 * direct use in HiGlass.
 */
export interface HiglassGeneSearchResult {
  chromosomeName: string;
  geneName: string;
  absoluteStart: number;
  absoluteEnd: number;
  relativeStart: number;
  relativeEnd: number;
  importanceScore: number;
}

export interface HiGlassTileset {
  uuid: string;
  datafile: string;
  filetype: string;
  datatype: string;
  name: string;
  coordSystem: string;
  coordSystem2: string;
  created: string;
  project: string;
  project_name: string;
  description: string;
  private: boolean;
}

export type ChromosomeInfo = Record<
  string,
  {
    size: number;
    absoluteStart: number;
    index: number;
  }
>;
