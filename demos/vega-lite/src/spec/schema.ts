import vegaLiteJsonSchema from 'vega-lite/vega-lite-schema.json';
import { z } from 'zod';
import {
  createJsonSchemaCheck,
  refineWithJsonSchema,
} from './json-schema-check.ts';

/** Checks a spec against the official Vega-Lite JSON Schema. */
export const checkVegaLiteSpec = createJsonSchemaCheck(vegaLiteJsonSchema);

const property = (description: string) =>
  z.unknown().optional().describe(description);

/**
 * The top level of a Vega-Lite spec, with a short description of each
 * property for AI. Values are not typed here, so `get_spec` can return any
 * object the user typed: the refinement checks the whole spec against the
 * official JSON Schema instead.
 */
export const vegaLiteSpecShape = z.looseObject({
  $schema: property(
    'string, e.g. "https://vega.github.io/schema/vega-lite/v6.json"',
  ),
  title: property('string | { text, subtitle?, anchor?, fontSize?, ... }'),
  description: property('string'),
  data: property(
    '{ values: object[] } | { url: string, format?: { type: "csv" | "json" | "tsv" | "topojson" } } | { name: string } | { sequence: { start, stop, step? } }',
  ),
  transform: property(
    'Array of transforms: filter, calculate, aggregate, bin, timeUnit, fold, pivot, window, joinaggregate, regression, loess, density, lookup, stack, flatten, sample, extent, impute, quantile',
  ),
  params: property(
    'Array of { name, value?, bind?, select?: "point" | "interval" | { type, encodings?, fields?, on?, clear? } }',
  ),
  mark: property(
    '"bar" | "line" | "point" | "area" | "rect" | "rule" | "text" | "tick" | "arc" | "circle" | "square" | "trail" | "image" | "geoshape" | "boxplot" | "errorbar" | "errorband" | { type, tooltip?, point?, color?, opacity?, size?, strokeDash?, interpolate?, ... }',
  ),
  encoding: property(
    'Channels (x, y, x2, y2, color, fill, stroke, opacity, size, shape, theta, radius, text, tooltip, detail, order, href, row, column, facet, xOffset, yOffset, strokeDash) map to a field definition { field, type: "quantitative" | "temporal" | "ordinal" | "nominal", aggregate?, bin?, timeUnit?, scale?, axis?, legend?, sort?, stack?, title? }, a datum { datum }, or a value { value }',
  ),
  layer: property('Array of unit or layer specs sharing data and encoding'),
  facet: property(
    '{ field, type } or { row?, column? }; requires a sibling spec',
  ),
  spec: property('The unit or layer spec repeated per facet or repeat'),
  repeat: property(
    'string[] | { row?: string[], column?: string[], layer?: string[] }; requires a sibling spec',
  ),
  concat: property('Array of specs laid out in a grid of `columns`'),
  hconcat: property('Array of specs laid out horizontally'),
  vconcat: property('Array of specs laid out vertically'),
  columns: property('Number of columns for concat, facet or repeat'),
  resolve: property(
    '{ scale?, axis?, legend? }, each mapping channels to "shared" | "independent"',
  ),
  width: property('number | "container" | { step: number }'),
  height: property('number | "container" | { step: number }'),
  autosize: property(
    '"pad" | "fit" | "fit-x" | "fit-y" | "none" | { type, contains?, resize? }',
  ),
  padding: property('number | { top, bottom, left, right }'),
  background: property('CSS color'),
  projection: property('{ type: "mercator" | "albersUsa" | ..., ... }'),
  config: property(
    'Theme defaults, e.g. { axis, legend, mark, view, range, font, ... }',
  ),
});

export const vegaLiteSpecSchema = refineWithJsonSchema(
  vegaLiteSpecShape,
  checkVegaLiteSpec,
);

export type VegaLiteSpec = z.infer<typeof vegaLiteSpecShape>;
