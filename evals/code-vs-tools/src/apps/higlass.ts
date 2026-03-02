import {
  higlassViewConfigSchema,
  type HiGlassViewConfig,
} from './higlass-schema.js';
import { createHiglassMockTools } from './higlass-mock-tools.js';
import type { TestApp } from '../types.js';

// ============================================================================
// Starting State
// ============================================================================

/**
 * Default HiGlass view config matching the demo's HIGLASS_DEFAULT_VIEW_CONFIG.
 * All test cases start from this state. It includes:
 * - 2 track source servers (higlass.io + resgen.io paper-data)
 * - 1 view with hg19 gene annotations, chromosome labels, and a center heatmap
 */
function defaultState(): HiGlassViewConfig {
  return higlassViewConfigSchema.parse({
    editable: true,
    zoomFixed: false,
    trackSourceServers: [
      'https://higlass.io/api/v1',
      'https://resgen.io/api/v1/gt/paper-data',
    ],
    exportViewUrl: '/api/v1/viewconfs',
    views: [
      {
        initialXDomain: [0, 3100000000],
        genomePositionSearchBox: {
          autocompleteServer: 'https://higlass.io/api/v1',
          autocompleteId: 'OHJakQICQD6gTD7skx4EWA',
          chromInfoServer: 'https://higlass.io/api/v1',
          chromInfoId: 'hg19',
          visible: true,
        },
        chromInfoPath:
          'https://s3.amazonaws.com/pkerp/data/hg19/chromSizes.tsv',
        tracks: {
          top: [
            {
              type: 'horizontal-gene-annotations',
              height: 60,
              tilesetUid: 'OHJakQICQD6gTD7skx4EWA',
              server: 'https://higlass.io/api/v1',
              position: 'top',
              name: 'Gene Annotations (hg19)',
              options: { name: 'Gene Annotations (hg19)' },
              maxWidth: 4294967296,
              maxZoom: 22,
            },
            {
              chromInfoPath:
                'https://s3.amazonaws.com/pkerp/data/hg19/chromSizes.tsv',
              type: 'horizontal-chromosome-labels',
              position: 'top',
              name: 'Chromosome Labels (hg19)',
              height: 30,
              options: {},
            },
          ],
          left: [
            {
              chromInfoPath:
                'https://s3.amazonaws.com/pkerp/data/hg19/chromSizes.tsv',
              type: 'vertical-chromosome-labels',
              position: 'left',
              name: 'Chromosome Labels (hg19)',
              width: 30,
              options: {},
            },
          ],
          center: [
            {
              type: 'combined',
              height: 200,
              contents: [
                {
                  server: 'https://higlass.io/api/v1',
                  tilesetUid: 'CQMd6V_cRw6iCI_-Unl3PQ',
                  type: 'heatmap',
                  position: 'center',
                  options: {
                    maxZoom: null,
                    labelPosition: 'bottomRight',
                    name: 'Rao et al. (2014) GM12878 MboI (allreps) 1kb',
                  },
                  name: 'Rao et al. (2014) GM12878 MboI (allreps) 1kb',
                  maxWidth: 4194304000,
                  binsPerDimension: 256,
                  maxZoom: 14,
                },
              ],
              position: 'center',
              options: {},
            },
          ],
          right: [],
          bottom: [],
        },
        layout: { w: 12, h: 12, x: 0, y: 0 },
      },
    ],
    zoomLocks: { locksByViewUid: {}, locksDict: {} },
    locationLocks: { locksByViewUid: {}, locksDict: {} },
  });
}

// ============================================================================
// Test Cases
// ============================================================================

export const higlassApp: TestApp = {
  name: 'higlass',
  description:
    'HiGlass genomic data visualization with views, tracks, and multi-assembly support',
  schema: higlassViewConfigSchema,
  ignoreFields: ['uid'],
  extraTools: createHiglassMockTools(),
  cases: [
    // ─── TC1: Naish 2021 - Arabidopsis Centromere ────────────────────
    {
      id: 'build-arabidopsis-centromere',
      description:
        'Single view with an Arabidopsis sequence identity linear heatmap and chromosome labels',
      prompt:
        'I want to visualize the Arabidopsis thaliana chr5 centromere region. Search for the Arabidopsis identity mcool tileset and add it as a linear-heatmap track on top using a spectral color range (from purple to red: #5E4FA2, #3288BD, #66C2A5, #ABDDA4, #E6F598, #FEE08B, #FDAE61, #F46D43, #D53E4F, #9E0142) with linear heatmapValueScaling. Also search for and add Arabidopsis chromosome labels. Clear all existing tracks from the other positions (center, left). Navigate to the centromere region by setting initialXDomain to [112920414, 117329868].',
      initialState: defaultState(),
      goldenState: (() => {
        const s = structuredClone(defaultState());
        s.views[0]!.tracks = {
          top: [
            {
              type: 'linear-heatmap',
              tilesetUid: 'A6g97cgjSjColj25q-0lSw',
              server: 'https://resgen.io/api/v1',
              options: {
                colorRange: [
                  '#5E4FA2', '#3288BD', '#66C2A5', '#ABDDA4', '#E6F598',
                  '#FEE08B', '#FDAE61', '#F46D43', '#D53E4F', '#9E0142',
                ],
                heatmapValueScaling: 'linear',
              },
            },
            {
              type: 'chromosome-labels',
              tilesetUid: 'XkUMnJNkRDudN-mncWO17Q',
              server: 'https://resgen.io/api/v1',
            },
          ],
          center: [],
          left: [],
        };
        s.views[0]!.initialXDomain = [112920414, 117329868];
        return s;
      })(),
      goldenMinToolCalls: 5,
    },

    // ─── TC2: T2T-Nurk 2021 - Dual Heatmap ──────────────────────────
    {
      id: 'build-t2t-dual-heatmap',
      description:
        'Single view with T2T CHM13 gene annotations, chromosome labels, and a split center heatmap (strand + identity)',
      prompt:
        'Build a visualization of the T2T CHM13 genome. Search for the CHM13 gene annotations and chromosome labels tilesets and add them on top. In the center, create a combined track with two heatmaps overlaid: the CHM13 strand alignment heatmap in the lower-left extent using a pink/cyan color range (rgba(255,12,239,1) to rgba(46,202,248,1)) with log scaling, and the CHM13 identity heatmap in the upper-right extent using the spectral color range (#5E4FA2 through #9E0142) with log scaling. Clear the existing left tracks. Navigate to the chr9 centromeric satellite region with initialXDomain [1572847860, 1646965658] and initialYDomain [1587345758, 1630801516].',
      initialState: defaultState(),
      goldenState: (() => {
        const s = structuredClone(defaultState());
        s.views[0]!.tracks = {
          top: [
            {
              type: 'horizontal-gene-annotations',
              tilesetUid: 'V_bM34IGSlaMOGiYmZPCbw',
              server: 'https://resgen.io/api/v1',
            },
            {
              type: 'chromosome-labels',
              tilesetUid: 'P5Hodo9FS--bLAai7Ibjrg',
              server: 'https://resgen.io/api/v1',
            },
          ],
          center: [
            {
              type: 'combined',
              contents: [
                {
                  type: 'heatmap',
                  tilesetUid: 'dLD5vk5GSkmbRIJJGbB57w',
                  server: 'https://resgen.io/api/v1',
                  options: {
                    extent: 'lower-left',
                    colorRange: ['rgba(255,12,239,1)', 'rgba(46,202,248,1)'],
                    heatmapValueScaling: 'log',
                  },
                },
                {
                  type: 'heatmap',
                  tilesetUid: 'Ctwf1pNEQo-nwL_FHIGRvA',
                  server: 'https://resgen.io/api/v1',
                  options: {
                    extent: 'upper-right',
                    colorRange: [
                      '#5E4FA2', '#3288BD', '#66C2A5', '#ABDDA4', '#E6F598',
                      '#FEE08B', '#FDAE61', '#F46D43', '#D53E4F', '#9E0142',
                    ],
                    heatmapValueScaling: 'log',
                  },
                },
              ],
            },
          ],
          left: [],
        };
        s.views[0]!.initialXDomain = [1572847860, 1646965658];
        s.views[0]!.initialYDomain = [1587345758, 1630801516];
        return s;
      })(),
      goldenMinToolCalls: 7,
    },

    // ─── TC3: Rhodes 2020 - Shh Cohesin Comparison ───────────────────
    {
      id: 'build-shh-cohesin-comparison',
      description:
        'Two-panel comparison: virtual 4C profiles and split Hi-C maps at the mouse Shh locus',
      prompt:
        'Create a two-panel visualization of cohesin-mediated chromatin interactions at the mouse Shh locus. First, search for the Shh gene to get coordinates for navigation.\n\nPanel 1 (left half, w=6, h=6): Search for and add these tracks on top — mm10 chromosome labels, mm10 gene annotations, the mm10 enhancer coordinates bed file, and 5 virtual 4C bar tracks from the Shh promoter viewpoint: Nora Untreated, Nora AUX, Nora Washoff, Rhodes Tir1 AUX, and Rhodes Scc1 AUX. All bar tracks should use barFillColor "darkgreen" and valueScaling "linear". Clear center and left tracks from this view. Set initialXDomain to a ~5Mb window around Shh.\n\nPanel 2 (right half, x=6, w=6, h=6): Add a new view with mm10 chromosome labels, gene annotations, and the enhancer bed file on top, plus a combined center track containing two heatmaps — Tir1 AUX in lower-left extent and Scc1 AUX in upper-right extent, both using the warm color range (white, rgba(245,166,35,1.0), rgba(208,2,27,1.0), black) with log scaling. Set initialXDomain to a ~2Mb window centered on Shh.',
      initialState: defaultState(),
      goldenState: (() => {
        const s = structuredClone(defaultState());
        // Panel 1: existing view reconfigured
        s.views[0]!.tracks = {
          top: [
            {
              type: 'chromosome-labels',
              tilesetUid: 'O8tQOpn0RjiFrUBmrhph4A',
              server: 'https://resgen.io/api/v1',
            },
            {
              type: 'horizontal-gene-annotations',
              tilesetUid: 'DVuS61VhTG6DxKhlsTssTQ',
              server: 'https://resgen.io/api/v1',
              options: { name: 'Gene Annotations (mm10)' },
            },
            {
              type: 'bedlike',
              tilesetUid: 'QH2P9yu9TRayrJWSIq15Rw',
              server: 'https://resgen.io/api/v1',
            },
            {
              type: 'bar',
              tilesetUid: 'dNj5kcXbQOyCafZwS9Q_7Q',
              server: 'https://resgen.io/api/v1',
              options: { barFillColor: 'darkgreen', valueScaling: 'linear' },
            },
            {
              type: 'bar',
              tilesetUid: 'FkxLccEYTDyptR9lri9dSw',
              server: 'https://resgen.io/api/v1',
              options: { barFillColor: 'darkgreen', valueScaling: 'linear' },
            },
            {
              type: 'bar',
              tilesetUid: 'ZeGL_XV7Rxi7bUy1dWeiVw',
              server: 'https://resgen.io/api/v1',
              options: { barFillColor: 'darkgreen', valueScaling: 'linear' },
            },
            {
              type: 'bar',
              tilesetUid: 'TigjWJq3RUO6gTQoCYnYHA',
              server: 'https://resgen.io/api/v1',
              options: { barFillColor: 'darkgreen', valueScaling: 'linear' },
            },
            {
              type: 'bar',
              tilesetUid: 'NnBQFblZQiCkqS7EM7bjEw',
              server: 'https://resgen.io/api/v1',
              options: { barFillColor: 'darkgreen', valueScaling: 'linear' },
            },
          ],
          center: [],
          left: [],
        };
        s.views[0]!.initialXDomain = [720844024, 726155928];
        s.views[0]!.layout = { x: 0, y: 0, w: 6, h: 6 };

        // Panel 2: new view
        s.views.push(
          higlassViewConfigSchema.shape.views.element.parse({
            tracks: {
              top: [
                {
                  type: 'chromosome-labels',
                  tilesetUid: 'O8tQOpn0RjiFrUBmrhph4A',
                  server: 'https://resgen.io/api/v1',
                },
                {
                  type: 'horizontal-gene-annotations',
                  tilesetUid: 'DVuS61VhTG6DxKhlsTssTQ',
                  server: 'https://resgen.io/api/v1',
                  options: { name: 'Gene Annotations (mm10)' },
                },
                {
                  type: 'bedlike',
                  tilesetUid: 'QH2P9yu9TRayrJWSIq15Rw',
                  server: 'https://resgen.io/api/v1',
                },
              ],
              center: [
                {
                  type: 'combined',
                  contents: [
                    {
                      type: 'heatmap',
                      tilesetUid: 'H03vimpjStm1LbLUf2oFaw',
                      server: 'https://resgen.io/api/v1',
                      options: {
                        extent: 'lower-left',
                        colorRange: [
                          'white',
                          'rgba(245,166,35,1.0)',
                          'rgba(208,2,27,1.0)',
                          'black',
                        ],
                        heatmapValueScaling: 'log',
                      },
                    },
                    {
                      type: 'heatmap',
                      tilesetUid: 'CiH-pKPDTQqgz4RtBFkzJg',
                      server: 'https://resgen.io/api/v1',
                      options: {
                        extent: 'upper-right',
                        colorRange: [
                          'white',
                          'rgba(245,166,35,1.0)',
                          'rgba(208,2,27,1.0)',
                          'black',
                        ],
                        heatmapValueScaling: 'log',
                      },
                    },
                  ],
                },
              ],
            },
            initialXDomain: [722188359, 724026598],
            layout: { x: 6, y: 0, w: 6, h: 6 },
          }),
        );
        return s;
      })(),
      goldenMinToolCalls: 12,
    },

    // ─── TC4: Krietenstein 2019 - Micro-C Multi-Zoom ─────────────────
    {
      id: 'build-micro-c-multi-zoom',
      description:
        'Three side-by-side Micro-C contact map panels at increasing zoom levels',
      prompt:
        'Build a three-panel Micro-C contact map at progressively increasing zoom levels. Search for the H1ESC Micro-C heatmap tileset and the hg38 chromosome labels.\n\nAll three panels share the same center heatmap (H1ESC Micro-C) with colorRange [white, rgba(245,166,35,1.0), rgba(208,2,27,1.0), black] and log heatmapValueScaling, plus vertical-chromosome-labels on the left using hg38 chromSizes. Clear existing top and left tracks from the first view.\n\nPanel 1 (w=4, h=6): Search for the CTCF ChIP-seq bigwig and add it as a horizontal-bar track on top with barFillColor "darkgreen" and valueScaling "linear". Navigate to initialXDomain [941910065, 942460065].\n\nPanel 2 (new view, x=4, w=4, h=6): Search for Epilogos hg38 and add it as horizontal-stacked-bar on top with valueScaling "exponential". Navigate to initialXDomain [941910065, 942110065].\n\nPanel 3 (new view, x=8, w=4, h=6): Search for hg38 gene annotations and add them as horizontal-gene-annotations on top. Navigate to initialXDomain [942040065, 942100065].',
      initialState: defaultState(),
      goldenState: (() => {
        const s = structuredClone(defaultState());
        // Panel 1: existing view reconfigured
        s.views[0]!.tracks = {
          top: [
            {
              type: 'horizontal-bar',
              tilesetUid: 'Yjsni288Qz2RgG3-ujTrHg',
              server: 'https://resgen.io/api/v1',
              options: { barFillColor: 'darkgreen', valueScaling: 'linear' },
            },
          ],
          center: [
            {
              type: 'combined',
              contents: [
                {
                  type: 'heatmap',
                  tilesetUid: 'E8aSzhwARdqdojnO3MxWmg',
                  server: 'https://resgen.io/api/v1',
                  options: {
                    colorRange: [
                      'white',
                      'rgba(245,166,35,1.0)',
                      'rgba(208,2,27,1.0)',
                      'black',
                    ],
                    heatmapValueScaling: 'log',
                  },
                },
              ],
            },
          ],
          left: [
            {
              type: 'vertical-chromosome-labels',
              tilesetUid: 'ZpZ8c5JJRUS1J7ZkofcUrg',
              server: 'https://resgen.io/api/v1',
            },
          ],
        };
        s.views[0]!.initialXDomain = [941910065, 942460065];
        s.views[0]!.layout = { x: 0, y: 0, w: 4, h: 6 };

        const makePanel = (
          topTrack: Record<string, unknown>,
          xDomain: number[],
          layoutX: number,
        ) =>
          higlassViewConfigSchema.shape.views.element.parse({
            tracks: {
              top: [topTrack],
              center: [
                {
                  type: 'combined',
                  contents: [
                    {
                      type: 'heatmap',
                      tilesetUid: 'E8aSzhwARdqdojnO3MxWmg',
                      server: 'https://resgen.io/api/v1',
                      options: {
                        colorRange: [
                          'white',
                          'rgba(245,166,35,1.0)',
                          'rgba(208,2,27,1.0)',
                          'black',
                        ],
                        heatmapValueScaling: 'log',
                      },
                    },
                  ],
                },
              ],
              left: [
                {
                  type: 'vertical-chromosome-labels',
                  tilesetUid: 'ZpZ8c5JJRUS1J7ZkofcUrg',
                  server: 'https://resgen.io/api/v1',
                },
              ],
            },
            initialXDomain: xDomain,
            layout: { x: layoutX, y: 0, w: 4, h: 6 },
          });

        // Panel 2
        s.views.push(
          makePanel(
            {
              type: 'horizontal-stacked-bar',
              tilesetUid: 'HMSJyvLCSgGmrDJctdIz3w',
              server: 'https://resgen.io/api/v1',
              options: { name: 'Epilogos (hg38)', valueScaling: 'exponential' },
            },
            [941910065, 942110065],
            4,
          ),
        );

        // Panel 3
        s.views.push(
          makePanel(
            {
              type: 'horizontal-gene-annotations',
              tilesetUid: 'M9A9klpwTci5Vf4bHZ864g',
              server: 'https://resgen.io/api/v1',
              options: { name: 'Gene Annotations (hg38)' },
            },
            [942040065, 942100065],
            8,
          ),
        );

        return s;
      })(),
      goldenMinToolCalls: 9,
    },

    // ─── TC5: Corces 2020 - Brain Chromatin at PICALM ────────────────
    {
      id: 'build-brain-chromatin',
      description:
        'Two views: stacked cell-type ATAC-seq tracks with H3K27ac arcs (hg38) and PLAC-seq arcs (hg19), centered on PICALM',
      prompt:
        'Build a stacked layout of two views with several stacked 1D tracks. At the top of the first view I want to see the following 7 ATAC-seq tracks (all on hg38): 1. Excitatory Neurons 2. Inhibitory Neurons 3. Dopaminergic Neurons 4. Microglia 5. Oligodendrocytes 6. Astrocytes 7. OPCs. Use the 100 bin RIP norm bigwig files for all these tracks. They should be bar tracks with valueScaling "linear" and align "bottom". Use these colors respectively: orange, darkgreen, black, purple, darkgreen, red, #C5A1AF. Then add hg38 chromosome labels, hg38 gene annotations, and an H3K27ac FitHiChIP 1d-arcs track with arcStyle "ellipse", flip1D "yes", and strokeColor "black". Clear the center and left track positions. Set the first view layout height to 5.\n\nFor the second view (layout y=5, h=2) on hg19: add hg19 chromosome labels, hg19 gene annotations, and a combined 1d-arcs track for the following PLAC-seq datasets: Neuron PLAC-seq (strokeColor "orange"), Microglia PLAC-seq (strokeColor "blue"), and Nott et al PLAC-seq (strokeColor "purple"). All arcs should use arcStyle "ellipse" and flip1D "yes".\n\nFinally, search for the PICALM gene in both hg38 and hg19, then center both views around PICALM with approximately +/- 1.2Mb padding.',
      initialState: defaultState(),
      goldenState: (() => {
        const s = structuredClone(defaultState());

        // View 1: ATAC-seq + annotations + arcs (hg38)
        s.views[0]!.tracks = {
          top: [
            {
              type: 'bar',
              tilesetUid: 'VLFaiSVjTjW6mkbjRjWREA',
              server: 'https://resgen.io/api/v1',
              options: {
                barFillColor: 'orange',
                valueScaling: 'linear',
                align: 'bottom',
              },
            },
            {
              type: 'bar',
              tilesetUid: 'UtUGUu9rS3yQ7Ie-YtX32g',
              server: 'https://resgen.io/api/v1',
              options: {
                barFillColor: 'darkgreen',
                valueScaling: 'linear',
                align: 'bottom',
              },
            },
            {
              type: 'bar',
              tilesetUid: 'FBwldgSdQQWxh7R7-jemNA',
              server: 'https://resgen.io/api/v1',
              options: {
                barFillColor: 'black',
                valueScaling: 'linear',
                align: 'bottom',
              },
            },
            {
              type: 'bar',
              tilesetUid: 'Zz3CBDSqQ3ySrOSe2yj1eg',
              server: 'https://resgen.io/api/v1',
              options: {
                barFillColor: 'purple',
                valueScaling: 'linear',
                align: 'bottom',
              },
            },
            {
              type: 'bar',
              tilesetUid: 'dc_SOjdCRgq_8PYf6W--7w',
              server: 'https://resgen.io/api/v1',
              options: {
                barFillColor: 'darkgreen',
                valueScaling: 'linear',
                align: 'bottom',
              },
            },
            {
              type: 'bar',
              tilesetUid: 'Nolbrk9kS3CE0jJL_7OW1g',
              server: 'https://resgen.io/api/v1',
              options: {
                barFillColor: 'red',
                valueScaling: 'linear',
                align: 'bottom',
              },
            },
            {
              type: 'bar',
              tilesetUid: 'UZLlJyRBScWdGQ7L1eNk_g',
              server: 'https://resgen.io/api/v1',
              options: {
                barFillColor: '#C5A1AF',
                valueScaling: 'linear',
                align: 'bottom',
              },
            },
            {
              type: 'chromosome-labels',
              tilesetUid: 'ZpZ8c5JJRUS1J7ZkofcUrg',
              server: 'https://resgen.io/api/v1',
            },
            {
              type: 'horizontal-gene-annotations',
              tilesetUid: 'M9A9klpwTci5Vf4bHZ864g',
              server: 'https://resgen.io/api/v1',
              options: { name: 'Gene Annotations (hg38)' },
            },
            {
              type: '1d-arcs',
              tilesetUid: 'fyY8k9PlS-mGLnBob05_Ow',
              server: 'https://resgen.io/api/v1',
              options: {
                arcStyle: 'ellipse',
                flip1D: 'yes',
                strokeColor: 'black',
              },
            },
          ],
          center: [],
          left: [],
        };
        // Center on PICALM in hg38 ± ~1.2Mb
        s.views[0]!.initialXDomain = [1893430882, 1895908192];
        s.views[0]!.layout = { x: 0, y: 0, w: 12, h: 5 };

        // View 2: PLAC-seq arcs (hg19)
        s.views.push(
          higlassViewConfigSchema.shape.views.element.parse({
            tracks: {
              top: [
                {
                  type: 'chromosome-labels',
                  tilesetUid: 'ADfY_RtsQR6oKOMyrq6qhw',
                  server: 'https://resgen.io/api/v1',
                },
                {
                  type: 'horizontal-gene-annotations',
                  tilesetUid: 'NCifnbrKQu6j-ohVWJLoJw',
                  server: 'https://resgen.io/api/v1',
                  options: { name: 'Gene Annotations (hg19)' },
                },
                {
                  type: 'combined',
                  contents: [
                    {
                      type: '1d-arcs',
                      tilesetUid: 'JzccFAJUQEiz-0188xaWZg',
                      server: 'https://resgen.io/api/v1',
                      options: {
                        arcStyle: 'ellipse',
                        flip1D: 'yes',
                        strokeColor: 'orange',
                      },
                    },
                    {
                      type: '1d-arcs',
                      tilesetUid: 'R4e7-rVfQPWTleJIJjLOEQ',
                      server: 'https://resgen.io/api/v1',
                      options: {
                        arcStyle: 'ellipse',
                        flip1D: 'yes',
                        strokeColor: 'blue',
                      },
                    },
                    {
                      type: '1d-arcs',
                      tilesetUid: 'EqSENQSXRL-EWYeBe-Y1rA',
                      server: 'https://resgen.io/api/v1',
                      options: {
                        arcStyle: 'ellipse',
                        flip1D: 'yes',
                        strokeColor: 'purple',
                      },
                    },
                  ],
                },
              ],
            },
            // Center on PICALM in hg19 ± ~1.2Mb
            initialXDomain: [1900371694, 1902849004],
            layout: { x: 0, y: 5, w: 12, h: 2 },
          }),
        );

        return s;
      })(),
      goldenMinToolCalls: 14,
    },
  ],
};
