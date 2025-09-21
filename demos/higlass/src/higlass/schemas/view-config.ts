import { z } from 'zod';

// ============================================================================
// TRACK TYPE ENUMS (Deduplicated)
// ============================================================================

/**
 * Track type enums for viewport projection tracks
 */
export const viewportProjectionTypeSchema = z.enum([
  'viewport-projection-center',
  'viewport-projection-vertical',
  'viewport-projection-horizontal',
]).describe("Viewport projection track types for displaying projections of the main view");

/**
 * Track type enums for standard HiGlass tracks
 */
export const standardTrackTypeSchema = z.enum([
  'multivec',
  '1d-heatmap',
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
  // Missing track types  '1d-arcs',
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
]).describe("Standard HiGlass track types for genomic data visualization");

/**
 * Union of all track types
 */
export const trackTypeSchema = z.union([
  viewportProjectionTypeSchema,
  standardTrackTypeSchema,
]).describe("Specifies the track type (e.g., \"horizontal-heatmap\", \"horizontal-bar\", \"2d-heatmap\").");

// ============================================================================
// COMMON SUB-SCHEMAS (Deduplicated)
// ============================================================================

/**
 * Layout schema for views
 */
export const viewLayoutSchema = z.looseObject({
  x: z.int().min(0).max(12)
    .describe("Horizontal position of the view in grid units.")
    .default(0),
  y: z.int().min(0).max(12)
    .describe("Vertical position of the view in grid units.")
    .default(0),
  w: z.int().min(0).max(12)
    .describe("Width of the view in grid units.")
    .default(12),
  h: z.int().min(0).max(12)
    .describe("Height of the view in grid units.")
    .default(12),
  moved: z.boolean().optional()
    .describe("Whether the view has been moved from its original position"),
  static: z.boolean().optional()
    .describe("Whether the view is static and cannot be moved"),
}).describe("Defines the spatial arrangement and dimensions of views in the visualization.");

/**
 * Data object schema for tracks
 */
export const trackDataSchema = z.object({
  type: z.string().optional()
    .describe("Data type identifier"),
  url: z.string().optional()
    .describe("URL endpoint for track data"),
  server: z.string().optional()
    .describe("Server URL providing the track data."),
  filetype: z.string().optional()
    .describe("File format type for the data"),
  children: z.array(z.any()).optional()
    .describe("Child data objects for composite tracks"),
  tilesetInfo: z.record(z.string(), z.any()).optional()
    .describe("Metadata about the tileset structure"),
  tiles: z.record(z.string(), z.any()).optional()
    .describe("Cached tile data for the track"),
}).optional().describe("Configuration object containing track-specific display and behavior options.");

/**
 * Base track schema with common properties
 */
export const baseTrackSchema = z.object({
  tilesetUid: z.string().optional()
    .describe("Unique identifier for the dataset/tileset on the server."),
  server: z.string().optional()
    .describe("Server URL providing the track data."),
  type: trackTypeSchema
    .describe("Specifies the track type (e.g., \"horizontal-heatmap\", \"horizontal-bar\", \"2d-heatmap\")."),
  uid: z.string().optional()
    .describe("Unique identifier for the view or track. Used for referencing in locks and interactions."),
  width: z.union([z.number().int(), z.null()]).optional()
    .describe("Width of the track in pixels."),
  height: z.union([z.number().int(), z.null()]).optional()
    .describe("Height of the track in pixels."),
  options: z.record(z.string(), z.any()).optional()
    .describe("Configuration object containing track-specific display and behavior options."),
  data: trackDataSchema
    .describe("Data configuration for the track"),
  chromInfoPath: z.string().optional()
    .describe("Path to chromosome information file"),
  fromViewUid: z.string().optional()
    .describe("UID of the view this track references"),
  x: z.number().optional()
    .describe("Horizontal position coordinate in pixels."),
  y: z.number().optional()
    .describe("Vertical position coordinate in pixels."),
  name: z.string().optional()
    .describe("Display name for the track"),
  position: z.string().optional()
    .describe("Position of the track (e.g., 'top', 'bottom', 'left', 'right', 'center')"),
  maxWidth: z.number().optional()
    .describe("Maximum width for the track"),
  maxZoom: z.number().optional()
    .describe("Maximum zoom level for the track"),
  binsPerDimension: z.number().optional()
    .describe("Number of bins per dimension for heatmap tracks"),
});

/**
 * Combined track schema for tracks with contents
 */
const baseCombinedTrackSchema = z.object({
  type: z.literal('combined')
    .describe("Track type identifier for combined tracks"),
  uid: z.string().optional()
    .describe("Unique identifier for the view or track. Used for referencing in locks and interactions."),
  width: z.union([z.number().int(), z.null()]).optional()
    .describe("Width of the track in pixels."),
  height: z.union([z.number().int(), z.null()]).optional()
    .describe("Height of the track in pixels."),
  options: z.record(z.string(), z.any()).optional()
    .describe("Configuration object containing track-specific display and behavior options."),
  position: z.string().optional()
    .describe("Position of the track (e.g., 'top', 'bottom', 'left', 'right', 'center')"),
});

/**
 * Track type for recursive combined tracks
 */
export type BaseTrack = z.infer<typeof baseTrackSchema>

/**
 * Track type for recursive combined tracks
 */
export type CombinedTrack = {
  type: 'combined';
  uid?: string;
  width?: number | null;
  height?: number | null;
  options?: Record<string, unknown>;
  position?: string;
  contents: (BaseTrack | CombinedTrack)[];
};

/**
 * Track type for recursive combined tracks
 */
export type Track = BaseTrack | CombinedTrack;

/**
 * Track schema with recursive support for combined tracks
 */
export const trackSchema: z.ZodType<Track> = z.lazy(() => z.union([
  baseTrackSchema,
  baseCombinedTrackSchema.extend({
    contents: z.array(trackSchema)
      .describe("Content configuration for composite tracks."),
  }),
]));

/**
 * Tracks container schema for organizing tracks by position
 */
export const tracksContainerSchema = z.object({
  left: z.array(trackSchema).optional()
    .describe("Array of 1D vertical tracks positioned on the left side of the view."),
  top: z.array(trackSchema).optional()
    .describe("Array of 1D horizontal tracks positioned at the top of the view."),
  center: z.array(trackSchema).optional()
    .describe("Array of 2D tracks positioned in the center of the view."),
  bottom: z.array(trackSchema).optional()
    .describe("Array of 1D horizontal tracks positioned at the bottom of the view."),
  right: z.array(trackSchema).optional()
    .describe("Array of 1D vertical tracks positioned on the right side of the view."),
}).describe("Container for organizing tracks by their position within the view.");

/**
 * View schema combining layout and tracks
 */
export const viewSchema = z.object({
  layout: viewLayoutSchema
    .describe("Layout configuration defining the size and position of the view"),
  tracks: tracksContainerSchema
    .describe("Container for organizing tracks by their position within the view"),
  uid: z.string().optional()
    .describe("Unique identifier for the view or track. Used for referencing in locks and interactions."),
  initialXDomain: z.array(z.number()).optional()
    .describe("Horizontal genomic view coordinates as [start, end]. Only necessary if the view contains top, bottom, or center tracks."),
  initialYDomain: z.array(z.number()).optional()
    .describe("Vertical genomic view coordinates as [start, end]. Only necessary if the view contains left, right, or center tracks."),
  autocompleteSource: z.string().optional()
    .describe("Source for genomic location autocomplete functionality"),
  chromInfoServer: z.string().optional()
    .describe("Server URL providing chromosome information for the genome assembly."),
  chromInfoId: z.string().optional()
    .describe("Genome assembly identifier (e.g., \"hg19\", \"hg38\", \"mm10\") for chromosome info."),
  chromInfoPath: z.string().optional()
    .describe("Path to chromosome information file"),
  genomePositionSearchBox: z.object({
    autocompleteServer: z.string().optional()
      .describe("Server URL for genomic location autocomplete functionality."),
    autocompleteId: z.string().optional()
      .describe("Identifier for genomic location autocomplete functionality."),
    chromInfoServer: z.string().optional()
      .describe("Server URL providing chromosome information for the genome assembly."),
    chromInfoId: z.string().optional()
      .describe("Genome assembly identifier (e.g., \"hg19\", \"hg38\", \"mm10\") for chromosome info."),
    visible: z.boolean().optional()
      .describe("Controls visibility of the genomic position search box."),
  }).optional().describe("Configuration for the genomic position search interface."),
  genomePositionSearchBoxVisible: z.boolean().optional()
    .describe("Controls visibility of the genomic position search box."),
  selectionView: z.boolean().optional()
    .describe("Whether this view is used for selection operations"),
  zoomFixed: z.boolean().optional()
    .describe("Whether zoom level is fixed for this view"),
}).describe("Individual view object defining the genomic visualization layout and tracks");

// ============================================================================
// LOCK SCHEMAS (Deduplicated)
// ============================================================================

/**
 * Lock schema for synchronized interactions
 */
export const lockSchema = z.object({
  locksByViewUid: z.record(z.string(), z.any()).optional()
    .describe("Maps view UIDs to lock configurations"),
  locksDict: z.record(z.string(), z.any()).optional()
    .describe("Maps lock IDs to lock configuration objects"),
}).describe("Synchronization configuration for coordinated interactions between views");

/**
 * Zoom locks schema
 */
export const zoomLocksSchema = lockSchema
  .describe("Zoom synchronization configuration between views.");

/**
 * Location locks schema
 */
export const locationLocksSchema = lockSchema
  .describe("Location synchronization configuration between views.");

/**
 * Value scale locks schema
 */
export const valueScaleLocksSchema = lockSchema
  .describe("Value scale synchronization configuration between views.");

// ============================================================================
// MAIN SCHEMA
// ============================================================================

export const higlassViewConfigSchema = z.object({
  editable: z.boolean()
    .describe("Controls whether the view configuration can be edited by users. Always true in practice.")
    .default(true),
  viewEditable: z.boolean().optional()
    .describe("Controls whether views can be edited"),
  tracksEditable: z.boolean().optional()
    .describe("Controls whether tracks can be edited"),
  zoomFixed: z.boolean().optional()
    .describe("Whether zoom level is fixed globally"),
  compactLayout: z.boolean().optional()
    .describe("Whether to use compact layout mode"),
  exportViewUrl: z.string().optional()
    .describe("URL endpoint for exporting view configurations."),
  trackSourceServers: z.array(z.string()).optional()
    .describe("Property 'trackSourceServers' found in HiGlass configurations."),
  views: z.array(viewSchema)
    .describe("Array of view objects that define the genomic visualization layouts and tracks."),
  zoomLocks: zoomLocksSchema,
  locationLocks: locationLocksSchema,
  valueScaleLocks: valueScaleLocksSchema.optional(),
  chromInfoPath: z.string().optional()
    .describe("Path to chromosome information file"),
}).describe("Root object describing a HiGlass visualization.");

export type HiGlassViewConfig = z.infer<typeof higlassViewConfigSchema>;
export type TrackType = z.infer<typeof trackTypeSchema>;
export type ViewLayout = z.infer<typeof viewLayoutSchema>;
export type View = z.infer<typeof viewSchema>;
