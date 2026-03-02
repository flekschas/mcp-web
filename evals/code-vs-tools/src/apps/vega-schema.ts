import { z } from 'zod';

// ============================================================================
// Array Element Schemas
// ============================================================================
// Each uses .passthrough() to accept arbitrary Vega-specific fields while
// typing the key identifying field for better tool descriptions.

const dataSourceSchema = z
  .object({
    name: z.string().describe('Unique name for this data source'),
  })
  .passthrough();

const signalSchema = z
  .object({
    name: z.string().describe('Unique signal name'),
  })
  .passthrough();

const scaleSchema = z
  .object({
    name: z.string().describe('Unique scale name'),
  })
  .passthrough();

const axisSchema = z
  .object({
    orient: z
      .string()
      .describe('Axis orientation: top, bottom, left, right'),
    scale: z
      .string()
      .describe('Name of the scale this axis visualizes'),
  })
  .passthrough();

const markSchema = z
  .object({
    type: z
      .string()
      .describe(
        'Mark type: rect, symbol, line, area, text, group, path, rule, image, arc, shape, trail',
      ),
  })
  .passthrough();

const legendSchema = z.object({}).passthrough();

const projectionSchema = z
  .object({
    name: z.string().describe('Unique projection name'),
  })
  .passthrough();

// ============================================================================
// Root Schema
// ============================================================================

/**
 * Zod schema for a Vega specification.
 *
 * Fixed fields are set via get_app / set_app.
 * Array fields (data, signals, scales, axes, marks, legends, projections)
 * each generate 4 CRUD tools via zodSchemasToTools.
 *
 * Total: 2 root + 7×4 array = 30 tools
 */
export const vegaSpecSchema = z.object({
  // Fixed fields (managed via set_app)
  $schema: z
    .string()
    .default('https://vega.github.io/schema/vega/v6.json'),
  description: z.string().optional(),
  width: z.unknown().optional(),
  height: z.unknown().optional(),
  padding: z.unknown().optional(),
  autosize: z.unknown().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  title: z.unknown().optional(),
  encode: z.record(z.string(), z.unknown()).optional(),

  // Array fields (4 tools each via zodSchemasToTools)
  data: z.array(dataSourceSchema).default([]),
  signals: z.array(signalSchema).default([]),
  scales: z.array(scaleSchema).default([]),
  axes: z.array(axisSchema).default([]),
  marks: z.array(markSchema).default([]),
  legends: z.array(legendSchema).default([]),
  projections: z.array(projectionSchema).default([]),
});

export type VegaSpec = z.infer<typeof vegaSpecSchema>;
