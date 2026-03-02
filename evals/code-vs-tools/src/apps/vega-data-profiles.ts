/**
 * Data profiles for the Vega eval test cases.
 *
 * These profiles describe the datasets used by each test case so the AI
 * knows the field names, types, and domains. The profiles are embedded
 * directly into test case prompts rather than exposed as a tool.
 */

export interface FieldProfile {
  name: string;
  type: 'integer' | 'float' | 'string' | 'array' | 'object';
  description?: string;
  /** For numeric fields */
  min?: number;
  max?: number;
  /** For string/categorical fields */
  values?: string[];
}

export interface DataProfile {
  url: string;
  description: string;
  format?: string;
  records?: number;
  fields: FieldProfile[];
}

export const DATA_PROFILES: Record<string, DataProfile> = {
  'driving.json': {
    url: 'data/driving.json',
    description:
      'Annual US gas prices and miles driven per capita, 1956-2010',
    records: 44,
    fields: [
      { name: 'year', type: 'integer', min: 1956, max: 2010 },
      {
        name: 'miles',
        type: 'integer',
        min: 5038,
        max: 10243,
        description: 'Miles driven per capita',
      },
      {
        name: 'gas',
        type: 'float',
        min: 0.93,
        max: 3.37,
        description: 'Price of gasoline (inflation-adjusted)',
      },
      {
        name: 'side',
        type: 'string',
        values: ['left', 'right', 'top', 'bottom'],
        description: 'Label placement hint for each data point',
      },
    ],
  },

  'population.json': {
    url: 'data/population.json',
    description: 'US population by age group, sex, and decade, 1850-2000',
    fields: [
      { name: 'year', type: 'integer', min: 1850, max: 2000 },
      {
        name: 'age',
        type: 'integer',
        min: 0,
        max: 90,
        description: 'Age group (0, 5, 10, ..., 90)',
      },
      {
        name: 'sex',
        type: 'integer',
        values: ['1', '2'],
        description: '1 = male, 2 = female',
      },
      {
        name: 'people',
        type: 'integer',
        description: 'Population count',
      },
    ],
  },

  'miserables.json': {
    url: 'data/miserables.json',
    description:
      'Character co-occurrence network from Les Misérables',
    format: 'json',
    fields: [
      {
        name: 'nodes',
        type: 'array',
        description:
          'Array of {index, name, group} — character index, name, and community group',
      },
      {
        name: 'links',
        type: 'array',
        description:
          'Array of {source, target, value} — co-occurrence edges by node index',
      },
    ],
  },

  'udistrict.json': {
    url: 'data/udistrict.json',
    description:
      'Restaurant locations in Seattle University District',
    fields: [
      {
        name: 'lat',
        type: 'float',
        description: 'Latitude position along the Ave',
      },
      {
        name: 'key',
        type: 'string',
        description: 'Cuisine category key',
        values: [
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
        name: 'name',
        type: 'string',
        description: 'Restaurant name',
      },
    ],
  },
};
