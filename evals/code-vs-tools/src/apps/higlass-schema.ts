import { z } from 'zod';

// ============================================================================
// TRACK TYPE ENUMS
// ============================================================================

export const viewportProjectionTypeSchema = z.enum([
  'viewport-projection-center',
  'viewport-projection-vertical',
  'viewport-projection-horizontal',
]);

export const standardTrackTypeSchema = z.enum([
  'multivec',
  '1d-heatmap',
  '1d-arcs',
  'line',
  'point',
  'bar',
  'divergent-bar',
  'stacked-interval',
  'gene-annotations',
  'linear-2d-rectangle-domains',
  'chromosome-labels',
  'linear-heatmap',
  '1d-value-interval',
  '2d-annotations',
  '2d-chromosome-annotations',
  '2d-chromosome-grid',
  '2d-chromosome-labels',
  '2d-rectangle-domains',
  '2d-tiles',
  'arrowhead-domains',
  'bedlike',
  'cross-rule',
  'dummy',
  'horizontal-1d-annotations',
  'horizontal-1d-heatmap',
  'horizontal-1d-tiles',
  'horizontal-1d-value-interval',
  'horizontal-2d-rectangle-domains',
  'horizontal-bar',
  'horizontal-chromosome-grid',
  'horizontal-chromosome-labels',
  'horizontal-divergent-bar',
  'horizontal-gene-annotations',
  'horizontal-heatmap',
  'horizontal-line',
  'horizontal-multivec',
  'horizontal-point',
  'horizontal-rule',
  'horizontal-vector-heatmap',
  'image-tiles',
  'left-axis',
  'left-stacked-interval',
  'mapbox-tiles',
  'osm-2d-tile-ids',
  'osm-tiles',
  'raster-tiles',
  'simple-svg',
  'square-markers',
  'top-axis',
  'top-stacked-interval',
  'vertical-1d-annotations',
  'vertical-1d-heatmap',
  'vertical-1d-tiles',
  'vertical-1d-value-interval',
  'vertical-2d-rectangle-domains',
  'vertical-bar',
  'vertical-bedlike',
  'vertical-chromosome-grid',
  'vertical-chromosome-labels',
  'vertical-gene-annotations',
  'vertical-heatmap',
  'vertical-line',
  'vertical-multivec',
  'vertical-point',
  'vertical-rule',
  'vertical-vector-heatmap',
  'bam',
  'divided',
  'empty',
  'filled-line',
  'geo-json',
  'heatmap',
  'horizontal-clinvar',
  'horizontal-dynseq',
  'horizontal-section',
  'horizontal-sequence',
  'horizontal-stacked-bar',
  'horizontal-transcripts',
  'labelled-points-track',
  'multi-tileset',
  'pileup',
  'vertical-section',
]);

export const trackTypeSchema = z.union([
  viewportProjectionTypeSchema,
  standardTrackTypeSchema,
]);

// ============================================================================
// COMMON SUB-SCHEMAS
// ============================================================================

export const viewLayoutSchema = z.looseObject({
  x: z.int().min(0).max(12).default(0),
  y: z.int().min(0).max(12).default(0),
  w: z.int().min(0).max(12).default(12),
  h: z.int().min(0).max(12).default(12),
  moved: z.boolean().optional(),
  static: z.boolean().optional(),
});

export const trackDataSchema = z
  .object({
    type: z.string().optional(),
    url: z.string().optional(),
    server: z.string().optional(),
    filetype: z.string().optional(),
    children: z.array(z.any()).optional(),
    tilesetInfo: z.record(z.string(), z.any()).optional(),
    tiles: z.record(z.string(), z.any()).optional(),
  })
  .optional();

export const baseTrackSchema = z.object({
  tilesetUid: z.string().optional(),
  server: z.string().optional(),
  type: trackTypeSchema,
  uid: z.string().optional(),
  width: z.union([z.number().int(), z.null()]).optional(),
  height: z.union([z.number().int(), z.null()]).optional(),
  options: z.record(z.string(), z.any()).optional(),
  data: trackDataSchema,
  chromInfoPath: z.string().optional(),
  fromViewUid: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  name: z.string().optional(),
  position: z.string().optional(),
  maxWidth: z.number().optional(),
  maxZoom: z.number().optional(),
  binsPerDimension: z.number().optional(),
});

const baseCombinedTrackSchema = z.object({
  type: z.literal('combined'),
  uid: z.string().optional(),
  width: z.union([z.number().int(), z.null()]).optional(),
  height: z.union([z.number().int(), z.null()]).optional(),
  options: z.record(z.string(), z.any()).optional(),
  position: z.string().optional(),
});

export type BaseTrack = z.infer<typeof baseTrackSchema>;

export type CombinedTrack = {
  type: 'combined';
  uid?: string;
  width?: number | null;
  height?: number | null;
  options?: Record<string, unknown>;
  position?: string;
  contents: (BaseTrack | CombinedTrack)[];
};

export type Track = BaseTrack | CombinedTrack;

export const trackSchema: z.ZodType<Track> = z.lazy(() =>
  z.union([
    baseTrackSchema,
    baseCombinedTrackSchema.extend({
      contents: z.array(trackSchema),
    }),
  ]),
);

export const tracksContainerSchema = z.object({
  left: z.array(trackSchema).optional(),
  top: z.array(trackSchema).optional(),
  center: z.array(trackSchema).optional(),
  bottom: z.array(trackSchema).optional(),
  right: z.array(trackSchema).optional(),
});

export const viewSchema = z.object({
  layout: viewLayoutSchema,
  tracks: tracksContainerSchema,
  uid: z.string().optional(),
  initialXDomain: z.array(z.number()).optional(),
  initialYDomain: z.array(z.number()).optional(),
  autocompleteSource: z.string().optional(),
  chromInfoServer: z.string().optional(),
  chromInfoId: z.string().optional(),
  chromInfoPath: z.string().optional(),
  genomePositionSearchBox: z
    .object({
      autocompleteServer: z.string().optional(),
      autocompleteId: z.string().optional(),
      chromInfoServer: z.string().optional(),
      chromInfoId: z.string().optional(),
      visible: z.boolean().optional(),
    })
    .optional(),
  genomePositionSearchBoxVisible: z.boolean().optional(),
  selectionView: z.boolean().optional(),
  zoomFixed: z.boolean().optional(),
});

// ============================================================================
// LOCK SCHEMAS
// ============================================================================

export const lockSchema = z.object({
  locksByViewUid: z.record(z.string(), z.any()).optional(),
  locksDict: z.record(z.string(), z.any()).optional(),
});

export const zoomLocksSchema = lockSchema;
export const locationLocksSchema = lockSchema;
export const valueScaleLocksSchema = lockSchema;

// ============================================================================
// MAIN SCHEMA
// ============================================================================

export const higlassViewConfigSchema = z.object({
  editable: z.boolean().default(true),
  viewEditable: z.boolean().optional(),
  tracksEditable: z.boolean().optional(),
  zoomFixed: z.boolean().optional(),
  compactLayout: z.boolean().optional(),
  exportViewUrl: z.string().optional(),
  trackSourceServers: z.array(z.string()).optional(),
  views: z.array(viewSchema),
  zoomLocks: zoomLocksSchema,
  locationLocks: locationLocksSchema,
  valueScaleLocks: valueScaleLocksSchema.optional(),
  chromInfoPath: z.string().optional(),
});

export type HiGlassViewConfig = z.infer<typeof higlassViewConfigSchema>;
