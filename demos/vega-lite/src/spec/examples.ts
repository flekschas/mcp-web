import type { VegaLiteSpec } from './schema.ts';

export const DATASETS_URL =
  'https://cdn.jsdelivr.net/npm/vega-datasets@3.3.1/data';

export interface Example {
  name: string;
  spec: VegaLiteSpec;
}

export const EXAMPLES: Example[] = [
  {
    name: 'Seattle precipitation',
    spec: {
      $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
      description: 'Mean daily precipitation in Seattle per month.',
      data: { url: `${DATASETS_URL}/seattle-weather.csv` },
      mark: { type: 'bar', tooltip: true },
      encoding: {
        x: {
          timeUnit: 'month',
          field: 'date',
          type: 'ordinal',
          title: 'Month',
        },
        y: {
          aggregate: 'mean',
          field: 'precipitation',
          type: 'quantitative',
          title: 'Mean precipitation (mm)',
        },
      },
    },
  },
  {
    name: 'Cars scatterplot',
    spec: {
      $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
      description: 'Horsepower versus fuel economy of cars.',
      data: { url: `${DATASETS_URL}/cars.json` },
      mark: { type: 'point', tooltip: true },
      encoding: {
        x: { field: 'Horsepower', type: 'quantitative' },
        y: { field: 'Miles_per_Gallon', type: 'quantitative' },
        color: { field: 'Origin', type: 'nominal' },
      },
    },
  },
  {
    name: 'Stock prices',
    spec: {
      $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
      description: 'Daily closing prices of five tech stocks.',
      data: { url: `${DATASETS_URL}/stocks.csv` },
      mark: 'line',
      encoding: {
        x: { field: 'date', type: 'temporal' },
        y: { field: 'price', type: 'quantitative' },
        color: { field: 'symbol', type: 'nominal' },
      },
    },
  },
  {
    name: 'Inline values',
    spec: {
      $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
      description: 'A bar chart of inline values.',
      data: {
        values: [
          { category: 'A', value: 28 },
          { category: 'B', value: 55 },
          { category: 'C', value: 43 },
          { category: 'D', value: 91 },
          { category: 'E', value: 81 },
        ],
      },
      mark: 'bar',
      encoding: {
        x: { field: 'category', type: 'nominal' },
        y: { field: 'value', type: 'quantitative' },
      },
    },
  },
];

export const EXAMPLE_PROMPTS = [
  'Show the weather types per month as stacked bars instead, with sun in gold and rain in blue',
  'Switch to the cars dataset and plot horsepower against miles per gallon, colored by origin',
  'Add a red rule at the overall mean and label it',
  'Facet the current chart into one panel per year',
];
