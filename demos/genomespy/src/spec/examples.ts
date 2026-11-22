import type { GenomeSpySpec } from './schema.ts';

export interface Example {
  name: string;
  spec: GenomeSpySpec;
}

/** Small specs with inline data on hg38 chr1:1,000,000-1,100,000. */
export const EXAMPLES: Example[] = [
  {
    name: 'Variant points',
    spec: {
      assembly: 'hg38',
      width: 760,
      data: {
        values: [
          {
            chrom: 'chr1',
            pos: 1008000,
            consequence: 'missense',
            signalA: 3.2,
            signalB: 8.1,
          },
          {
            chrom: 'chr1',
            pos: 1021000,
            consequence: 'synonymous',
            signalA: 5.8,
            signalB: 6.4,
          },
          {
            chrom: 'chr1',
            pos: 1039000,
            consequence: 'nonsense',
            signalA: 8.6,
            signalB: 3.5,
          },
          {
            chrom: 'chr1',
            pos: 1055000,
            consequence: 'missense',
            signalA: 6.7,
            signalB: 4.7,
          },
          {
            chrom: 'chr1',
            pos: 1073000,
            consequence: 'synonymous',
            signalA: 4.1,
            signalB: 7.2,
          },
          {
            chrom: 'chr1',
            pos: 1091000,
            consequence: 'nonsense',
            signalA: 7.9,
            signalB: 2.8,
          },
        ],
      },
      description: 'Variants colored by categorical consequence.',
      height: 280,
      mark: 'point',
      encoding: {
        x: {
          chrom: 'chrom',
          pos: 'pos',
          type: 'locus',
          scale: {
            domain: [
              {
                chrom: 'chr1',
                pos: 1000000,
              },
              {
                chrom: 'chr1',
                pos: 1100000,
              },
            ],
          },
          axis: {
            title: 'hg38 chr1 position (bp)',
          },
        },
        y: {
          field: 'signalA',
          type: 'quantitative',
          scale: {
            domain: [0, 10],
          },
          axis: {
            title: 'Variant score',
          },
        },
        color: {
          field: 'consequence',
          type: 'nominal',
          scale: {
            domain: ['missense', 'synonymous', 'nonsense'],
            range: ['#7c3aed', '#0891b2', '#e11d48'],
          },
          legend: null,
        },
        size: {
          value: 180,
        },
      },
    },
  },
  {
    name: 'Genomic intervals',
    spec: {
      assembly: 'hg38',
      width: 760,
      data: {
        values: [
          {
            chrom: 'chr1',
            start: 1004000,
            end: 1016000,
            category: 'enhancer',
          },
          {
            chrom: 'chr1',
            start: 1022000,
            end: 1036000,
            category: 'promoter',
          },
          {
            chrom: 'chr1',
            start: 1043000,
            end: 1057000,
            category: 'enhancer',
          },
          {
            chrom: 'chr1',
            start: 1064000,
            end: 1079000,
            category: 'silencer',
          },
          {
            chrom: 'chr1',
            start: 1084000,
            end: 1097000,
            category: 'promoter',
          },
        ],
      },
      description: 'Categorical genomic intervals.',
      height: 190,
      mark: {
        type: 'rect',
        cornerRadius: 3,
      },
      encoding: {
        x: {
          chrom: 'chrom',
          pos: 'start',
          type: 'locus',
          scale: {
            domain: [
              {
                chrom: 'chr1',
                pos: 1000000,
              },
              {
                chrom: 'chr1',
                pos: 1100000,
              },
            ],
          },
          axis: {
            title: 'hg38 chr1 position (bp)',
          },
        },
        x2: {
          chrom: 'chrom',
          pos: 'end',
        },
        y: {
          field: 'category',
          type: 'nominal',
          axis: {
            title: null,
          },
        },
        color: {
          field: 'category',
          type: 'nominal',
          scale: {
            domain: ['enhancer', 'promoter', 'silencer'],
            range: ['#7c3aed', '#0891b2', '#e11d48'],
          },
          legend: null,
        },
      },
    },
  },
  {
    name: 'Signal profile',
    spec: {
      assembly: 'hg38',
      width: 760,
      data: {
        values: [
          {
            chrom: 'chr1',
            pos: 1005000,
            signal: 1.8,
          },
          {
            chrom: 'chr1',
            pos: 1017000,
            signal: 3.4,
          },
          {
            chrom: 'chr1',
            pos: 1029000,
            signal: 6.9,
          },
          {
            chrom: 'chr1',
            pos: 1041000,
            signal: 5.2,
          },
          {
            chrom: 'chr1',
            pos: 1054000,
            signal: 8.3,
          },
          {
            chrom: 'chr1',
            pos: 1068000,
            signal: 4.6,
          },
          {
            chrom: 'chr1',
            pos: 1082000,
            signal: 7.1,
          },
          {
            chrom: 'chr1',
            pos: 1095000,
            signal: 2.7,
          },
        ],
      },
      description: 'Quantitative signal over the fixed hg38 chr1 interval.',
      height: 280,
      mark: 'point',
      encoding: {
        x: {
          chrom: 'chrom',
          pos: 'pos',
          type: 'locus',
          scale: {
            domain: [
              {
                chrom: 'chr1',
                pos: 1000000,
              },
              {
                chrom: 'chr1',
                pos: 1100000,
              },
            ],
          },
          axis: {
            title: 'hg38 chr1 position (bp)',
          },
        },
        y: {
          field: 'signal',
          type: 'quantitative',
          scale: {
            domain: [0, 10],
          },
          axis: {
            title: 'Signal',
          },
        },
        color: {
          value: '#7c3aed',
        },
        size: {
          value: 100,
        },
      },
    },
  },
  {
    name: 'Heatmap',
    spec: {
      assembly: 'hg38',
      width: 760,
      data: {
        values: [
          {
            chrom: 'chr1',
            sample: 'sample A',
            start: 1000000,
            end: 1025000,
            value: 2.1,
          },
          {
            chrom: 'chr1',
            sample: 'sample A',
            start: 1025000,
            end: 1050000,
            value: 5.4,
          },
          {
            chrom: 'chr1',
            sample: 'sample A',
            start: 1050000,
            end: 1075000,
            value: 8.2,
          },
          {
            chrom: 'chr1',
            sample: 'sample A',
            start: 1075000,
            end: 1100000,
            value: 4,
          },
          {
            chrom: 'chr1',
            sample: 'sample B',
            start: 1000000,
            end: 1025000,
            value: 7.3,
          },
          {
            chrom: 'chr1',
            sample: 'sample B',
            start: 1025000,
            end: 1050000,
            value: 3.2,
          },
          {
            chrom: 'chr1',
            sample: 'sample B',
            start: 1050000,
            end: 1075000,
            value: 6.1,
          },
          {
            chrom: 'chr1',
            sample: 'sample B',
            start: 1075000,
            end: 1100000,
            value: 8.8,
          },
          {
            chrom: 'chr1',
            sample: 'sample C',
            start: 1000000,
            end: 1025000,
            value: 4.7,
          },
          {
            chrom: 'chr1',
            sample: 'sample C',
            start: 1025000,
            end: 1050000,
            value: 7.8,
          },
          {
            chrom: 'chr1',
            sample: 'sample C',
            start: 1050000,
            end: 1075000,
            value: 1.6,
          },
          {
            chrom: 'chr1',
            sample: 'sample C',
            start: 1075000,
            end: 1100000,
            value: 5.9,
          },
        ],
      },
      description: 'Three-row genomic heatmap.',
      height: 210,
      mark: 'rect',
      encoding: {
        x: {
          chrom: 'chrom',
          pos: 'start',
          type: 'locus',
          scale: {
            domain: [
              {
                chrom: 'chr1',
                pos: 1000000,
              },
              {
                chrom: 'chr1',
                pos: 1100000,
              },
            ],
          },
          axis: {
            title: 'hg38 chr1 position (bp)',
          },
        },
        x2: {
          chrom: 'chrom',
          pos: 'end',
        },
        y: {
          field: 'sample',
          type: 'nominal',
          scale: {
            domain: ['sample A', 'sample B', 'sample C'],
          },
          axis: {
            title: null,
          },
        },
        color: {
          field: 'value',
          type: 'quantitative',
          scale: {
            domain: [0, 10],
            scheme: 'viridis',
          },
          legend: {
            title: 'Value',
          },
        },
      },
    },
  },
  {
    name: 'Gene annotations',
    spec: {
      assembly: 'hg38',
      width: 760,
      data: {
        values: [
          {
            chrom: 'chr1',
            start: 1006000,
            end: 1029000,
            lane: 'lane 1',
            label: 'GENE-A ->',
            strand: '+',
          },
          {
            chrom: 'chr1',
            start: 1034000,
            end: 1052000,
            lane: 'lane 2',
            label: '<- GENE-B',
            strand: '-',
          },
          {
            chrom: 'chr1',
            start: 1058000,
            end: 1078000,
            lane: 'lane 1',
            label: 'GENE-C ->',
            strand: '+',
          },
          {
            chrom: 'chr1',
            start: 1081000,
            end: 1096000,
            lane: 'lane 2',
            label: '<- GENE-D',
            strand: '-',
          },
        ],
      },
      description: 'Layered annotation bodies and directional labels.',
      height: 180,
      encoding: {
        x: {
          chrom: 'chrom',
          pos: 'start',
          type: 'locus',
          scale: {
            domain: [
              {
                chrom: 'chr1',
                pos: 1000000,
              },
              {
                chrom: 'chr1',
                pos: 1100000,
              },
            ],
          },
          axis: {
            title: 'hg38 chr1 position (bp)',
          },
        },
        x2: {
          chrom: 'chrom',
          pos: 'end',
        },
        y: {
          field: 'lane',
          type: 'nominal',
          axis: null,
          scale: {
            domain: ['lane 1', 'lane 2'],
          },
        },
      },
      layer: [
        {
          mark: {
            type: 'rect',
            color: '#d8b4fe',
            stroke: '#6d28d9',
            strokeWidth: 1,
            cornerRadius: 3,
          },
        },
        {
          mark: {
            type: 'text',
            color: '#312e81',
            size: 12,
          },
          encoding: {
            text: {
              field: 'label',
            },
          },
        },
      ],
    },
  },
  {
    name: 'Grid of panels',
    spec: {
      assembly: 'hg38',
      width: 760,
      data: {
        values: [
          {
            chrom: 'chr1',
            pos: 1008000,
            consequence: 'missense',
            signalA: 3.2,
            signalB: 8.1,
            signalC: 6.2,
            signalD: 2.5,
          },
          {
            chrom: 'chr1',
            pos: 1021000,
            consequence: 'synonymous',
            signalA: 5.8,
            signalB: 6.4,
            signalC: 3.1,
            signalD: 7.4,
          },
          {
            chrom: 'chr1',
            pos: 1039000,
            consequence: 'nonsense',
            signalA: 8.6,
            signalB: 3.5,
            signalC: 7.7,
            signalD: 4,
          },
          {
            chrom: 'chr1',
            pos: 1055000,
            consequence: 'missense',
            signalA: 6.7,
            signalB: 4.7,
            signalC: 5.4,
            signalD: 8,
          },
          {
            chrom: 'chr1',
            pos: 1073000,
            consequence: 'synonymous',
            signalA: 4.1,
            signalB: 7.2,
            signalC: 2.6,
            signalD: 5.6,
          },
          {
            chrom: 'chr1',
            pos: 1091000,
            consequence: 'nonsense',
            signalA: 7.9,
            signalB: 2.8,
            signalC: 8.2,
            signalD: 3.3,
          },
        ],
      },
      description: 'A two-by-two grid of genomic signal summaries.',
      spacing: 16,
      encoding: {
        x: {
          chrom: 'chrom',
          pos: 'pos',
          type: 'locus',
          scale: {
            domain: [
              {
                chrom: 'chr1',
                pos: 1000000,
              },
              {
                chrom: 'chr1',
                pos: 1100000,
              },
            ],
          },
          axis: {
            title: 'hg38 chr1 position (bp)',
          },
        },
      },
      hconcat: [
        {
          spacing: 12,
          vconcat: [
            {
              width: 330,
              height: 115,
              title: 'Signal A',
              mark: {
                type: 'point',
                color: '#7c3aed',
              },
              encoding: {
                y: {
                  field: 'signalA',
                  type: 'quantitative',
                  scale: {
                    domain: [0, 10],
                  },
                  axis: {
                    title: 'Signal A',
                  },
                },
                size: {
                  value: 90,
                },
              },
            },
            {
              width: 330,
              height: 115,
              title: 'Signal C',
              mark: {
                type: 'point',
                color: '#e11d48',
              },
              encoding: {
                y: {
                  field: 'signalC',
                  type: 'quantitative',
                  scale: {
                    domain: [0, 10],
                  },
                  axis: {
                    title: 'Signal C',
                  },
                },
                size: {
                  value: 90,
                },
              },
            },
          ],
        },
        {
          spacing: 12,
          vconcat: [
            {
              width: 330,
              height: 115,
              title: 'Signal B',
              mark: {
                type: 'point',
                color: '#0f9d8a',
              },
              encoding: {
                y: {
                  field: 'signalB',
                  type: 'quantitative',
                  scale: {
                    domain: [0, 10],
                  },
                  axis: {
                    title: 'Signal B',
                  },
                },
                size: {
                  value: 90,
                },
              },
            },
            {
              width: 330,
              height: 115,
              title: 'Signal D',
              mark: {
                type: 'point',
                color: '#d97706',
              },
              encoding: {
                y: {
                  field: 'signalD',
                  type: 'quantitative',
                  scale: {
                    domain: [0, 10],
                  },
                  axis: {
                    title: 'Signal D',
                  },
                },
                size: {
                  value: 90,
                },
              },
            },
          ],
        },
      ],
    },
  },
];

export const EXAMPLE_PROMPTS = [
  'Make the points larger and add a rule at score 5',
  'Show the variants as ticks on a separate track below the points',
  'Use a colorblind-safe palette and show a legend for the consequences',
  'Zoom to chr1:1,030,000-1,070,000',
];
