import { getDefaultStore } from 'jotai';
import { z } from 'zod';
import { mcp } from '../mcp/mcp.ts';
import {
  higlassGeneSearchResultSchema,
  higlassGeneSearchSchema,
  higlassTilesetSearchSchema,
  higlassTilesetSearchResultSchema,
} from './schemas/others.ts';
import type { HiGlassViewConfig } from './schemas/view-config.ts';
import {
  higlassViewConfigSchema,
  trackSchema,
  viewLayoutSchema,
  viewSchema,
} from './schemas/view-config.ts';
import {
  higlassChromosomeInfoByViewAtom,
  higlassDefaultChromosomeInfoAtom,
  higlassGeneAnnotationByViewAtom,
  higlassTilesetsAtom,
  higlassViewConfigAtom,
} from './states.ts';
import type {
  ChromosomeInfo,
  HiglassGeneSearchResponse,
  HiglassGeneSearchResult,
} from './types.ts';

const store = getDefaultStore();

// ============================================================================
// Shared Schemas
// ============================================================================

const trackPositionSchema = z
  .enum(['top', 'bottom', 'left', 'right', 'center'])
  .describe('Position of the track within the view');

type TrackPosition = z.infer<typeof trackPositionSchema>;

const lockTypeSchema = z
  .enum(['zoom', 'location', 'value'])
  .describe(
    'Type of synchronization: zoom (zoom level), location (pan position), or value (value scale)',
  );

type LockType = z.infer<typeof lockTypeSchema>;

const LOCK_TYPE_TO_KEY: Record<LockType, keyof HiGlassViewConfig> = {
  zoom: 'zoomLocks',
  location: 'locationLocks',
  value: 'valueScaleLocks',
};

// ============================================================================
// Helpers
// ============================================================================

function getTracksAt(
  config: HiGlassViewConfig,
  viewIndex: number,
  position: TrackPosition,
) {
  if (viewIndex >= config.views.length) {
    throw new Error(
      `View index ${viewIndex} out of bounds (${config.views.length} views)`,
    );
  }
  return config.views[viewIndex].tracks[position] || [];
}

// ============================================================================
// Global Getter
// ============================================================================

mcp.addTool({
  name: 'higlass_get_view_config',
  description:
    'Get the current HiGlass view config describing the layout, UI, and track visualizations',
  inputSchema: z.object({}),
  outputSchema: higlassViewConfigSchema,
  handler: async () => store.get(higlassViewConfigAtom),
});

// ============================================================================
// View Tools
// ============================================================================

mcp.addTool({
  name: 'higlass_add_view',
  description: 'Add a new view to the HiGlass visualization',
  inputSchema: z.object({
    view: viewSchema.describe('The view configuration to add'),
    index: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe(
        'Zero-based index at which to insert the view. If omitted, appends at the end.',
      ),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    index: z.number(),
  }),
  handler: async ({ view, index }: { view: unknown; index?: number }) => {
    const config = store.get(higlassViewConfigAtom);
    const views = [...config.views];
    const parsed = viewSchema.parse(view);
    const insertAt = index ?? views.length;
    views.splice(insertAt, 0, parsed);
    store.set(higlassViewConfigAtom, { ...config, views });
    return { success: true, index: insertAt };
  },
});

mcp.addTool({
  name: 'higlass_set_view',
  description:
    'Update properties of an existing view (layout, initialXDomain, initialYDomain, etc.). Does NOT modify tracks — use add_track, set_track, or delete_track for that.',
  inputSchema: z.object({
    viewIndex: z
      .number()
      .int()
      .min(0)
      .describe('Zero-based index of the view to update.'),
    layout: viewLayoutSchema
      .optional()
      .describe('Grid layout: {x, y, w, h}'),
    initialXDomain: z
      .array(z.number())
      .optional()
      .describe(
        'Horizontal genomic domain [start, end] in absolute coordinates.',
      ),
    initialYDomain: z
      .array(z.number())
      .optional()
      .describe(
        'Vertical genomic domain [start, end] in absolute coordinates.',
      ),
  }),
  outputSchema: z.object({ success: z.boolean() }),
  handler: async ({
    viewIndex,
    layout,
    initialXDomain,
    initialYDomain,
  }: {
    viewIndex: number;
    layout?: Record<string, unknown>;
    initialXDomain?: number[];
    initialYDomain?: number[];
  }) => {
    const config = store.get(higlassViewConfigAtom);
    if (viewIndex >= config.views.length) {
      throw new Error(
        `View index ${viewIndex} out of bounds (${config.views.length} views)`,
      );
    }
    const views = [...config.views];
    const view = { ...views[viewIndex] };
    if (layout) view.layout = { ...view.layout, ...layout };
    if (initialXDomain) view.initialXDomain = initialXDomain;
    if (initialYDomain) view.initialYDomain = initialYDomain;
    views[viewIndex] = view;
    store.set(higlassViewConfigAtom, { ...config, views });
    return { success: true };
  },
});

mcp.addTool({
  name: 'higlass_delete_view',
  description: 'Delete a view from the HiGlass visualization',
  inputSchema: z.object({
    index: z
      .number()
      .int()
      .min(0)
      .describe('Zero-based index of the view to delete'),
  }),
  outputSchema: z.object({ success: z.boolean() }),
  handler: async ({ index }: { index: number }) => {
    const config = store.get(higlassViewConfigAtom);
    if (index >= config.views.length) {
      throw new Error(
        `View index ${index} out of bounds (${config.views.length} views)`,
      );
    }
    const views = config.views.filter((_, i) => i !== index);
    store.set(higlassViewConfigAtom, { ...config, views });
    return { success: true };
  },
});

// ============================================================================
// Track Tools
// ============================================================================

mcp.addTool({
  name: 'higlass_add_track',
  description: 'Add a track to a view at the specified position',
  inputSchema: z.object({
    viewIndex: z
      .number()
      .int()
      .min(0)
      .describe('Zero-based index of the view'),
    position: trackPositionSchema,
    track: trackSchema.describe('The track configuration to add'),
    index: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe(
        'Zero-based index at which to insert the track. If omitted, appends at the end.',
      ),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    index: z.number(),
  }),
  handler: async ({
    viewIndex,
    position,
    track,
    index,
  }: {
    viewIndex: number;
    position: TrackPosition;
    track: unknown;
    index?: number;
  }) => {
    const config = store.get(higlassViewConfigAtom);
    const tracks = [...getTracksAt(config, viewIndex, position)];
    const parsed = trackSchema.parse(track);
    const insertAt = index ?? tracks.length;
    tracks.splice(insertAt, 0, parsed);

    const views = [...config.views];
    views[viewIndex] = {
      ...views[viewIndex],
      tracks: { ...views[viewIndex].tracks, [position]: tracks },
    };
    store.set(higlassViewConfigAtom, { ...config, views });
    return { success: true, index: insertAt };
  },
});

mcp.addTool({
  name: 'higlass_set_track',
  description:
    'Update a track in a view (partial update with deep merge)',
  inputSchema: z.object({
    viewIndex: z
      .number()
      .int()
      .min(0)
      .describe('Zero-based index of the view'),
    position: trackPositionSchema,
    trackIndex: z
      .number()
      .int()
      .min(0)
      .describe('Zero-based index of the track to update'),
    track: z
      .record(z.string(), z.unknown())
      .describe(
        'Partial track configuration. Only provided fields will be changed.',
      ),
  }),
  outputSchema: z.object({ success: z.boolean() }),
  handler: async ({
    viewIndex,
    position,
    trackIndex,
    track,
  }: {
    viewIndex: number;
    position: TrackPosition;
    trackIndex: number;
    track: Record<string, unknown>;
  }) => {
    const config = store.get(higlassViewConfigAtom);
    const tracks = [...getTracksAt(config, viewIndex, position)];
    if (trackIndex >= tracks.length) {
      throw new Error(
        `Track index ${trackIndex} out of bounds (${tracks.length} ${position} tracks)`,
      );
    }
    tracks[trackIndex] = trackSchema.parse({
      ...tracks[trackIndex],
      ...track,
    });

    const views = [...config.views];
    views[viewIndex] = {
      ...views[viewIndex],
      tracks: { ...views[viewIndex].tracks, [position]: tracks },
    };
    store.set(higlassViewConfigAtom, { ...config, views });
    return { success: true };
  },
});

mcp.addTool({
  name: 'higlass_delete_track',
  description: 'Delete a track from a view',
  inputSchema: z.object({
    viewIndex: z
      .number()
      .int()
      .min(0)
      .describe('Zero-based index of the view'),
    position: trackPositionSchema,
    trackIndex: z
      .number()
      .int()
      .min(0)
      .describe('Zero-based index of the track to delete'),
  }),
  outputSchema: z.object({ success: z.boolean() }),
  handler: async ({
    viewIndex,
    position,
    trackIndex,
  }: {
    viewIndex: number;
    position: TrackPosition;
    trackIndex: number;
  }) => {
    const config = store.get(higlassViewConfigAtom);
    const tracks = [...getTracksAt(config, viewIndex, position)];
    if (trackIndex >= tracks.length) {
      throw new Error(
        `Track index ${trackIndex} out of bounds (${tracks.length} ${position} tracks)`,
      );
    }
    tracks.splice(trackIndex, 1);

    const views = [...config.views];
    views[viewIndex] = {
      ...views[viewIndex],
      tracks: { ...views[viewIndex].tracks, [position]: tracks },
    };
    store.set(higlassViewConfigAtom, { ...config, views });
    return { success: true };
  },
});

// ============================================================================
// Lock Tools
// ============================================================================

mcp.addTool({
  name: 'higlass_sync_views',
  description:
    'Synchronize views so they share the same zoom level, location, or value scale. Views in a sync group will move/zoom together.',
  inputSchema: z.object({
    type: lockTypeSchema,
    viewIds: z
      .array(z.string())
      .min(2)
      .describe('View UIDs to synchronize together'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    lockUid: z.string(),
    syncedViews: z.array(z.string()),
    type: lockTypeSchema,
  }),
  handler: async ({
    type,
    viewIds,
  }: { type: LockType; viewIds: string[] }) => {
    const config = store.get(higlassViewConfigAtom);
    const lockKey = LOCK_TYPE_TO_KEY[type];
    const existing =
      (config[lockKey] as {
        locksByViewUid?: Record<string, string>;
        locksDict?: Record<string, Record<string, unknown>>;
      }) || {};

    const locksByViewUid = { ...existing.locksByViewUid };
    const locksDict = { ...existing.locksDict };

    const lockUid = crypto.randomUUID().replaceAll('-', '').slice(0, 22);
    const lockEntry: Record<string, unknown> = { uid: lockUid };

    for (const viewId of viewIds) {
      locksByViewUid[viewId] = lockUid;
      const view = config.views.find((v) => v.uid === viewId);
      if (view) {
        if (type === 'zoom' || type === 'location') {
          lockEntry[viewId] = [
            ...(view.initialXDomain || []),
            ...(view.initialYDomain || []),
          ];
        } else {
          lockEntry[viewId] = {};
        }
      } else {
        lockEntry[viewId] = type === 'value' ? {} : [1, 1];
      }
    }

    locksDict[lockUid] = lockEntry;
    store.set(higlassViewConfigAtom, {
      ...config,
      [lockKey]: { locksByViewUid, locksDict },
    });

    return { success: true, lockUid, syncedViews: viewIds, type };
  },
});

mcp.addTool({
  name: 'higlass_unsync_views',
  description:
    'Remove synchronization between views. Can unsync specific views or all views for a lock type.',
  inputSchema: z.object({
    type: lockTypeSchema,
    viewIds: z
      .array(z.string())
      .optional()
      .describe(
        'View UIDs to unsync. If omitted, removes all locks of this type.',
      ),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    type: lockTypeSchema,
    removedAll: z.boolean().optional(),
    unsyncedViews: z.array(z.string()).optional(),
  }),
  handler: async ({
    type,
    viewIds,
  }: { type: LockType; viewIds?: string[] }) => {
    const config = store.get(higlassViewConfigAtom);
    const lockKey = LOCK_TYPE_TO_KEY[type];
    const existing =
      (config[lockKey] as {
        locksByViewUid?: Record<string, string>;
        locksDict?: Record<string, Record<string, unknown>>;
      }) || {};

    if (!viewIds) {
      store.set(higlassViewConfigAtom, {
        ...config,
        [lockKey]: { locksByViewUid: {}, locksDict: {} },
      });
      return { success: true, type, removedAll: true };
    }

    const locksByViewUid = { ...existing.locksByViewUid };
    const locksDict: Record<string, Record<string, unknown>> = {};
    for (const [k, v] of Object.entries(existing.locksDict || {})) {
      locksDict[k] = { ...(v as Record<string, unknown>) };
    }

    const affectedLockUids = new Set<string>();
    for (const viewId of viewIds) {
      const lockUid = locksByViewUid[viewId];
      if (lockUid) {
        affectedLockUids.add(lockUid);
        delete locksByViewUid[viewId];
        if (locksDict[lockUid]) {
          delete locksDict[lockUid][viewId];
        }
      }
    }

    for (const lockUid of affectedLockUids) {
      const entry = locksDict[lockUid];
      if (!entry) continue;
      const remainingViews = Object.keys(entry).filter((k) => k !== 'uid');
      if (remainingViews.length < 2) {
        for (const viewId of remainingViews) {
          delete locksByViewUid[viewId];
        }
        delete locksDict[lockUid];
      }
    }

    store.set(higlassViewConfigAtom, {
      ...config,
      [lockKey]: { locksByViewUid, locksDict },
    });

    return { success: true, type, unsyncedViews: viewIds };
  },
});

// ============================================================================
// Search Tools
// ============================================================================

mcp.addTool({
  name: 'higlass_tileset_search',
  description:
    'Search for tilesets by name or description. Returns a list of all matching tilesets that can be visualized with HiGlass',
  inputSchema: higlassTilesetSearchSchema,
  outputSchema: higlassTilesetSearchResultSchema,
  handler: async ({
    search,
    datatype,
  }: { search: string; datatype?: string }) => {
    const allTilesets = await store.get(higlassTilesetsAtom);
    const searchLower = search.toLowerCase();
    const results = allTilesets.filter((tileset) => {
      const matches =
        tileset.name.includes(searchLower) ||
        tileset.description.includes(searchLower);
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
        server: tileset.server,
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
  handler: async ({
    view,
    gene,
  }: { view?: string; gene: string }) => {
    let chromosomeInfo: ChromosomeInfo | undefined;
    let suggestTilesetUid = 'OHJakQICQD6gTD7skx4EWA';
    let suggestServer = 'https://higlass.io/api/v1';

    const geneAnnotationByView = await store.get(
      higlassGeneAnnotationByViewAtom,
    );

    if (view && geneAnnotationByView[view]) {
      const chromosomeInfosByView = await store.get(
        higlassChromosomeInfoByViewAtom,
      );
      chromosomeInfo = chromosomeInfosByView[view];
      suggestTilesetUid = geneAnnotationByView[view].tilesetUid;
      suggestServer = geneAnnotationByView[view].server;
    } else {
      // Use the first view's gene annotation if available
      const viewUids = Object.keys(geneAnnotationByView);
      if (viewUids.length > 0) {
        const firstViewUid = viewUids[0];
        const chromosomeInfosByView = await store.get(
          higlassChromosomeInfoByViewAtom,
        );
        chromosomeInfo = chromosomeInfosByView[firstViewUid];
        suggestTilesetUid = geneAnnotationByView[firstViewUid].tilesetUid;
        suggestServer = geneAnnotationByView[firstViewUid].server;
      } else {
        chromosomeInfo = await store.get(higlassDefaultChromosomeInfoAtom);
      }
    }

    if (!chromosomeInfo) {
      throw new Error(
        'No chromosome info found, which is required to convert relative coordinates to absolute coordinates.',
      );
    }

    const response = await fetch(
      `${suggestServer}/suggest/?d=${suggestTilesetUid}&ac=${gene}`,
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

