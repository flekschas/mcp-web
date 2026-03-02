import { vegaSpecSchema, type VegaSpec } from './vega-schema.js';
import type { TestApp } from '../types.js';

// ============================================================================
// Starting State
// ============================================================================

/**
 * Minimal empty Vega spec. All test cases start from this state
 * and must build up the complete spec from scratch.
 */
function emptySpec(): VegaSpec {
  return vegaSpecSchema.parse({});
}

// ============================================================================
// Test Cases
// ============================================================================

export const vegaApp: TestApp = {
  name: 'vega',
  description:
    'Vega visualization editor — build declarative chart specs from natural language',
  schema: vegaSpecSchema,
  cases: [
    // ─── TC1: Connected Scatter Plot ─────────────────────────────────
    {
      id: 'connected-scatter-plot',
      description:
        'Connected scatter plot of gas prices vs miles driven, labeled by year',
      prompt:
        'I have a dataset (`data/driving.json`) tracking annual gas prices and miles driven per capita in the US from 1956 to 2010. The fields are: `miles` (miles driven per capita), `gas` (price of gasoline), `year`, and `side` (a label placement hint: left/right/top/bottom). Create a connected scatter plot showing how these two metrics moved together over time — miles on the horizontal axis, gas price on the vertical. Connect the dots with smooth lines and label each point with its year. The chart should be 800×500.',
      initialState: emptySpec(),
      goldenState: vegaSpecSchema.parse({
        $schema: 'https://vega.github.io/schema/vega/v6.json',
        description:
          'An example of a connected scatter plot, tracking changes in miles driven versus the price of gasoline.',
        width: 800,
        height: 500,
        padding: 5,
        config: {
          axis: {
            domain: false,
            labelFontSize: 12,
            labelFontWeight: 'bold',
            tickSize: 0,
          },
        },
        data: [{ name: 'drive', url: 'data/driving.json' }],
        scales: [
          {
            name: 'x',
            type: 'linear',
            domain: { data: 'drive', field: 'miles' },
            range: 'width',
            nice: true,
            zero: false,
            round: true,
          },
          {
            name: 'y',
            type: 'linear',
            domain: { data: 'drive', field: 'gas' },
            range: 'height',
            nice: true,
            zero: false,
            round: true,
          },
          {
            name: 'align',
            type: 'ordinal',
            domain: ['left', 'right', 'top', 'bottom'],
            range: ['right', 'left', 'center', 'center'],
          },
          {
            name: 'base',
            type: 'ordinal',
            domain: ['left', 'right', 'top', 'bottom'],
            range: ['middle', 'middle', 'bottom', 'top'],
          },
          {
            name: 'dx',
            type: 'ordinal',
            domain: ['left', 'right', 'top', 'bottom'],
            range: [-7, 6, 0, 0],
          },
          {
            name: 'dy',
            type: 'ordinal',
            domain: ['left', 'right', 'top', 'bottom'],
            range: [1, 1, -5, 6],
          },
        ],
        axes: [
          { orient: 'top', scale: 'x', tickCount: 5, grid: true },
          {
            orient: 'bottom',
            scale: 'x',
            title: 'Miles driven per capita each year',
            ticks: false,
            labels: false,
          },
          {
            orient: 'left',
            scale: 'y',
            tickCount: 5,
            grid: true,
            format: '$0.2f',
          },
          {
            orient: 'right',
            scale: 'y',
            title:
              'Price of a gallon of gasoline (adjusted for inflation)',
            ticks: false,
            labels: false,
          },
        ],
        marks: [
          {
            type: 'line',
            from: { data: 'drive' },
            encode: {
              enter: {
                interpolate: { value: 'cardinal' },
                x: { scale: 'x', field: 'miles' },
                y: { scale: 'y', field: 'gas' },
                stroke: { value: '#000' },
                strokeWidth: { value: 3 },
              },
            },
          },
          {
            type: 'symbol',
            from: { data: 'drive' },
            encode: {
              enter: {
                x: { scale: 'x', field: 'miles' },
                y: { scale: 'y', field: 'gas' },
                fill: { value: '#fff' },
                stroke: { value: '#000' },
                strokeWidth: { value: 1 },
                size: { value: 49 },
              },
            },
          },
          {
            type: 'text',
            from: { data: 'drive' },
            encode: {
              enter: {
                x: { scale: 'x', field: 'miles' },
                y: { scale: 'y', field: 'gas' },
                dx: { scale: 'dx', field: 'side' },
                dy: { scale: 'dy', field: 'side' },
                fill: { value: '#000' },
                text: { field: 'year' },
                align: { scale: 'align', field: 'side' },
                baseline: { scale: 'base', field: 'side' },
              },
            },
          },
        ],
      }),
      goldenMinToolCalls: 15,
    },

    // ─── TC2: Radar Chart ────────────────────────────────────────────
    {
      id: 'radar-chart',
      description:
        'Radar chart comparing two categories across 7 dimensions',
      prompt:
        'I want a radar chart comparing two groups across 7 attributes. Here\'s the data — group 0: key-0=19, key-1=22, key-2=14, key-3=38, key-4=23, key-5=5, key-6=27; group 1: key-0=13, key-1=12, key-2=42, key-3=13, key-4=6, key-5=15, key-6=8. Each group should form a filled polygon on the radar, with grid lines radiating from the center to each axis. Label the axes and show the values. Chart size 400×400.',
      initialState: emptySpec(),
      goldenState: vegaSpecSchema.parse({
        $schema: 'https://vega.github.io/schema/vega/v6.json',
        description:
          'A radar chart example, showing multiple dimensions in a radial layout.',
        width: 400,
        height: 400,
        padding: 40,
        autosize: { type: 'none', contains: 'padding' },
        signals: [{ name: 'radius', update: 'width / 2' }],
        data: [
          {
            name: 'table',
            values: [
              { key: 'key-0', value: 19, category: 0 },
              { key: 'key-1', value: 22, category: 0 },
              { key: 'key-2', value: 14, category: 0 },
              { key: 'key-3', value: 38, category: 0 },
              { key: 'key-4', value: 23, category: 0 },
              { key: 'key-5', value: 5, category: 0 },
              { key: 'key-6', value: 27, category: 0 },
              { key: 'key-0', value: 13, category: 1 },
              { key: 'key-1', value: 12, category: 1 },
              { key: 'key-2', value: 42, category: 1 },
              { key: 'key-3', value: 13, category: 1 },
              { key: 'key-4', value: 6, category: 1 },
              { key: 'key-5', value: 15, category: 1 },
              { key: 'key-6', value: 8, category: 1 },
            ],
          },
          {
            name: 'keys',
            source: 'table',
            transform: [
              { type: 'aggregate', groupby: ['key'] },
            ],
          },
        ],
        scales: [
          {
            name: 'angular',
            type: 'point',
            range: { signal: '[-PI, PI]' },
            padding: 0.5,
            domain: { data: 'table', field: 'key' },
          },
          {
            name: 'radial',
            type: 'linear',
            range: { signal: '[0, radius]' },
            zero: true,
            nice: false,
            domain: { data: 'table', field: 'value' },
            domainMin: 0,
          },
          {
            name: 'color',
            type: 'ordinal',
            domain: { data: 'table', field: 'category' },
            range: { scheme: 'category10' },
          },
        ],
        encode: {
          enter: {
            x: { signal: 'radius' },
            y: { signal: 'radius' },
          },
        },
        marks: [
          {
            type: 'group',
            name: 'categories',
            zindex: 1,
            from: {
              facet: {
                data: 'table',
                name: 'facet',
                groupby: ['category'],
              },
            },
            marks: [
              {
                type: 'line',
                name: 'category-line',
                from: { data: 'facet' },
                encode: {
                  enter: {
                    interpolate: { value: 'linear-closed' },
                    x: {
                      signal:
                        "scale('radial', datum.value) * cos(scale('angular', datum.key))",
                    },
                    y: {
                      signal:
                        "scale('radial', datum.value) * sin(scale('angular', datum.key))",
                    },
                    stroke: {
                      scale: 'color',
                      field: 'category',
                    },
                    strokeWidth: { value: 1 },
                    fill: { scale: 'color', field: 'category' },
                    fillOpacity: { value: 0.1 },
                  },
                },
              },
              {
                type: 'text',
                name: 'value-text',
                from: { data: 'category-line' },
                encode: {
                  enter: {
                    x: { signal: 'datum.x' },
                    y: { signal: 'datum.y' },
                    text: { signal: 'datum.datum.value' },
                    align: { value: 'center' },
                    baseline: { value: 'middle' },
                    fill: { value: 'black' },
                  },
                },
              },
            ],
          },
          {
            type: 'rule',
            name: 'radial-grid',
            from: { data: 'keys' },
            zindex: 0,
            encode: {
              enter: {
                x: { value: 0 },
                y: { value: 0 },
                x2: {
                  signal:
                    "radius * cos(scale('angular', datum.key))",
                },
                y2: {
                  signal:
                    "radius * sin(scale('angular', datum.key))",
                },
                stroke: { value: 'lightgray' },
                strokeWidth: { value: 1 },
              },
            },
          },
          {
            type: 'text',
            name: 'key-label',
            from: { data: 'keys' },
            zindex: 1,
            encode: {
              enter: {
                x: {
                  signal:
                    "(radius + 5) * cos(scale('angular', datum.key))",
                },
                y: {
                  signal:
                    "(radius + 5) * sin(scale('angular', datum.key))",
                },
                text: { field: 'key' },
                align: [
                  {
                    test: "abs(scale('angular', datum.key)) > PI / 2",
                    value: 'right',
                  },
                  { value: 'left' },
                ],
                baseline: [
                  {
                    test: "scale('angular', datum.key) > 0",
                    value: 'top',
                  },
                  {
                    test: "scale('angular', datum.key) == 0",
                    value: 'middle',
                  },
                  { value: 'bottom' },
                ],
                fill: { value: 'black' },
                fontWeight: { value: 'bold' },
              },
            },
          },
          {
            type: 'line',
            name: 'outer-line',
            from: { data: 'radial-grid' },
            encode: {
              enter: {
                interpolate: { value: 'linear-closed' },
                x: { field: 'x2' },
                y: { field: 'y2' },
                stroke: { value: 'lightgray' },
                strokeWidth: { value: 1 },
              },
            },
          },
        ],
      }),
      goldenMinToolCalls: 12,
    },

    // ─── TC3: Population Pyramid ─────────────────────────────────────
    {
      id: 'population-pyramid',
      description:
        'Population pyramid with year slider showing US demographics by age and sex',
      prompt:
        'Build a population pyramid from US census data (`data/population.json`). The dataset has fields: `year`, `age` (age group), `sex` (1=male, 2=female), and `people` (population count). I want females on the left side and males on the right, with age groups stacked vertically. Add a year slider so I can scrub from 1850 to 2000 in decade steps. Height 400.',
      initialState: emptySpec(),
      goldenState: vegaSpecSchema.parse({
        $schema: 'https://vega.github.io/schema/vega/v6.json',
        description:
          'A population pyramid showing U.S. demographics from 1850 to 2000.',
        height: 400,
        padding: 5,
        signals: [
          { name: 'chartWidth', value: 300 },
          { name: 'chartPad', value: 20 },
          {
            name: 'width',
            update: '2 * chartWidth + chartPad',
          },
          {
            name: 'year',
            value: 2000,
            bind: {
              input: 'range',
              min: 1850,
              max: 2000,
              step: 10,
            },
          },
        ],
        data: [
          { name: 'population', url: 'data/population.json' },
          {
            name: 'popYear',
            source: 'population',
            transform: [
              {
                type: 'filter',
                expr: 'datum.year == year',
              },
            ],
          },
          {
            name: 'males',
            source: 'popYear',
            transform: [
              { type: 'filter', expr: 'datum.sex == 1' },
            ],
          },
          {
            name: 'females',
            source: 'popYear',
            transform: [
              { type: 'filter', expr: 'datum.sex == 2' },
            ],
          },
          {
            name: 'ageGroups',
            source: 'population',
            transform: [
              { type: 'aggregate', groupby: ['age'] },
            ],
          },
        ],
        scales: [
          {
            name: 'y',
            type: 'band',
            range: [{ signal: 'height' }, 0],
            round: true,
            domain: { data: 'ageGroups', field: 'age' },
          },
          {
            name: 'c',
            type: 'ordinal',
            domain: [1, 2],
            range: ['#d5855a', '#6c4e97'],
          },
        ],
        marks: [
          {
            type: 'text',
            interactive: false,
            from: { data: 'ageGroups' },
            encode: {
              enter: {
                x: {
                  signal: 'chartWidth + chartPad / 2',
                },
                y: {
                  scale: 'y',
                  field: 'age',
                  band: 0.5,
                },
                text: { field: 'age' },
                baseline: { value: 'middle' },
                align: { value: 'center' },
                fill: { value: '#000' },
              },
            },
          },
          {
            type: 'group',
            encode: {
              update: {
                x: { value: 0 },
                height: { signal: 'height' },
              },
            },
            scales: [
              {
                name: 'x',
                type: 'linear',
                range: [{ signal: 'chartWidth' }, 0],
                nice: true,
                zero: true,
                domain: {
                  data: 'population',
                  field: 'people',
                },
              },
            ],
            axes: [
              {
                orient: 'bottom',
                scale: 'x',
                format: 's',
                title: 'Females',
              },
            ],
            marks: [
              {
                type: 'rect',
                from: { data: 'females' },
                encode: {
                  enter: {
                    x: {
                      scale: 'x',
                      field: 'people',
                    },
                    x2: { scale: 'x', value: 0 },
                    y: { scale: 'y', field: 'age' },
                    height: {
                      scale: 'y',
                      band: 1,
                      offset: -1,
                    },
                    fillOpacity: { value: 0.6 },
                    fill: {
                      scale: 'c',
                      field: 'sex',
                    },
                  },
                },
              },
            ],
          },
          {
            type: 'group',
            encode: {
              update: {
                x: {
                  signal: 'chartWidth + chartPad',
                },
                height: { signal: 'height' },
              },
            },
            scales: [
              {
                name: 'x',
                type: 'linear',
                range: [0, { signal: 'chartWidth' }],
                nice: true,
                zero: true,
                domain: {
                  data: 'population',
                  field: 'people',
                },
              },
            ],
            axes: [
              {
                orient: 'bottom',
                scale: 'x',
                format: 's',
                title: 'Males',
              },
            ],
            marks: [
              {
                type: 'rect',
                from: { data: 'males' },
                encode: {
                  enter: {
                    x: {
                      scale: 'x',
                      field: 'people',
                    },
                    x2: { scale: 'x', value: 0 },
                    y: { scale: 'y', field: 'age' },
                    height: {
                      scale: 'y',
                      band: 1,
                      offset: -1,
                    },
                    fillOpacity: { value: 0.6 },
                    fill: {
                      scale: 'c',
                      field: 'sex',
                    },
                  },
                },
              },
            ],
          },
        ],
      }),
      goldenMinToolCalls: 16,
    },

    // ─── TC4: Arc Diagram ────────────────────────────────────────────
    {
      id: 'arc-diagram',
      description:
        'Arc diagram of character co-occurrence in Les Misérables',
      prompt:
        'Create an arc diagram visualizing character co-occurrence in Les Misérables. The data is in `data/miserables.json` with two arrays: `nodes` (each has `index`, `name`, `group`) and `links` (each has `source`, `target`, `value` — where source/target are node indices). Lay out the characters in a horizontal line, draw arcs connecting co-occurring characters, and color the nodes by their community group. Size nodes by how many connections they have. Width 770.',
      initialState: emptySpec(),
      goldenState: vegaSpecSchema.parse({
        $schema: 'https://vega.github.io/schema/vega/v6.json',
        description:
          'An arc diagram depicting character co-occurrence in the novel Les Misérables.',
        width: 770,
        padding: 5,
        data: [
          {
            name: 'edges',
            url: 'data/miserables.json',
            format: { type: 'json', property: 'links' },
          },
          {
            name: 'sourceDegree',
            source: 'edges',
            transform: [
              {
                type: 'aggregate',
                groupby: ['source'],
              },
            ],
          },
          {
            name: 'targetDegree',
            source: 'edges',
            transform: [
              {
                type: 'aggregate',
                groupby: ['target'],
              },
            ],
          },
          {
            name: 'nodes',
            url: 'data/miserables.json',
            format: { type: 'json', property: 'nodes' },
            transform: [
              {
                type: 'window',
                ops: ['rank'],
                as: ['order'],
              },
              {
                type: 'lookup',
                from: 'sourceDegree',
                key: 'source',
                fields: ['index'],
                as: ['sourceDegree'],
                default: { count: 0 },
              },
              {
                type: 'lookup',
                from: 'targetDegree',
                key: 'target',
                fields: ['index'],
                as: ['targetDegree'],
                default: { count: 0 },
              },
              {
                type: 'formula',
                as: 'degree',
                expr: 'datum.sourceDegree.count + datum.targetDegree.count',
              },
            ],
          },
        ],
        scales: [
          {
            name: 'position',
            type: 'band',
            domain: {
              data: 'nodes',
              field: 'order',
              sort: true,
            },
            range: 'width',
          },
          {
            name: 'color',
            type: 'ordinal',
            range: 'category',
            domain: { data: 'nodes', field: 'group' },
          },
        ],
        marks: [
          {
            type: 'symbol',
            name: 'layout',
            interactive: false,
            from: { data: 'nodes' },
            encode: {
              enter: { opacity: { value: 0 } },
              update: {
                x: { scale: 'position', field: 'order' },
                y: { value: 0 },
                size: {
                  field: 'degree',
                  mult: 5,
                  offset: 10,
                },
                fill: { scale: 'color', field: 'group' },
              },
            },
          },
          {
            type: 'path',
            from: { data: 'edges' },
            encode: {
              update: {
                stroke: { value: '#000' },
                strokeOpacity: { value: 0.2 },
                strokeWidth: { field: 'value' },
              },
            },
            transform: [
              {
                type: 'lookup',
                from: 'layout',
                key: 'datum.index',
                fields: ['datum.source', 'datum.target'],
                as: ['sourceNode', 'targetNode'],
              },
              {
                type: 'linkpath',
                sourceX: {
                  expr: 'min(datum.sourceNode.x, datum.targetNode.x)',
                },
                targetX: {
                  expr: 'max(datum.sourceNode.x, datum.targetNode.x)',
                },
                sourceY: { expr: '0' },
                targetY: { expr: '0' },
                shape: 'arc',
              },
            ],
          },
          {
            type: 'symbol',
            from: { data: 'layout' },
            encode: {
              update: {
                x: { field: 'x' },
                y: { field: 'y' },
                fill: { field: 'fill' },
                size: { field: 'size' },
              },
            },
          },
          {
            type: 'text',
            from: { data: 'nodes' },
            encode: {
              update: {
                x: { scale: 'position', field: 'order' },
                y: { value: 7 },
                fontSize: { value: 9 },
                align: { value: 'right' },
                baseline: { value: 'middle' },
                angle: { value: -90 },
                text: { field: 'name' },
              },
            },
          },
        ],
      }),
      goldenMinToolCalls: 13,
    },

    // ─── TC5: U-District Cuisine ─────────────────────────────────────
    {
      id: 'u-district-cuisine',
      description:
        'Ridgeline KDE density plot of cuisine types along Seattle\'s University District',
      prompt:
        'I have location data for restaurants in Seattle\'s University District (`data/udistrict.json`). Each record has `lat` (latitude), `key` (cuisine category like \'coffee\', \'thai\', \'korean\', etc.), and `name` (restaurant name). There are 19 cuisine categories. Create a ridgeline plot showing the geographic density distribution of each cuisine type along the north-south axis of the neighborhood. Stack the cuisine categories vertically with KDE density curves. Color by cuisine category and annotate the major cross streets (Boat St. at 47.6516, 40th St. at 47.655363, 42nd St. at 47.6584, 45th St. at 47.6614, 50th St. at 47.664924, 55th St. at 47.668519). Title it \'A Mile-Long Global Food Market\'. Chart 500×380.',
      initialState: emptySpec(),
      goldenState: vegaSpecSchema.parse({
        $schema: 'https://vega.github.io/schema/vega/v6.json',
        description:
          "Area charts showing the density of cuisine options in Seattle's U-District.",
        width: 500,
        height: 380,
        padding: 5,
        autosize: 'pad',
        config: {
          text: {
            font: 'Ideal Sans, Avenir Next, Helvetica',
          },
          title: {
            font: 'Ideal Sans, Avenir Next, Helvetica',
            fontWeight: 500,
            fontSize: 17,
            limit: -1,
          },
          axis: {
            labelFont:
              'Ideal Sans, Avenir Next, Helvetica',
            labelFontSize: 12,
          },
        },
        signals: [
          { name: 'size', value: 2.3 },
          { name: 'domainMax', value: 5000 },
          { name: 'bandwidth', value: 0.0005 },
          {
            name: 'offsets',
            value: {
              bubbletea: -1,
              chinese: -1.5,
              japanese: -2,
              korean: -3,
              mideastern: -2,
              indian: -1,
              breakfast: -3.5,
              latin: 31,
            },
          },
          {
            name: 'categories',
            value: [
              'coffee',
              'drinks',
              'bubbletea',
              'vietnamese',
              'thai',
              'chinese',
              'japanese',
              'korean',
              'mideastern',
              'indian',
              'burgers',
              'pizza',
              'american',
              'breakfast',
              'bakeries',
              'seafood',
              'hawaiian',
              'veg',
              'latin',
            ],
          },
          {
            name: 'names',
            value: [
              'Coffee',
              'Pubs, Lounges',
              'Bubble Tea, Juice',
              'Vietnamese',
              'Thai',
              'Chinese',
              'Japanese',
              'Korean',
              'Middle Eastern',
              'Indian, Pakistani',
              'Pizza',
              'Burgers',
              'American',
              'Breakfast, Brunch',
              'Bakeries',
              'Seafood',
              'Hawaiian',
              'Vegetarian, Vegan',
              'Mexican, Latin American',
            ],
          },
          {
            name: 'colors',
            value: [
              '#7f7f7f',
              '#7f7f7f',
              '#7f7f7f',
              '#1f77b4',
              '#1f77b4',
              '#1f77b4',
              '#1f77b4',
              '#1f77b4',
              '#2ca02c',
              '#2ca02c',
              '#ff7f0e',
              '#ff7f0e',
              '#ff7f0e',
              '#8c564b',
              '#8c564b',
              '#e377c2',
              '#e377c2',
              '#bcbd22',
              '#17becf',
            ],
          },
        ],
        data: [
          { name: 'source', url: 'data/udistrict.json' },
          {
            name: 'annotation',
            values: [
              {
                name: 'Boat St.',
                align: 'left',
                lat: 47.6516,
              },
              {
                name: '40th St.',
                align: 'center',
                lat: 47.655363,
              },
              {
                name: '42nd St.',
                align: 'center',
                lat: 47.6584,
              },
              {
                name: '45th St.',
                align: 'center',
                lat: 47.6614,
              },
              {
                name: '50th St.',
                align: 'center',
                lat: 47.664924,
              },
              {
                name: '55th St.',
                align: 'center',
                lat: 47.668519,
              },
            ],
          },
        ],
        title: {
          text: 'A Mile-Long Global Food Market: Mapping Cuisine from "The Ave"',
          orient: 'top',
          anchor: 'start',
          frame: 'group',
          encode: {
            update: { dx: { value: -1 } },
          },
        },
        scales: [
          {
            name: 'xscale',
            type: 'linear',
            range: 'width',
            zero: false,
            domain: { data: 'source', field: 'lat' },
          },
          {
            name: 'yscale',
            type: 'band',
            range: 'height',
            round: true,
            padding: 0,
            domain: { signal: 'categories' },
          },
          {
            name: 'color',
            type: 'ordinal',
            range: { signal: 'colors' },
            domain: { signal: 'categories' },
          },
          {
            name: 'names',
            type: 'ordinal',
            domain: { signal: 'categories' },
            range: { signal: 'names' },
          },
        ],
        axes: [
          {
            orient: 'right',
            scale: 'yscale',
            domain: false,
            ticks: false,
            encode: {
              labels: {
                update: {
                  dx: { value: 2 },
                  dy: { value: 2 },
                  y: {
                    scale: 'yscale',
                    field: 'value',
                    band: 1,
                  },
                  text: {
                    scale: 'names',
                    field: 'value',
                  },
                  baseline: { value: 'bottom' },
                },
              },
            },
          },
        ],
        marks: [
          {
            type: 'rule',
            from: { data: 'annotation' },
            encode: {
              update: {
                x: {
                  signal:
                    "round(scale('xscale', datum.lat)) + 0.5",
                },
                y: { value: 20 },
                x2: {
                  signal:
                    "round(scale('xscale', datum.lat)) + 0.5",
                },
                y2: { signal: 'height', offset: 6 },
                stroke: { value: '#ddd' },
                strokeDash: { value: [3, 2] },
              },
            },
          },
          {
            type: 'text',
            from: { data: 'annotation' },
            encode: {
              update: {
                x: {
                  scale: 'xscale',
                  field: 'lat',
                  offset: 0,
                },
                dx: {
                  signal:
                    "datum.align === 'left' ? -1 : 0",
                },
                y: { signal: 'height', offset: 6 },
                align: { field: 'align' },
                baseline: { value: 'top' },
                text: { field: 'name' },
                fontStyle: { value: 'italic' },
              },
            },
          },
          {
            type: 'group',
            from: {
              facet: {
                data: 'source',
                name: 'category',
                groupby: 'key',
                aggregate: {
                  ops: ['min', 'max', 'count'],
                  fields: ['lat', 'lat', 'lat'],
                  as: ['min_lat', 'max_lat', 'count'],
                },
              },
            },
            encode: {
              update: {
                y: { scale: 'yscale', field: 'key' },
                width: { signal: 'width' },
                height: { scale: 'yscale', band: 1 },
              },
            },
            sort: { field: 'y', order: 'ascending' },
            signals: [
              {
                name: 'height',
                update: "bandwidth('yscale')",
              },
            ],
            data: [
              {
                name: 'density',
                source: 'category',
                transform: [
                  {
                    type: 'density',
                    steps: 200,
                    extent: {
                      signal: "domain('xscale')",
                    },
                    distribution: {
                      function: 'kde',
                      field: 'lat',
                      bandwidth: { signal: 'bandwidth' },
                    },
                  },
                ],
              },
            ],
            scales: [
              {
                name: 'yinner',
                type: 'linear',
                range: [
                  { signal: 'height' },
                  { signal: '0 - size * height' },
                ],
                domain: [
                  0,
                  { signal: 'domainMax' },
                ],
              },
            ],
            marks: [
              {
                type: 'area',
                from: { data: 'density' },
                encode: {
                  enter: {
                    fill: {
                      scale: 'color',
                      field: { parent: 'key' },
                    },
                    fillOpacity: { value: 0.7 },
                    stroke: { value: 'white' },
                    strokeWidth: { value: 1 },
                  },
                  update: {
                    x: {
                      scale: 'xscale',
                      field: 'value',
                    },
                    y: {
                      scale: 'yinner',
                      signal:
                        'parent.count * datum.density',
                    },
                    y2: {
                      scale: 'yinner',
                      value: 0,
                    },
                  },
                },
              },
              {
                type: 'rule',
                clip: true,
                encode: {
                  update: {
                    y: {
                      signal: 'height',
                      offset: -0.5,
                    },
                    x: {
                      scale: 'xscale',
                      field: { parent: 'min_lat' },
                      offset: {
                        signal:
                          "scale('xscale', 0) - scale('xscale', 2*bandwidth) + (offsets[parent.key] || 1) - 3",
                      },
                    },
                    x2: { signal: 'width' },
                    stroke: { value: '#aaa' },
                    strokeWidth: { value: 0.25 },
                    strokeOpacity: { value: 1 },
                  },
                },
              },
              {
                type: 'symbol',
                from: { data: 'category' },
                encode: {
                  enter: {
                    fillOpacity: { value: 0 },
                    size: { value: 50 },
                    tooltip: { field: 'name' },
                  },
                  update: {
                    x: {
                      scale: 'xscale',
                      field: 'lat',
                    },
                    y: {
                      scale: 'yscale',
                      band: 0.5,
                    },
                    fill: {
                      scale: 'color',
                      field: 'key',
                    },
                  },
                },
              },
            ],
          },
        ],
      }),
      goldenMinToolCalls: 16,
    },
  ],
};
