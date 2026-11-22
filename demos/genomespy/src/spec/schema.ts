import genomeSpyJsonSchema from '@genome-spy/core/schema.json';
import { z } from 'zod';
import {
  createJsonSchemaCheck,
  refineWithJsonSchema,
} from './json-schema-check.ts';

/** Checks a spec against the official GenomeSpy JSON Schema. */
export const checkGenomeSpySpec = createJsonSchemaCheck(genomeSpyJsonSchema);

const property = (description: string) =>
  z.unknown().optional().describe(description);

/**
 * The top level of a GenomeSpy spec, with a short description of each
 * property for AI. Values are not typed here, so `get_spec` can return any
 * object the user typed: the refinement checks the whole spec against the
 * official JSON Schema instead.
 */
export const genomeSpySpecShape = z.looseObject({
  description: property('string | string[]'),
  title: property('string | { text, subtitle?, anchor?, ... }'),
  assembly: property(
    'Default genome assembly for locus scales, e.g. "hg38", "hg19" or "mm10", or the key of an entry in `genomes`. Locus encodings need it',
  ),
  genomes: property(
    'Custom assemblies: Record<string, { url } | { contigs: { name, size }[] }>',
  ),
  data: property(
    '{ values: object[] } | { url: string, format?: { type: "csv" | "tsv" | "json" | "parquet" } } | { lazy: { type: "bigwig" | "bigbed" | "bam" | "indexedFasta" | "vcf" | "gff3", url, ... } }',
  ),
  transform: property(
    'Array of transforms, e.g. { type: "filter", expr }, { type: "formula", expr, as }, { type: "aggregate", groupby, fields?, ops?, as? }, { type: "pileup", start, end, as? }, { type: "linearizeGenomicCoordinate", chrom, pos, as }',
  ),
  mark: property(
    '"rect" | "point" | "rule" | "tick" | "text" | "link" | "arrow" or { type, ...props } (size, opacity, filled, strokeWidth, minWidth, ...)',
  ),
  encoding: property(
    'Channels x, y, x2, y2, color, fill, stroke, opacity, size, shape, text, uniqueId, search. A genomic position is { chrom, pos, type: "locus", offset? }, its end goes in x2 as { chrom, pos }. Other fields are { field, type: "quantitative" | "nominal" | "ordinal" | "index", scale?, axis?, title? }; constants are { value }. A locus scale domain lists loci: [{ chrom: "chr1", pos: 1000000 }, { chrom: "chr1", pos: 1100000 }]',
  ),
  layer: property('Array of views drawn on top of each other'),
  vconcat: property('Array of views stacked vertically'),
  hconcat: property('Array of views placed side by side'),
  concat: property('Array of views in a grid of `columns`'),
  columns: property('Number of columns for concat'),
  spacing: property('Gap between concatenated views in pixels'),
  resolve: property(
    '{ scale?, axis? }, each mapping channels to "shared" | "independent" | "excluded"',
  ),
  params: property('Array of { name, value?, bind?, select? }'),
  width: property('number | "container" | { step: number }'),
  height: property('number | "container" | { step: number }'),
  padding: property('number | { top, right, bottom, left }'),
  view: property('View background: { fill?, stroke?, strokeWidth? }'),
  background: property('CSS color'),
  config: property('Theme defaults for axes, marks, legends, ...'),
});

export const genomeSpySpecSchema = refineWithJsonSchema(
  genomeSpySpecShape,
  checkGenomeSpySpec,
);

export type GenomeSpySpec = z.infer<typeof genomeSpySpecShape>;
