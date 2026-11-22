import { GoslingSchema } from 'gosling.js';
import { z } from 'zod';
import {
  createJsonSchemaCheck,
  refineWithJsonSchema,
} from './json-schema-check.ts';

/** Checks a spec against the official Gosling JSON Schema. */
export const checkGoslingSpec = createJsonSchemaCheck(GoslingSchema);

const property = (description: string) =>
  z.unknown().optional().describe(description);

/**
 * The top level of a Gosling spec, with a short description of each
 * property for AI. Values are not typed here, so `get_spec` can return any
 * object the user typed: the refinement checks the whole spec against the
 * official JSON Schema instead.
 */
export const goslingSpecShape = z.looseObject({
  title: property('string'),
  subtitle: property('string'),
  description: property('string'),
  assembly: property(
    '"hg38" | "hg19" | "hg18" | "hg17" | "hg16" | "mm10" | "mm9" | "unknown" | custom [chromosome, length][]',
  ),
  layout: property('"linear" | "circular"'),
  orientation: property('"horizontal" | "vertical"'),
  arrangement: property(
    'How `views` are placed: "parallel" | "serial" | "horizontal" | "vertical"',
  ),
  static: property('true disables zooming and panning'),
  xDomain: property(
    'Visible region: { chromosome: "chr1", interval?: [start, end] } or { interval: [start, end] } in genome-wide coordinates. Set it on the spec or a view; a track-level xDomain is ignored',
  ),
  linkingId: property('Views with the same linkingId zoom and pan together'),
  spacing: property('Gap between tracks or views in pixels'),
  centerRadius: property('Radius of the empty center in circular layouts, 0–1'),
  style: property(
    '{ background?, outline?, outlineWidth?, dashed?, curve?, ... }',
  ),
  zoomLimits: property('[min, max] zoom in base pairs'),
  alignment: property(
    '"stack" (default) or "overlay" to draw `tracks` on top of each other',
  ),
  tracks: property(
    'Array of tracks, drawn as a single view. A track is { id?, title?, data, mark, x, xe?, y?, ye?, x1?, x1e?, row?, color?, stroke?, strokeWidth?, opacity?, size?, text?, tooltip?, width, height, layout?, dataTransform?, style? } with mark "point" | "line" | "area" | "bar" | "rect" | "text" | "withinLink" | "betweenLink" | "rule" | "triangleLeft" | "triangleRight" | "triangleBottom" | "brush", or an overlay { alignment: "overlay", data?, tracks: [...], width, height } whose tracks share data and encodings. A channel is a field { field, type: "genomic" | "quantitative" | "nominal", domain?, range?, axis?, legend? } or a constant { value }, e.g. color: { value: "#7c3aed" }. data is { type: "json", values, chromosomeField, genomicFields } | { type: "csv", url, chromosomeField, genomicFields } | { type: "bigwig", url } | { type: "beddb" | "vector" | "multivec" | "matrix", url, ... }',
  ),
  views: property(
    'Array of views for multi-view layouts, each { tracks } or { views }, with its own layout, xDomain, linkingId, etc. Use either `tracks` or `views` at the top level',
  ),
});

export const goslingSpecSchema = refineWithJsonSchema(
  goslingSpecShape,
  checkGoslingSpec,
);

export type GoslingSpec = z.infer<typeof goslingSpecShape>;
