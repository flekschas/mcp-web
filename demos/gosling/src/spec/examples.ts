import type { GoslingSpec } from './schema.ts';

export interface Example {
  name: string;
  spec: GoslingSpec;
}

/** Small specs with inline data on hg38 chr1:1,000,000-1,100,000. */
export const EXAMPLES: Example[] = [
  {
    name: 'Genomic intervals',
    spec: {
      assembly: 'hg38',
      static: true,
      xDomain: {
        chromosome: 'chr1',
        interval: [1000000, 1100000],
      },
      tracks: [
        {
          layout: 'linear',
          width: 760,
          height: 150,
          data: {
            type: 'json',
            chromosomeField: 'chrom',
            genomicFields: ['start', 'end'],
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
          mark: 'rect',
          x: {
            field: 'start',
            type: 'genomic',
            axis: 'bottom',
          },
          xe: {
            field: 'end',
            type: 'genomic',
          },
          color: {
            field: 'category',
            type: 'nominal',
            domain: ['enhancer', 'promoter', 'silencer'],
            range: ['#7c3aed', '#0891b2', '#e11d48'],
            legend: false,
          },
          stroke: {
            value: '#334155',
          },
          strokeWidth: {
            value: 1,
          },
        },
      ],
    },
  },
  {
    name: 'Signal profile',
    spec: {
      assembly: 'hg38',
      static: true,
      xDomain: {
        chromosome: 'chr1',
        interval: [1000000, 1100000],
      },
      tracks: [
        {
          layout: 'linear',
          width: 760,
          height: 280,
          data: {
            type: 'json',
            chromosomeField: 'chrom',
            genomicFields: ['pos'],
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
          mark: 'line',
          x: {
            field: 'pos',
            type: 'genomic',
            axis: 'bottom',
          },
          y: {
            field: 'signal',
            type: 'quantitative',
            domain: [0, 10],
            axis: 'left',
          },
          color: {
            value: '#7c3aed',
          },
          strokeWidth: {
            value: 3,
          },
        },
      ],
    },
  },
  {
    name: 'Variant points',
    spec: {
      assembly: 'hg38',
      static: true,
      xDomain: {
        chromosome: 'chr1',
        interval: [1000000, 1100000],
      },
      tracks: [
        {
          layout: 'linear',
          width: 760,
          height: 280,
          data: {
            type: 'json',
            chromosomeField: 'chrom',
            genomicFields: ['pos'],
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
          mark: 'point',
          x: {
            field: 'pos',
            type: 'genomic',
            axis: 'bottom',
          },
          y: {
            field: 'signalA',
            type: 'quantitative',
            domain: [0, 10],
            axis: 'left',
          },
          color: {
            field: 'consequence',
            type: 'nominal',
            domain: ['missense', 'synonymous', 'nonsense'],
            range: ['#7c3aed', '#0891b2', '#e11d48'],
            legend: false,
          },
          size: {
            value: 10,
          },
        },
      ],
    },
  },
  {
    name: 'Two tracks',
    spec: {
      assembly: 'hg38',
      static: true,
      xDomain: {
        chromosome: 'chr1',
        interval: [1000000, 1100000],
      },
      spacing: 18,
      tracks: [
        {
          layout: 'linear',
          width: 760,
          title: 'Signal A',
          height: 145,
          data: {
            type: 'json',
            chromosomeField: 'chrom',
            genomicFields: ['pos'],
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
          mark: 'line',
          x: {
            field: 'pos',
            type: 'genomic',
            axis: 'bottom',
          },
          y: {
            field: 'signalA',
            type: 'quantitative',
            domain: [0, 10],
            axis: 'left',
          },
          color: {
            value: '#7c3aed',
          },
          strokeWidth: {
            value: 3,
          },
        },
        {
          layout: 'linear',
          width: 760,
          title: 'Signal B',
          height: 145,
          data: {
            type: 'json',
            chromosomeField: 'chrom',
            genomicFields: ['pos'],
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
          mark: 'line',
          x: {
            field: 'pos',
            type: 'genomic',
            axis: 'bottom',
          },
          y: {
            field: 'signalB',
            type: 'quantitative',
            domain: [0, 10],
            axis: 'left',
          },
          color: {
            value: '#0f9d8a',
          },
          strokeWidth: {
            value: 3,
          },
        },
      ],
    },
  },
  {
    name: 'Links',
    spec: {
      assembly: 'hg38',
      static: true,
      xDomain: {
        chromosome: 'chr1',
        interval: [1000000, 1100000],
      },
      tracks: [
        {
          layout: 'linear',
          width: 760,
          height: 260,
          data: {
            type: 'json',
            chromosomeField: 'chrom',
            genomicFields: [
              'sourceStart',
              'sourceEnd',
              'targetStart',
              'targetEnd',
            ],
            values: [
              {
                chrom: 'chr1',
                sourceStart: 1004000,
                sourceEnd: 1011000,
                targetStart: 1044000,
                targetEnd: 1052000,
                group: 'enhancer',
              },
              {
                chrom: 'chr1',
                sourceStart: 1018000,
                sourceEnd: 1025000,
                targetStart: 1070000,
                targetEnd: 1079000,
                group: 'promoter',
              },
              {
                chrom: 'chr1',
                sourceStart: 1036000,
                sourceEnd: 1042000,
                targetStart: 1088000,
                targetEnd: 1096000,
                group: 'enhancer',
              },
            ],
          },
          mark: 'withinLink',
          x: {
            field: 'sourceStart',
            type: 'genomic',
            axis: 'bottom',
          },
          xe: {
            field: 'sourceEnd',
            type: 'genomic',
          },
          x1: {
            field: 'targetStart',
            type: 'genomic',
          },
          x1e: {
            field: 'targetEnd',
            type: 'genomic',
          },
          color: {
            field: 'group',
            type: 'nominal',
            domain: ['enhancer', 'promoter'],
            range: ['#7c3aed', '#0891b2'],
          },
          stroke: {
            field: 'group',
            type: 'nominal',
            domain: ['enhancer', 'promoter'],
            range: ['#7c3aed', '#0891b2'],
          },
          strokeWidth: {
            value: 3,
          },
          opacity: {
            value: 0.58,
          },
        },
      ],
    },
  },
  {
    name: 'Circular bands',
    spec: {
      assembly: 'hg38',
      static: true,
      xDomain: {
        chromosome: 'chr1',
        interval: [1000000, 1100000],
      },
      layout: 'circular',
      centerRadius: 0.45,
      tracks: [
        {
          width: 440,
          height: 70,
          data: {
            type: 'json',
            chromosomeField: 'chrom',
            genomicFields: ['start', 'end'],
            values: [
              {
                chrom: 'chr1',
                start: 1002000,
                end: 1017000,
                band: 'A',
              },
              {
                chrom: 'chr1',
                start: 1020000,
                end: 1039000,
                band: 'B',
              },
              {
                chrom: 'chr1',
                start: 1043000,
                end: 1059000,
                band: 'C',
              },
              {
                chrom: 'chr1',
                start: 1063000,
                end: 1081000,
                band: 'D',
              },
              {
                chrom: 'chr1',
                start: 1085000,
                end: 1098000,
                band: 'E',
              },
            ],
          },
          mark: 'rect',
          x: {
            field: 'start',
            type: 'genomic',
            axis: 'top',
          },
          xe: {
            field: 'end',
            type: 'genomic',
          },
          color: {
            field: 'band',
            type: 'nominal',
            domain: ['A', 'B', 'C', 'D', 'E'],
            range: ['#7c3aed', '#0891b2', '#e11d48', '#d97706', '#16a34a'],
            legend: false,
          },
          stroke: {
            value: 'white',
          },
          strokeWidth: {
            value: 1,
          },
        },
      ],
    },
  },
];

export const EXAMPLE_PROMPTS = [
  'Add a second track below that shows the same intervals as a bar chart',
  'Color the intervals by category with a colorblind-safe palette and show a legend',
  'Turn this into a circular layout',
  'Zoom the view to chr1:1,020,000-1,080,000',
];
