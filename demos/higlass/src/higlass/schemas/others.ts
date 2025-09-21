import { z } from 'zod';

export const higlassGeneSearchSchema = z.object({
  view: z.string().describe('The UID of the view to search for. If not provided, the first view will be used.').optional(),
  gene: z.string().describe('The gene to search for'),
});

export const higlassGeneAnnotationTilesetInfoSchema = z.record(
  z.string(),
  z.object({
    datatype: z.literal('gene-annotation').describe('Tileset datatype'),
    assembly: z.string().describe('Assembly name'),
    chrom_names: z.string().describe('Chromosome names as a list of tab separated strings'),
    chrom_sizes: z.string().describe('Chromosome sizes as a list of tab separated integers'),
    tile_size: z.number().describe('Tile size in base pairs'),
    max_zoom: z.number().describe('Maximum zoom level'),
    max_width: z.number().describe('Maximum width value in base pairs'),
    min_pos: z.tuple([z.number(), z.number().optional()]).describe('Minimum position coordinates in base pairs'),
    max_pos: z.tuple([z.number(), z.number().optional()]).describe('Maximum position coordinates in base pairs'),
    coordSystem: z.string().describe('Coordinate system name'),
    coordSystem2: z.string().describe('Coordinate system name'),
    zoom_step: z.number().describe('Zoom step'),
    max_length: z.number().describe('Maximum length in base pairs'),
  })
);