import { z } from 'zod';

export const higlassViewConfigSchema = z
  .object({
    editable: z.boolean().default(true),
    viewEditable: z.boolean().optional(),
    tracksEditable: z.boolean().optional(),
    zoomFixed: z.boolean().optional(),
    compactLayout: z.boolean().optional(),
    exportViewUrl: z.string().optional(),
    trackSourceServers: z.array(z.string()).optional(),
    views: z
      .array(
        z
          .object({
            layout: z
              .object({
                x: z.number().int().describe('The X Position').default(0),
                y: z.number().int().describe('The Y Position').default(0),
                w: z.number().int().describe('Width').default(12),
                h: z.number().int().describe('Height').default(12),
                moved: z.boolean().optional(),
                static: z.boolean().optional(),
              })
              .describe('Size and position of a View.'),
            tracks: z
              .object({
                left: z
                  .array(
                    z.union([
                      z.object({
                        tilesetUid: z.string().optional(),
                        server: z.string().optional(),
                        type: z.union([
                          z.enum([
                            'viewport-projection-center',
                            'viewport-projection-vertical',
                            'viewport-projection-horizontal',
                          ]),
                          z.enum([
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
                          ]),
                        ]),
                        uid: z.string().optional(),
                        width: z.number().int().optional(),
                        height: z.number().int().optional(),
                        options: z.record(z.string(), z.any()).optional(),
                        data: z
                          .object({
                            type: z.string().optional(),
                            url: z.string().optional(),
                            server: z.string().optional(),
                            filetype: z.string().optional(),
                            children: z.array(z.any()).optional(),
                            tilesetInfo: z
                              .record(z.string(), z.any())
                              .optional(),
                            tiles: z.record(z.string(), z.any()).optional(),
                          })
                          .optional(),
                        chromInfoPath: z.string().optional(),
                        fromViewUid: z.string().optional(),
                        x: z.number().optional(),
                        y: z.number().optional(),
                      }),
                      z.object({
                        type: z.literal('combined'),
                        uid: z.string().optional(),
                        width: z.number().int().optional(),
                        height: z.number().int().optional(),
                        options: z.record(z.string(), z.any()).optional(),
                        contents: z.array(
                          z.union([
                            z.object({
                              tilesetUid: z.string().optional(),
                              server: z.string().optional(),
                              type: z.union([
                                z.enum([
                                  'viewport-projection-center',
                                  'viewport-projection-vertical',
                                  'viewport-projection-horizontal',
                                ]),
                                z.enum([
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
                                ]),
                              ]),
                              uid: z.string().optional(),
                              width: z.number().int().optional(),
                              height: z.number().int().optional(),
                              options: z.record(z.string(), z.any()).optional(),
                              data: z
                                .object({
                                  type: z.string().optional(),
                                  url: z.string().optional(),
                                  server: z.string().optional(),
                                  filetype: z.string().optional(),
                                  children: z.array(z.any()).optional(),
                                  tilesetInfo: z
                                    .record(z.string(), z.any())
                                    .optional(),
                                  tiles: z
                                    .record(z.string(), z.any())
                                    .optional(),
                                })
                                .optional(),
                              chromInfoPath: z.string().optional(),
                              fromViewUid: z.string().optional(),
                              x: z.number().optional(),
                              y: z.number().optional(),
                            }),
                            z.any(),
                            z.object({
                              tilesetUid: z.string().optional(),
                              server: z.string().optional(),
                              type: z.literal('heatmap'),
                              uid: z.string().optional(),
                              width: z.number().int().optional(),
                              height: z.number().int().optional(),
                              options: z.record(z.string(), z.any()).optional(),
                              data: z
                                .object({
                                  type: z.string().optional(),
                                  url: z.string().optional(),
                                  server: z.string().optional(),
                                  filetype: z.string().optional(),
                                  children: z.array(z.any()).optional(),
                                  tilesetInfo: z
                                    .record(z.string(), z.any())
                                    .optional(),
                                  tiles: z
                                    .record(z.string(), z.any())
                                    .optional(),
                                })
                                .optional(),
                              position: z.string().optional(),
                              transforms: z.array(z.any()).optional(),
                            }),
                            z.object({
                              type: z.enum([
                                'viewport-projection-center',
                                'viewport-projection-vertical',
                                'viewport-projection-horizontal',
                              ]),
                              uid: z.string().optional(),
                              width: z.number().int().optional(),
                              height: z.number().int().optional(),
                              options: z.record(z.string(), z.any()).optional(),
                              fromViewUid: z.null().optional(),
                              projectionXDomain: z
                                .array(z.any())
                                .min(2)
                                .max(2)
                                .optional(),
                              projectionYDomain: z
                                .array(z.any())
                                .min(2)
                                .max(2)
                                .optional(),
                              transforms: z.array(z.any()).optional(),
                              x: z.number().optional(),
                              y: z.number().optional(),
                            }),
                            z
                              .object({
                                type: z.string(),
                                uid: z.string().optional(),
                                width: z.number().int().optional(),
                                height: z.number().int().optional(),
                                options: z
                                  .record(z.string(), z.any())
                                  .optional(),
                              })
                              .catchall(z.any()),
                          ]),
                        ),
                        position: z.string().optional(),
                      }),
                      z.object({
                        tilesetUid: z.string().optional(),
                        server: z.string().optional(),
                        type: z.literal('heatmap'),
                        uid: z.string().optional(),
                        width: z.number().int().optional(),
                        height: z.number().int().optional(),
                        options: z.record(z.string(), z.any()).optional(),
                        data: z
                          .object({
                            type: z.string().optional(),
                            url: z.string().optional(),
                            server: z.string().optional(),
                            filetype: z.string().optional(),
                            children: z.array(z.any()).optional(),
                            tilesetInfo: z
                              .record(z.string(), z.any())
                              .optional(),
                            tiles: z.record(z.string(), z.any()).optional(),
                          })
                          .optional(),
                        position: z.string().optional(),
                        transforms: z.array(z.any()).optional(),
                      }),
                      z.object({
                        type: z.enum([
                          'viewport-projection-center',
                          'viewport-projection-vertical',
                          'viewport-projection-horizontal',
                        ]),
                        uid: z.string().optional(),
                        width: z.number().int().optional(),
                        height: z.number().int().optional(),
                        options: z.record(z.string(), z.any()).optional(),
                        fromViewUid: z.null().optional(),
                        projectionXDomain: z
                          .array(z.any())
                          .min(2)
                          .max(2)
                          .optional(),
                        projectionYDomain: z
                          .array(z.any())
                          .min(2)
                          .max(2)
                          .optional(),
                        transforms: z.array(z.any()).optional(),
                        x: z.number().optional(),
                        y: z.number().optional(),
                      }),
                      z
                        .object({
                          type: z.string(),
                          uid: z.string().optional(),
                          width: z.number().int().optional(),
                          height: z.number().int().optional(),
                          options: z.record(z.string(), z.any()).optional(),
                        })
                        .catchall(z.any()),
                    ]),
                  )
                  .optional(),
                right: z
                  .array(
                    z.union([
                      z.object({
                        tilesetUid: z.string().optional(),
                        server: z.string().optional(),
                        type: z.union([
                          z.enum([
                            'viewport-projection-center',
                            'viewport-projection-vertical',
                            'viewport-projection-horizontal',
                          ]),
                          z.enum([
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
                          ]),
                        ]),
                        uid: z.string().optional(),
                        width: z.number().int().optional(),
                        height: z.number().int().optional(),
                        options: z.record(z.string(), z.any()).optional(),
                        data: z
                          .object({
                            type: z.string().optional(),
                            url: z.string().optional(),
                            server: z.string().optional(),
                            filetype: z.string().optional(),
                            children: z.array(z.any()).optional(),
                            tilesetInfo: z
                              .record(z.string(), z.any())
                              .optional(),
                            tiles: z.record(z.string(), z.any()).optional(),
                          })
                          .optional(),
                        chromInfoPath: z.string().optional(),
                        fromViewUid: z.string().optional(),
                        x: z.number().optional(),
                        y: z.number().optional(),
                      }),
                      z.object({
                        type: z.literal('combined'),
                        uid: z.string().optional(),
                        width: z.number().int().optional(),
                        height: z.number().int().optional(),
                        options: z.record(z.string(), z.any()).optional(),
                        contents: z.array(
                          z.union([
                            z.object({
                              tilesetUid: z.string().optional(),
                              server: z.string().optional(),
                              type: z.union([
                                z.enum([
                                  'viewport-projection-center',
                                  'viewport-projection-vertical',
                                  'viewport-projection-horizontal',
                                ]),
                                z.enum([
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
                                ]),
                              ]),
                              uid: z.string().optional(),
                              width: z.number().int().optional(),
                              height: z.number().int().optional(),
                              options: z.record(z.string(), z.any()).optional(),
                              data: z
                                .object({
                                  type: z.string().optional(),
                                  url: z.string().optional(),
                                  server: z.string().optional(),
                                  filetype: z.string().optional(),
                                  children: z.array(z.any()).optional(),
                                  tilesetInfo: z
                                    .record(z.string(), z.any())
                                    .optional(),
                                  tiles: z
                                    .record(z.string(), z.any())
                                    .optional(),
                                })
                                .optional(),
                              chromInfoPath: z.string().optional(),
                              fromViewUid: z.string().optional(),
                              x: z.number().optional(),
                              y: z.number().optional(),
                            }),
                            z.any(),
                            z.object({
                              tilesetUid: z.string().optional(),
                              server: z.string().optional(),
                              type: z.literal('heatmap'),
                              uid: z.string().optional(),
                              width: z.number().int().optional(),
                              height: z.number().int().optional(),
                              options: z.record(z.string(), z.any()).optional(),
                              data: z
                                .object({
                                  type: z.string().optional(),
                                  url: z.string().optional(),
                                  server: z.string().optional(),
                                  filetype: z.string().optional(),
                                  children: z.array(z.any()).optional(),
                                  tilesetInfo: z
                                    .record(z.string(), z.any())
                                    .optional(),
                                  tiles: z
                                    .record(z.string(), z.any())
                                    .optional(),
                                })
                                .optional(),
                              position: z.string().optional(),
                              transforms: z.array(z.any()).optional(),
                            }),
                            z.object({
                              type: z.enum([
                                'viewport-projection-center',
                                'viewport-projection-vertical',
                                'viewport-projection-horizontal',
                              ]),
                              uid: z.string().optional(),
                              width: z.number().int().optional(),
                              height: z.number().int().optional(),
                              options: z.record(z.string(), z.any()).optional(),
                              fromViewUid: z.null().optional(),
                              projectionXDomain: z
                                .array(z.any())
                                .min(2)
                                .max(2)
                                .optional(),
                              projectionYDomain: z
                                .array(z.any())
                                .min(2)
                                .max(2)
                                .optional(),
                              transforms: z.array(z.any()).optional(),
                              x: z.number().optional(),
                              y: z.number().optional(),
                            }),
                            z
                              .object({
                                type: z.string(),
                                uid: z.string().optional(),
                                width: z.number().int().optional(),
                                height: z.number().int().optional(),
                                options: z
                                  .record(z.string(), z.any())
                                  .optional(),
                              })
                              .catchall(z.any()),
                          ]),
                        ),
                        position: z.string().optional(),
                      }),
                      z.object({
                        tilesetUid: z.string().optional(),
                        server: z.string().optional(),
                        type: z.literal('heatmap'),
                        uid: z.string().optional(),
                        width: z.number().int().optional(),
                        height: z.number().int().optional(),
                        options: z.record(z.string(), z.any()).optional(),
                        data: z
                          .object({
                            type: z.string().optional(),
                            url: z.string().optional(),
                            server: z.string().optional(),
                            filetype: z.string().optional(),
                            children: z.array(z.any()).optional(),
                            tilesetInfo: z
                              .record(z.string(), z.any())
                              .optional(),
                            tiles: z.record(z.string(), z.any()).optional(),
                          })
                          .optional(),
                        position: z.string().optional(),
                        transforms: z.array(z.any()).optional(),
                      }),
                      z.object({
                        type: z.enum([
                          'viewport-projection-center',
                          'viewport-projection-vertical',
                          'viewport-projection-horizontal',
                        ]),
                        uid: z.string().optional(),
                        width: z.number().int().optional(),
                        height: z.number().int().optional(),
                        options: z.record(z.string(), z.any()).optional(),
                        fromViewUid: z.null().optional(),
                        projectionXDomain: z
                          .array(z.any())
                          .min(2)
                          .max(2)
                          .optional(),
                        projectionYDomain: z
                          .array(z.any())
                          .min(2)
                          .max(2)
                          .optional(),
                        transforms: z.array(z.any()).optional(),
                        x: z.number().optional(),
                        y: z.number().optional(),
                      }),
                      z
                        .object({
                          type: z.string(),
                          uid: z.string().optional(),
                          width: z.number().int().optional(),
                          height: z.number().int().optional(),
                          options: z.record(z.string(), z.any()).optional(),
                        })
                        .catchall(z.any()),
                    ]),
                  )
                  .optional(),
                top: z
                  .array(
                    z.union([
                      z.object({
                        tilesetUid: z.string().optional(),
                        server: z.string().optional(),
                        type: z.union([
                          z.enum([
                            'viewport-projection-center',
                            'viewport-projection-vertical',
                            'viewport-projection-horizontal',
                          ]),
                          z.enum([
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
                          ]),
                        ]),
                        uid: z.string().optional(),
                        width: z.number().int().optional(),
                        height: z.number().int().optional(),
                        options: z.record(z.string(), z.any()).optional(),
                        data: z
                          .object({
                            type: z.string().optional(),
                            url: z.string().optional(),
                            server: z.string().optional(),
                            filetype: z.string().optional(),
                            children: z.array(z.any()).optional(),
                            tilesetInfo: z
                              .record(z.string(), z.any())
                              .optional(),
                            tiles: z.record(z.string(), z.any()).optional(),
                          })
                          .optional(),
                        chromInfoPath: z.string().optional(),
                        fromViewUid: z.string().optional(),
                        x: z.number().optional(),
                        y: z.number().optional(),
                      }),
                      z.object({
                        type: z.literal('combined'),
                        uid: z.string().optional(),
                        width: z.number().int().optional(),
                        height: z.number().int().optional(),
                        options: z.record(z.string(), z.any()).optional(),
                        contents: z.array(
                          z.union([
                            z.object({
                              tilesetUid: z.string().optional(),
                              server: z.string().optional(),
                              type: z.union([
                                z.enum([
                                  'viewport-projection-center',
                                  'viewport-projection-vertical',
                                  'viewport-projection-horizontal',
                                ]),
                                z.enum([
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
                                ]),
                              ]),
                              uid: z.string().optional(),
                              width: z.number().int().optional(),
                              height: z.number().int().optional(),
                              options: z.record(z.string(), z.any()).optional(),
                              data: z
                                .object({
                                  type: z.string().optional(),
                                  url: z.string().optional(),
                                  server: z.string().optional(),
                                  filetype: z.string().optional(),
                                  children: z.array(z.any()).optional(),
                                  tilesetInfo: z
                                    .record(z.string(), z.any())
                                    .optional(),
                                  tiles: z
                                    .record(z.string(), z.any())
                                    .optional(),
                                })
                                .optional(),
                              chromInfoPath: z.string().optional(),
                              fromViewUid: z.string().optional(),
                              x: z.number().optional(),
                              y: z.number().optional(),
                            }),
                            z.any(),
                            z.object({
                              tilesetUid: z.string().optional(),
                              server: z.string().optional(),
                              type: z.literal('heatmap'),
                              uid: z.string().optional(),
                              width: z.number().int().optional(),
                              height: z.number().int().optional(),
                              options: z.record(z.string(), z.any()).optional(),
                              data: z
                                .object({
                                  type: z.string().optional(),
                                  url: z.string().optional(),
                                  server: z.string().optional(),
                                  filetype: z.string().optional(),
                                  children: z.array(z.any()).optional(),
                                  tilesetInfo: z
                                    .record(z.string(), z.any())
                                    .optional(),
                                  tiles: z
                                    .record(z.string(), z.any())
                                    .optional(),
                                })
                                .optional(),
                              position: z.string().optional(),
                              transforms: z.array(z.any()).optional(),
                            }),
                            z.object({
                              type: z.enum([
                                'viewport-projection-center',
                                'viewport-projection-vertical',
                                'viewport-projection-horizontal',
                              ]),
                              uid: z.string().optional(),
                              width: z.number().int().optional(),
                              height: z.number().int().optional(),
                              options: z.record(z.string(), z.any()).optional(),
                              fromViewUid: z.null().optional(),
                              projectionXDomain: z
                                .array(z.any())
                                .min(2)
                                .max(2)
                                .optional(),
                              projectionYDomain: z
                                .array(z.any())
                                .min(2)
                                .max(2)
                                .optional(),
                              transforms: z.array(z.any()).optional(),
                              x: z.number().optional(),
                              y: z.number().optional(),
                            }),
                            z
                              .object({
                                type: z.string(),
                                uid: z.string().optional(),
                                width: z.number().int().optional(),
                                height: z.number().int().optional(),
                                options: z
                                  .record(z.string(), z.any())
                                  .optional(),
                              })
                              .catchall(z.any()),
                          ]),
                        ),
                        position: z.string().optional(),
                      }),
                      z.object({
                        tilesetUid: z.string().optional(),
                        server: z.string().optional(),
                        type: z.literal('heatmap'),
                        uid: z.string().optional(),
                        width: z.number().int().optional(),
                        height: z.number().int().optional(),
                        options: z.record(z.string(), z.any()).optional(),
                        data: z
                          .object({
                            type: z.string().optional(),
                            url: z.string().optional(),
                            server: z.string().optional(),
                            filetype: z.string().optional(),
                            children: z.array(z.any()).optional(),
                            tilesetInfo: z
                              .record(z.string(), z.any())
                              .optional(),
                            tiles: z.record(z.string(), z.any()).optional(),
                          })
                          .optional(),
                        position: z.string().optional(),
                        transforms: z.array(z.any()).optional(),
                      }),
                      z.object({
                        type: z.enum([
                          'viewport-projection-center',
                          'viewport-projection-vertical',
                          'viewport-projection-horizontal',
                        ]),
                        uid: z.string().optional(),
                        width: z.number().int().optional(),
                        height: z.number().int().optional(),
                        options: z.record(z.string(), z.any()).optional(),
                        fromViewUid: z.null().optional(),
                        projectionXDomain: z
                          .array(z.any())
                          .min(2)
                          .max(2)
                          .optional(),
                        projectionYDomain: z
                          .array(z.any())
                          .min(2)
                          .max(2)
                          .optional(),
                        transforms: z.array(z.any()).optional(),
                        x: z.number().optional(),
                        y: z.number().optional(),
                      }),
                      z
                        .object({
                          type: z.string(),
                          uid: z.string().optional(),
                          width: z.number().int().optional(),
                          height: z.number().int().optional(),
                          options: z.record(z.string(), z.any()).optional(),
                        })
                        .catchall(z.any()),
                    ]),
                  )
                  .optional(),
                bottom: z
                  .array(
                    z.union([
                      z.object({
                        tilesetUid: z.string().optional(),
                        server: z.string().optional(),
                        type: z.union([
                          z.enum([
                            'viewport-projection-center',
                            'viewport-projection-vertical',
                            'viewport-projection-horizontal',
                          ]),
                          z.enum([
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
                          ]),
                        ]),
                        uid: z.string().optional(),
                        width: z.number().int().optional(),
                        height: z.number().int().optional(),
                        options: z.record(z.string(), z.any()).optional(),
                        data: z
                          .object({
                            type: z.string().optional(),
                            url: z.string().optional(),
                            server: z.string().optional(),
                            filetype: z.string().optional(),
                            children: z.array(z.any()).optional(),
                            tilesetInfo: z
                              .record(z.string(), z.any())
                              .optional(),
                            tiles: z.record(z.string(), z.any()).optional(),
                          })
                          .optional(),
                        chromInfoPath: z.string().optional(),
                        fromViewUid: z.string().optional(),
                        x: z.number().optional(),
                        y: z.number().optional(),
                      }),
                      z.object({
                        type: z.literal('combined'),
                        uid: z.string().optional(),
                        width: z.number().int().optional(),
                        height: z.number().int().optional(),
                        options: z.record(z.string(), z.any()).optional(),
                        contents: z.array(
                          z.union([
                            z.object({
                              tilesetUid: z.string().optional(),
                              server: z.string().optional(),
                              type: z.union([
                                z.enum([
                                  'viewport-projection-center',
                                  'viewport-projection-vertical',
                                  'viewport-projection-horizontal',
                                ]),
                                z.enum([
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
                                ]),
                              ]),
                              uid: z.string().optional(),
                              width: z.number().int().optional(),
                              height: z.number().int().optional(),
                              options: z.record(z.string(), z.any()).optional(),
                              data: z
                                .object({
                                  type: z.string().optional(),
                                  url: z.string().optional(),
                                  server: z.string().optional(),
                                  filetype: z.string().optional(),
                                  children: z.array(z.any()).optional(),
                                  tilesetInfo: z
                                    .record(z.string(), z.any())
                                    .optional(),
                                  tiles: z
                                    .record(z.string(), z.any())
                                    .optional(),
                                })
                                .optional(),
                              chromInfoPath: z.string().optional(),
                              fromViewUid: z.string().optional(),
                              x: z.number().optional(),
                              y: z.number().optional(),
                            }),
                            z.any(),
                            z.object({
                              tilesetUid: z.string().optional(),
                              server: z.string().optional(),
                              type: z.literal('heatmap'),
                              uid: z.string().optional(),
                              width: z.number().int().optional(),
                              height: z.number().int().optional(),
                              options: z.record(z.string(), z.any()).optional(),
                              data: z
                                .object({
                                  type: z.string().optional(),
                                  url: z.string().optional(),
                                  server: z.string().optional(),
                                  filetype: z.string().optional(),
                                  children: z.array(z.any()).optional(),
                                  tilesetInfo: z
                                    .record(z.string(), z.any())
                                    .optional(),
                                  tiles: z
                                    .record(z.string(), z.any())
                                    .optional(),
                                })
                                .optional(),
                              position: z.string().optional(),
                              transforms: z.array(z.any()).optional(),
                            }),
                            z.object({
                              type: z.enum([
                                'viewport-projection-center',
                                'viewport-projection-vertical',
                                'viewport-projection-horizontal',
                              ]),
                              uid: z.string().optional(),
                              width: z.number().int().optional(),
                              height: z.number().int().optional(),
                              options: z.record(z.string(), z.any()).optional(),
                              fromViewUid: z.null().optional(),
                              projectionXDomain: z
                                .array(z.any())
                                .min(2)
                                .max(2)
                                .optional(),
                              projectionYDomain: z
                                .array(z.any())
                                .min(2)
                                .max(2)
                                .optional(),
                              transforms: z.array(z.any()).optional(),
                              x: z.number().optional(),
                              y: z.number().optional(),
                            }),
                            z
                              .object({
                                type: z.string(),
                                uid: z.string().optional(),
                                width: z.number().int().optional(),
                                height: z.number().int().optional(),
                                options: z
                                  .record(z.string(), z.any())
                                  .optional(),
                              })
                              .catchall(z.any()),
                          ]),
                        ),
                        position: z.string().optional(),
                      }),
                      z.object({
                        tilesetUid: z.string().optional(),
                        server: z.string().optional(),
                        type: z.literal('heatmap'),
                        uid: z.string().optional(),
                        width: z.number().int().optional(),
                        height: z.number().int().optional(),
                        options: z.record(z.string(), z.any()).optional(),
                        data: z
                          .object({
                            type: z.string().optional(),
                            url: z.string().optional(),
                            server: z.string().optional(),
                            filetype: z.string().optional(),
                            children: z.array(z.any()).optional(),
                            tilesetInfo: z
                              .record(z.string(), z.any())
                              .optional(),
                            tiles: z.record(z.string(), z.any()).optional(),
                          })
                          .optional(),
                        position: z.string().optional(),
                        transforms: z.array(z.any()).optional(),
                      }),
                      z.object({
                        type: z.enum([
                          'viewport-projection-center',
                          'viewport-projection-vertical',
                          'viewport-projection-horizontal',
                        ]),
                        uid: z.string().optional(),
                        width: z.number().int().optional(),
                        height: z.number().int().optional(),
                        options: z.record(z.string(), z.any()).optional(),
                        fromViewUid: z.null().optional(),
                        projectionXDomain: z
                          .array(z.any())
                          .min(2)
                          .max(2)
                          .optional(),
                        projectionYDomain: z
                          .array(z.any())
                          .min(2)
                          .max(2)
                          .optional(),
                        transforms: z.array(z.any()).optional(),
                        x: z.number().optional(),
                        y: z.number().optional(),
                      }),
                      z
                        .object({
                          type: z.string(),
                          uid: z.string().optional(),
                          width: z.number().int().optional(),
                          height: z.number().int().optional(),
                          options: z.record(z.string(), z.any()).optional(),
                        })
                        .catchall(z.any()),
                    ]),
                  )
                  .optional(),
                center: z
                  .array(
                    z.union([
                      z.object({
                        tilesetUid: z.string().optional(),
                        server: z.string().optional(),
                        type: z.union([
                          z.enum([
                            'viewport-projection-center',
                            'viewport-projection-vertical',
                            'viewport-projection-horizontal',
                          ]),
                          z.enum([
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
                          ]),
                        ]),
                        uid: z.string().optional(),
                        width: z.number().int().optional(),
                        height: z.number().int().optional(),
                        options: z.record(z.string(), z.any()).optional(),
                        data: z
                          .object({
                            type: z.string().optional(),
                            url: z.string().optional(),
                            server: z.string().optional(),
                            filetype: z.string().optional(),
                            children: z.array(z.any()).optional(),
                            tilesetInfo: z
                              .record(z.string(), z.any())
                              .optional(),
                            tiles: z.record(z.string(), z.any()).optional(),
                          })
                          .optional(),
                        chromInfoPath: z.string().optional(),
                        fromViewUid: z.string().optional(),
                        x: z.number().optional(),
                        y: z.number().optional(),
                      }),
                      z.object({
                        type: z.literal('combined'),
                        uid: z.string().optional(),
                        width: z.number().int().optional(),
                        height: z.number().int().optional(),
                        options: z.record(z.string(), z.any()).optional(),
                        contents: z.array(
                          z.union([
                            z.object({
                              tilesetUid: z.string().optional(),
                              server: z.string().optional(),
                              type: z.union([
                                z.enum([
                                  'viewport-projection-center',
                                  'viewport-projection-vertical',
                                  'viewport-projection-horizontal',
                                ]),
                                z.enum([
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
                                ]),
                              ]),
                              uid: z.string().optional(),
                              width: z.number().int().optional(),
                              height: z.number().int().optional(),
                              options: z.record(z.string(), z.any()).optional(),
                              data: z
                                .object({
                                  type: z.string().optional(),
                                  url: z.string().optional(),
                                  server: z.string().optional(),
                                  filetype: z.string().optional(),
                                  children: z.array(z.any()).optional(),
                                  tilesetInfo: z
                                    .record(z.string(), z.any())
                                    .optional(),
                                  tiles: z
                                    .record(z.string(), z.any())
                                    .optional(),
                                })
                                .optional(),
                              chromInfoPath: z.string().optional(),
                              fromViewUid: z.string().optional(),
                              x: z.number().optional(),
                              y: z.number().optional(),
                            }),
                            z.any(),
                            z.object({
                              tilesetUid: z.string().optional(),
                              server: z.string().optional(),
                              type: z.literal('heatmap'),
                              uid: z.string().optional(),
                              width: z.number().int().optional(),
                              height: z.number().int().optional(),
                              options: z.record(z.string(), z.any()).optional(),
                              data: z
                                .object({
                                  type: z.string().optional(),
                                  url: z.string().optional(),
                                  server: z.string().optional(),
                                  filetype: z.string().optional(),
                                  children: z.array(z.any()).optional(),
                                  tilesetInfo: z
                                    .record(z.string(), z.any())
                                    .optional(),
                                  tiles: z
                                    .record(z.string(), z.any())
                                    .optional(),
                                })
                                .optional(),
                              position: z.string().optional(),
                              transforms: z.array(z.any()).optional(),
                            }),
                            z.object({
                              type: z.enum([
                                'viewport-projection-center',
                                'viewport-projection-vertical',
                                'viewport-projection-horizontal',
                              ]),
                              uid: z.string().optional(),
                              width: z.number().int().optional(),
                              height: z.number().int().optional(),
                              options: z.record(z.string(), z.any()).optional(),
                              fromViewUid: z.null().optional(),
                              projectionXDomain: z
                                .array(z.any())
                                .min(2)
                                .max(2)
                                .optional(),
                              projectionYDomain: z
                                .array(z.any())
                                .min(2)
                                .max(2)
                                .optional(),
                              transforms: z.array(z.any()).optional(),
                              x: z.number().optional(),
                              y: z.number().optional(),
                            }),
                            z
                              .object({
                                type: z.string(),
                                uid: z.string().optional(),
                                width: z.number().int().optional(),
                                height: z.number().int().optional(),
                                options: z
                                  .record(z.string(), z.any())
                                  .optional(),
                              })
                              .catchall(z.any()),
                          ]),
                        ),
                        position: z.string().optional(),
                      }),
                      z.object({
                        tilesetUid: z.string().optional(),
                        server: z.string().optional(),
                        type: z.literal('heatmap'),
                        uid: z.string().optional(),
                        width: z.number().int().optional(),
                        height: z.number().int().optional(),
                        options: z.record(z.string(), z.any()).optional(),
                        data: z
                          .object({
                            type: z.string().optional(),
                            url: z.string().optional(),
                            server: z.string().optional(),
                            filetype: z.string().optional(),
                            children: z.array(z.any()).optional(),
                            tilesetInfo: z
                              .record(z.string(), z.any())
                              .optional(),
                            tiles: z.record(z.string(), z.any()).optional(),
                          })
                          .optional(),
                        position: z.string().optional(),
                        transforms: z.array(z.any()).optional(),
                      }),
                      z.object({
                        type: z.enum([
                          'viewport-projection-center',
                          'viewport-projection-vertical',
                          'viewport-projection-horizontal',
                        ]),
                        uid: z.string().optional(),
                        width: z.number().int().optional(),
                        height: z.number().int().optional(),
                        options: z.record(z.string(), z.any()).optional(),
                        fromViewUid: z.null().optional(),
                        projectionXDomain: z
                          .array(z.any())
                          .min(2)
                          .max(2)
                          .optional(),
                        projectionYDomain: z
                          .array(z.any())
                          .min(2)
                          .max(2)
                          .optional(),
                        transforms: z.array(z.any()).optional(),
                        x: z.number().optional(),
                        y: z.number().optional(),
                      }),
                      z
                        .object({
                          type: z.string(),
                          uid: z.string().optional(),
                          width: z.number().int().optional(),
                          height: z.number().int().optional(),
                          options: z.record(z.string(), z.any()).optional(),
                        })
                        .catchall(z.any()),
                    ]),
                  )
                  .optional(),
                whole: z
                  .array(
                    z.union([
                      z.object({
                        tilesetUid: z.string().optional(),
                        server: z.string().optional(),
                        type: z.union([
                          z.enum([
                            'viewport-projection-center',
                            'viewport-projection-vertical',
                            'viewport-projection-horizontal',
                          ]),
                          z.enum([
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
                          ]),
                        ]),
                        uid: z.string().optional(),
                        width: z.number().int().optional(),
                        height: z.number().int().optional(),
                        options: z.record(z.string(), z.any()).optional(),
                        data: z
                          .object({
                            type: z.string().optional(),
                            url: z.string().optional(),
                            server: z.string().optional(),
                            filetype: z.string().optional(),
                            children: z.array(z.any()).optional(),
                            tilesetInfo: z
                              .record(z.string(), z.any())
                              .optional(),
                            tiles: z.record(z.string(), z.any()).optional(),
                          })
                          .optional(),
                        chromInfoPath: z.string().optional(),
                        fromViewUid: z.string().optional(),
                        x: z.number().optional(),
                        y: z.number().optional(),
                      }),
                      z.object({
                        type: z.literal('combined'),
                        uid: z.string().optional(),
                        width: z.number().int().optional(),
                        height: z.number().int().optional(),
                        options: z.record(z.string(), z.any()).optional(),
                        contents: z.array(
                          z.union([
                            z.object({
                              tilesetUid: z.string().optional(),
                              server: z.string().optional(),
                              type: z.union([
                                z.enum([
                                  'viewport-projection-center',
                                  'viewport-projection-vertical',
                                  'viewport-projection-horizontal',
                                ]),
                                z.enum([
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
                                ]),
                              ]),
                              uid: z.string().optional(),
                              width: z.number().int().optional(),
                              height: z.number().int().optional(),
                              options: z.record(z.string(), z.any()).optional(),
                              data: z
                                .object({
                                  type: z.string().optional(),
                                  url: z.string().optional(),
                                  server: z.string().optional(),
                                  filetype: z.string().optional(),
                                  children: z.array(z.any()).optional(),
                                  tilesetInfo: z
                                    .record(z.string(), z.any())
                                    .optional(),
                                  tiles: z
                                    .record(z.string(), z.any())
                                    .optional(),
                                })
                                .optional(),
                              chromInfoPath: z.string().optional(),
                              fromViewUid: z.string().optional(),
                              x: z.number().optional(),
                              y: z.number().optional(),
                            }),
                            z.any(),
                            z.object({
                              tilesetUid: z.string().optional(),
                              server: z.string().optional(),
                              type: z.literal('heatmap'),
                              uid: z.string().optional(),
                              width: z.number().int().optional(),
                              height: z.number().int().optional(),
                              options: z.record(z.string(), z.any()).optional(),
                              data: z
                                .object({
                                  type: z.string().optional(),
                                  url: z.string().optional(),
                                  server: z.string().optional(),
                                  filetype: z.string().optional(),
                                  children: z.array(z.any()).optional(),
                                  tilesetInfo: z
                                    .record(z.string(), z.any())
                                    .optional(),
                                  tiles: z
                                    .record(z.string(), z.any())
                                    .optional(),
                                })
                                .optional(),
                              position: z.string().optional(),
                              transforms: z.array(z.any()).optional(),
                            }),
                            z.object({
                              type: z.enum([
                                'viewport-projection-center',
                                'viewport-projection-vertical',
                                'viewport-projection-horizontal',
                              ]),
                              uid: z.string().optional(),
                              width: z.number().int().optional(),
                              height: z.number().int().optional(),
                              options: z.record(z.string(), z.any()).optional(),
                              fromViewUid: z.null().optional(),
                              projectionXDomain: z
                                .array(z.any())
                                .min(2)
                                .max(2)
                                .optional(),
                              projectionYDomain: z
                                .array(z.any())
                                .min(2)
                                .max(2)
                                .optional(),
                              transforms: z.array(z.any()).optional(),
                              x: z.number().optional(),
                              y: z.number().optional(),
                            }),
                            z
                              .object({
                                type: z.string(),
                                uid: z.string().optional(),
                                width: z.number().int().optional(),
                                height: z.number().int().optional(),
                                options: z
                                  .record(z.string(), z.any())
                                  .optional(),
                              })
                              .catchall(z.any()),
                          ]),
                        ),
                        position: z.string().optional(),
                      }),
                      z.object({
                        tilesetUid: z.string().optional(),
                        server: z.string().optional(),
                        type: z.literal('heatmap'),
                        uid: z.string().optional(),
                        width: z.number().int().optional(),
                        height: z.number().int().optional(),
                        options: z.record(z.string(), z.any()).optional(),
                        data: z
                          .object({
                            type: z.string().optional(),
                            url: z.string().optional(),
                            server: z.string().optional(),
                            filetype: z.string().optional(),
                            children: z.array(z.any()).optional(),
                            tilesetInfo: z
                              .record(z.string(), z.any())
                              .optional(),
                            tiles: z.record(z.string(), z.any()).optional(),
                          })
                          .optional(),
                        position: z.string().optional(),
                        transforms: z.array(z.any()).optional(),
                      }),
                      z.object({
                        type: z.enum([
                          'viewport-projection-center',
                          'viewport-projection-vertical',
                          'viewport-projection-horizontal',
                        ]),
                        uid: z.string().optional(),
                        width: z.number().int().optional(),
                        height: z.number().int().optional(),
                        options: z.record(z.string(), z.any()).optional(),
                        fromViewUid: z.null().optional(),
                        projectionXDomain: z
                          .array(z.any())
                          .min(2)
                          .max(2)
                          .optional(),
                        projectionYDomain: z
                          .array(z.any())
                          .min(2)
                          .max(2)
                          .optional(),
                        transforms: z.array(z.any()).optional(),
                        x: z.number().optional(),
                        y: z.number().optional(),
                      }),
                      z
                        .object({
                          type: z.string(),
                          uid: z.string().optional(),
                          width: z.number().int().optional(),
                          height: z.number().int().optional(),
                          options: z.record(z.string(), z.any()).optional(),
                        })
                        .catchall(z.any()),
                    ]),
                  )
                  .optional(),
                gallery: z
                  .array(
                    z.union([
                      z.object({
                        tilesetUid: z.string().optional(),
                        server: z.string().optional(),
                        type: z.union([
                          z.enum([
                            'viewport-projection-center',
                            'viewport-projection-vertical',
                            'viewport-projection-horizontal',
                          ]),
                          z.enum([
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
                          ]),
                        ]),
                        uid: z.string().optional(),
                        width: z.number().int().optional(),
                        height: z.number().int().optional(),
                        options: z.record(z.string(), z.any()).optional(),
                        data: z
                          .object({
                            type: z.string().optional(),
                            url: z.string().optional(),
                            server: z.string().optional(),
                            filetype: z.string().optional(),
                            children: z.array(z.any()).optional(),
                            tilesetInfo: z
                              .record(z.string(), z.any())
                              .optional(),
                            tiles: z.record(z.string(), z.any()).optional(),
                          })
                          .optional(),
                        chromInfoPath: z.string().optional(),
                        fromViewUid: z.string().optional(),
                        x: z.number().optional(),
                        y: z.number().optional(),
                      }),
                      z.object({
                        type: z.literal('combined'),
                        uid: z.string().optional(),
                        width: z.number().int().optional(),
                        height: z.number().int().optional(),
                        options: z.record(z.string(), z.any()).optional(),
                        contents: z.array(
                          z.union([
                            z.object({
                              tilesetUid: z.string().optional(),
                              server: z.string().optional(),
                              type: z.union([
                                z.enum([
                                  'viewport-projection-center',
                                  'viewport-projection-vertical',
                                  'viewport-projection-horizontal',
                                ]),
                                z.enum([
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
                                ]),
                              ]),
                              uid: z.string().optional(),
                              width: z.number().int().optional(),
                              height: z.number().int().optional(),
                              options: z.record(z.string(), z.any()).optional(),
                              data: z
                                .object({
                                  type: z.string().optional(),
                                  url: z.string().optional(),
                                  server: z.string().optional(),
                                  filetype: z.string().optional(),
                                  children: z.array(z.any()).optional(),
                                  tilesetInfo: z
                                    .record(z.string(), z.any())
                                    .optional(),
                                  tiles: z
                                    .record(z.string(), z.any())
                                    .optional(),
                                })
                                .optional(),
                              chromInfoPath: z.string().optional(),
                              fromViewUid: z.string().optional(),
                              x: z.number().optional(),
                              y: z.number().optional(),
                            }),
                            z.any(),
                            z.object({
                              tilesetUid: z.string().optional(),
                              server: z.string().optional(),
                              type: z.literal('heatmap'),
                              uid: z.string().optional(),
                              width: z.number().int().optional(),
                              height: z.number().int().optional(),
                              options: z.record(z.string(), z.any()).optional(),
                              data: z
                                .object({
                                  type: z.string().optional(),
                                  url: z.string().optional(),
                                  server: z.string().optional(),
                                  filetype: z.string().optional(),
                                  children: z.array(z.any()).optional(),
                                  tilesetInfo: z
                                    .record(z.string(), z.any())
                                    .optional(),
                                  tiles: z
                                    .record(z.string(), z.any())
                                    .optional(),
                                })
                                .optional(),
                              position: z.string().optional(),
                              transforms: z.array(z.any()).optional(),
                            }),
                            z.object({
                              type: z.enum([
                                'viewport-projection-center',
                                'viewport-projection-vertical',
                                'viewport-projection-horizontal',
                              ]),
                              uid: z.string().optional(),
                              width: z.number().int().optional(),
                              height: z.number().int().optional(),
                              options: z.record(z.string(), z.any()).optional(),
                              fromViewUid: z.null().optional(),
                              projectionXDomain: z
                                .array(z.any())
                                .min(2)
                                .max(2)
                                .optional(),
                              projectionYDomain: z
                                .array(z.any())
                                .min(2)
                                .max(2)
                                .optional(),
                              transforms: z.array(z.any()).optional(),
                              x: z.number().optional(),
                              y: z.number().optional(),
                            }),
                            z
                              .object({
                                type: z.string(),
                                uid: z.string().optional(),
                                width: z.number().int().optional(),
                                height: z.number().int().optional(),
                                options: z
                                  .record(z.string(), z.any())
                                  .optional(),
                              })
                              .catchall(z.any()),
                          ]),
                        ),
                        position: z.string().optional(),
                      }),
                      z.object({
                        tilesetUid: z.string().optional(),
                        server: z.string().optional(),
                        type: z.literal('heatmap'),
                        uid: z.string().optional(),
                        width: z.number().int().optional(),
                        height: z.number().int().optional(),
                        options: z.record(z.string(), z.any()).optional(),
                        data: z
                          .object({
                            type: z.string().optional(),
                            url: z.string().optional(),
                            server: z.string().optional(),
                            filetype: z.string().optional(),
                            children: z.array(z.any()).optional(),
                            tilesetInfo: z
                              .record(z.string(), z.any())
                              .optional(),
                            tiles: z.record(z.string(), z.any()).optional(),
                          })
                          .optional(),
                        position: z.string().optional(),
                        transforms: z.array(z.any()).optional(),
                      }),
                      z.object({
                        type: z.enum([
                          'viewport-projection-center',
                          'viewport-projection-vertical',
                          'viewport-projection-horizontal',
                        ]),
                        uid: z.string().optional(),
                        width: z.number().int().optional(),
                        height: z.number().int().optional(),
                        options: z.record(z.string(), z.any()).optional(),
                        fromViewUid: z.null().optional(),
                        projectionXDomain: z
                          .array(z.any())
                          .min(2)
                          .max(2)
                          .optional(),
                        projectionYDomain: z
                          .array(z.any())
                          .min(2)
                          .max(2)
                          .optional(),
                        transforms: z.array(z.any()).optional(),
                        x: z.number().optional(),
                        y: z.number().optional(),
                      }),
                      z
                        .object({
                          type: z.string(),
                          uid: z.string().optional(),
                          width: z.number().int().optional(),
                          height: z.number().int().optional(),
                          options: z.record(z.string(), z.any()).optional(),
                        })
                        .catchall(z.any()),
                    ]),
                  )
                  .optional(),
              })
              .describe('Track layout within a View.'),
            uid: z.string().optional(),
            autocompleteSource: z.string().optional(),
            chromInfoPath: z.string().optional(),
            genomePositionSearchBox: z
              .object({
                autocompleteServer: z
                  .string()
                  .describe('The Autocomplete Server URL')
                  .optional(),
                autocompleteId: z
                  .string()
                  .describe('The Autocomplete ID')
                  .optional(),
                chromInfoServer: z
                  .string()
                  .describe('The Chrominfo Server URL')
                  .optional(),
                chromInfoId: z
                  .string()
                  .describe('The Chromosome Info ID')
                  .optional(),
                visible: z.boolean().describe('The Visible Schema').optional(),
              })
              .describe('Locations to search within a View.')
              .optional(),
            genomePositionSearchBoxVisible: z.boolean().optional(),
            initialXDomain: z.array(z.any()).min(2).max(2).optional(),
            initialYDomain: z.array(z.any()).min(2).max(2).optional(),
            overlays: z
              .array(
                z.object({
                  type: z.string().optional(),
                  uid: z.string().optional(),
                  chromInfoPath: z.string().optional(),
                  includes: z.array(z.string()).optional(),
                  options: z
                    .object({
                      extent: z.array(z.array(z.number().int())).optional(),
                      minWidth: z.number().optional(),
                      fill: z.string().optional(),
                      fillOpacity: z.number().optional(),
                      stroke: z.string().optional(),
                      strokeOpacity: z.number().optional(),
                      strokeWidth: z.number().optional(),
                      strokePos: z
                        .union([z.string(), z.array(z.string())])
                        .optional(),
                      outline: z.string().optional(),
                      outlineOpacity: z.number().optional(),
                      outlineWidth: z.number().optional(),
                      outlinePos: z
                        .union([z.string(), z.array(z.string())])
                        .optional(),
                    })
                    .optional(),
                }),
              )
              .optional(),
            selectionView: z.boolean().optional(),
            zoomFixed: z.boolean().optional(),
            zoomLimits: z.array(z.any()).min(2).max(2).optional(),
          })
          .describe(
            'An arrangment of Tracks to display within a given Layout.',
          ),
      )
      .min(1)
      .optional(),
    zoomLocks: z
      .object({
        locksByViewUid: z.record(z.string(), z.string()).optional(),
        locksDict: z
          .record(
            z.string(),
            z
              .object({ uid: z.string().optional() })
              .catchall(z.tuple([z.number(), z.number(), z.number()])),
          )
          .optional(),
      })
      .strict()
      .optional(),
    locationLocks: z
      .object({
        locksByViewUid: z
          .record(
            z.string(),
            z.union([
              z.string(),
              z.object({
                x: z
                  .object({ axis: z.enum(['x', 'y']), lock: z.string() })
                  .optional(),
                y: z
                  .object({ axis: z.enum(['x', 'y']), lock: z.string() })
                  .optional(),
              }),
            ]),
          )
          .optional(),
        locksDict: z
          .record(
            z.string(),
            z
              .object({ uid: z.string().optional() })
              .catchall(z.tuple([z.number(), z.number(), z.number()])),
          )
          .optional(),
      })
      .optional(),
    valueScaleLocks: z
      .object({
        locksByViewUid: z.record(z.string(), z.string()).optional(),
        locksDict: z
          .record(
            z.string(),
            z
              .object({
                uid: z.string().optional(),
                ignoreOffScreenValues: z.boolean().optional(),
              })
              .catchall(z.object({ view: z.string(), track: z.string() })),
          )
          .optional(),
      })
      .strict()
      .optional(),
    chromInfoPath: z.string().optional(),
  })
  .strict()
  .describe('Root object describing a HiGlass visualization.');

