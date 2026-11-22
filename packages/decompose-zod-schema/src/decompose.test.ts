import { test, expect } from 'bun:test';
import { z } from 'zod';

// Import the decompose functions
import { applyPartialUpdate, decomposeSchema, validatePlan } from './index.ts';
import { getSchemaAtDeepPath, parseEnumSplit } from './utils.ts';
import { validateSliceCompleteness } from './validate.ts';

test('decomposeSchema - basic object decomposition', () => {
  const schema = z.object({
    name: z.string(),
    age: z.number(),
    email: z.string().email(),
  });

  const decomposed = decomposeSchema(schema, {
    maxTokensPerSchema: 100,
    maxOptionsPerEnum: 50,
  });

  // Should create at least one decomposed schema
  expect(decomposed).toBeDefined();
  expect(Array.isArray(decomposed)).toBe(true);

  // Each decomposed schema should have required properties
  decomposed.forEach((item) => {
    expect(item.name).toBeDefined();
    expect(item.schema).toBeDefined();
    expect(item.targetPaths).toBeDefined();
    expect(Array.isArray(item.targetPaths)).toBe(true);
  });

  // Test that decomposed schemas work correctly with safeParse
  // Find the schema that handles name, age, and email
  const basicSchema = decomposed.find(d =>
    d.targetPaths.includes('name') &&
    d.targetPaths.includes('age') &&
    d.targetPaths.includes('email')
  );

  if (basicSchema) {
    // Test valid data
    expect(basicSchema.schema.safeParse({
      name: 'John Doe',
      age: 30,
      email: 'john.doe@example.com'
    }).success).toBe(true);

    // Test invalid email
    expect(basicSchema.schema.safeParse({
      name: 'John Doe',
      age: 30,
      email: 'invalid-email'
    }).success).toBe(false);

    // Test invalid age type
    expect(basicSchema.schema.safeParse({
      name: 'John Doe',
      age: 'thirty',
      email: 'john.doe@example.com'
    }).success).toBe(false);
  }
});

test('decomposeSchema - nested object decomposition', () => {
  const schema = z.object({
    user: z.object({
      name: z.string(),
      profile: z.object({
        bio: z.string(),
        avatar: z.string().url(),
      }),
    }),
    settings: z.object({
      theme: z.enum(['light', 'dark']),
      notifications: z.boolean(),
    }),
  });

  // Use manual plan to test nested path handling
  const decomposed = decomposeSchema(schema, [
    'user.name',
    'user.profile.bio',
    'settings.theme',
  ]);

  expect(decomposed).toBeDefined();
  expect(Array.isArray(decomposed)).toBe(true);

  // Verify that target paths are properly tracked
  const allPaths = decomposed.flatMap((item) => item.targetPaths);
  const hasNestedPaths = allPaths.some((path) => path.includes('.'));

  // Should have nested paths for nested objects
  expect(hasNestedPaths).toBe(true);

  // Verify that we can find schemas for each target path
  const userNameSchema = decomposed.find(d => d.targetPaths.includes('user.name'));
  const bioSchema = decomposed.find(d => d.targetPaths.includes('user.profile.bio'));
  const themeSchema = decomposed.find(d => d.targetPaths.includes('settings.theme'));

  // Just verify the schemas exist and have the expected structure
  expect(userNameSchema).toBeDefined();
  expect(bioSchema).toBeDefined();
  expect(themeSchema).toBeDefined();

  if (userNameSchema) {
    expect(userNameSchema.schema).toBeDefined();
    expect(userNameSchema.name).toBeDefined();
  }

  if (bioSchema) {
    expect(bioSchema.schema).toBeDefined();
    expect(bioSchema.name).toBeDefined();
  }

  if (themeSchema) {
    expect(themeSchema.schema).toBeDefined();
    expect(themeSchema.name).toBeDefined();
  }
});

test('decomposeSchema - large enum splitting', () => {
  // Create a large enum to test splitting
  const largeEnumOptions = Array.from({ length: 300 }, (_, i) => `option${i}`);

  const schema = z.object({
    category: z.enum(largeEnumOptions as [string, ...string[]]),
    name: z.string(),
  });

  const decomposed = decomposeSchema(schema, {
    maxTokensPerSchema: 100,
    maxOptionsPerEnum: 50,
  });

  expect(decomposed).toBeDefined();

  // Should split the large enum into multiple schemas
  const enumSchemas = decomposed.filter((item) =>
    item.targetPaths.some((path) => path.includes('[')),
  );

  // Should have multiple enum chunks
  expect(enumSchemas.length > 1).toBe(true);

  // Test that decomposed enum schemas work correctly with safeParse
  enumSchemas.forEach((enumSchema) => {
    const categoryField = enumSchema.schema.shape?.category;
    if (categoryField?.options) {
      const validOption = categoryField.options[0];
      const testData = {
        category: validOption,
        name: 'Test Name'
      };

      expect(enumSchema.schema.safeParse(testData).success).toBe(true);

      // Test with invalid enum option
      const invalidData = {
        category: 'invalid-option-not-in-enum',
        name: 'Test Name'
      };

      expect(enumSchema.schema.safeParse(invalidData).success).toBe(false);
    }
  });

  // Also test the regular 'name' field schema if it exists
  const nameSchema = decomposed.find(item =>
    item.targetPaths.includes('name') && !item.targetPaths.some(path => path.includes('['))
  );

  if (nameSchema) {
    expect(nameSchema.schema.safeParse({ name: 'Test Name' }).success).toBe(true);
    expect(nameSchema.schema.safeParse({ name: 123 }).success).toBe(false);
  }
});

test('applyPartialUpdate - basic property update', () => {
  const currentState = {
    name: 'John',
    age: 30,
    email: 'john@example.com',
  };

  const targetPaths = ['name', 'age'];
  const partialUpdate = {
    name: 'Jane',
    age: 25,
  };

  const result = applyPartialUpdate(
    currentState,
    targetPaths,
    partialUpdate,
  ) as typeof currentState;

  expect(result.name).toBe('Jane');
  expect(result.age).toBe(25);
  expect(result.email).toBe('john@example.com');
});

test('applyPartialUpdate - nested property update', () => {
  const currentState = {
    user: {
      name: 'John',
      profile: {
        bio: 'Original bio',
        avatar: 'avatar1.jpg',
      },
    },
    settings: {
      theme: 'light',
      notifications: true,
    },
  };

  const targetPaths = ['user.profile.bio', 'settings.theme'];
  const partialUpdate = {
    bio: 'Updated bio',
    theme: 'dark',
  };

  const result = applyPartialUpdate(
    currentState,
    targetPaths,
    partialUpdate,
  ) as typeof currentState;

  expect(result.user.profile.bio).toBe('Updated bio');
  expect(result.settings.theme).toBe('dark');
  expect(result.user.name).toBe('John');
  expect(result.user.profile.avatar).toBe('avatar1.jpg');
  expect(result.settings.notifications).toBe(true);
});

test('schema validity - decomposed schemas produce valid data', () => {
  const originalSchema = z.object({
    user: z.object({
      name: z.string(),
      age: z.number(),
    }),
    settings: z.object({
      theme: z.enum(['light', 'dark']),
      notifications: z.boolean(),
    }),
  });

  const decomposed = decomposeSchema(originalSchema, { maxTokensPerSchema: 150 });

  // Create test data that should be valid
  const testData = {
    user: {
      name: 'Test User',
      age: 25,
    },
    settings: {
      theme: 'dark' as const,
      notifications: true,
    },
  };

  // Validate with original schema
  const originalResult = originalSchema.safeParse(testData);
  expect(originalResult.success).toBe(true);

  // Apply updates using each decomposed schema and verify the result is still valid
  decomposed.forEach((decomposedItem) => {
    const sampleUpdate: Record<string, unknown> = {};
    decomposedItem.targetPaths.forEach((path) => {
      if (path === 'user.name') sampleUpdate.name = 'Test User Updated';
      if (path === 'user.age') sampleUpdate.age = 26;
      if (path === 'settings.theme') sampleUpdate.theme = 'light';
      if (path === 'settings.notifications')
        sampleUpdate.notifications = false;
    });

    if (Object.keys(sampleUpdate).length > 0) {
      const updatedData = applyPartialUpdate(
        testData,
        decomposedItem.targetPaths,
        sampleUpdate,
      );
      const finalResult = originalSchema.safeParse(updatedData);
      expect(finalResult.success).toBe(true);
    }
  });
});

test('roundtrip test - multiple partial updates should preserve validity', () => {
  const schema = z.object({
    personal: z.object({
      firstName: z.string(),
      lastName: z.string(),
      age: z.number(),
    }),
    contact: z.object({
      email: z.string().email(),
      phone: z.string(),
    }),
    preferences: z.object({
      theme: z.enum(['light', 'dark', 'auto']),
      language: z.enum(['en', 'es', 'fr', 'de']),
      notifications: z.boolean(),
    }),
  });

  const decomposed = decomposeSchema(schema, { maxTokensPerSchema: 200 });

  // Start with valid initial data
  let currentData = {
    personal: {
      firstName: 'John',
      lastName: 'Doe',
      age: 30,
    },
    contact: {
      email: 'john@example.com',
      phone: '+1234567890',
    },
    preferences: {
      theme: 'light' as const,
      language: 'en' as const,
      notifications: true,
    },
  };

  // Verify initial data is valid
  const initialResult = schema.safeParse(currentData);
  expect(initialResult.success).toBe(true);

  // Apply multiple partial updates
  decomposed.forEach((decomposedItem, index) => {
    const updates: Record<string, unknown> = {};

    decomposedItem.targetPaths.forEach((path) => {
      const pathParts = path.split('.');
      const finalKey = pathParts[pathParts.length - 1];

      switch (finalKey) {
        case 'firstName':
          updates[finalKey] = `UpdatedFirst${index}`;
          break;
        case 'lastName':
          updates[finalKey] = `UpdatedLast${index}`;
          break;
        case 'age':
          updates[finalKey] = 25 + index;
          break;
        case 'email':
          updates[finalKey] = `updated${index}@example.com`;
          break;
        case 'phone':
          updates[finalKey] = `+123456789${index}`;
          break;
        case 'theme':
          updates[finalKey] = index % 2 === 0 ? 'dark' : 'light';
          break;
        case 'language':
          updates[finalKey] = ['en', 'es', 'fr'][index % 3];
          break;
        case 'notifications':
          updates[finalKey] = index % 2 === 0;
          break;
      }
    });

    if (Object.keys(updates).length > 0) {
      currentData = applyPartialUpdate(
        currentData,
        decomposedItem.targetPaths,
        updates,
      ) as typeof currentData;

      const updateResult = schema.safeParse(currentData);
      expect(updateResult.success).toBe(true);
    }
  });
});

// Slice notation tests

test('parseEnumSplit - handles all slice notation formats', () => {
  // Regular path
  expect(parseEnumSplit('category')).toEqual({ path: 'category' });

  // Chunk size notation
  expect(parseEnumSplit('category[50]')).toEqual({
    path: 'category',
    chunkSize: 50,
  });

  // Full slice notation
  expect(parseEnumSplit('category[10:20]')).toEqual({
    path: 'category',
    start: 10,
    end: 20,
  });

  // From index to end
  expect(parseEnumSplit('category[10:]')).toEqual({
    path: 'category',
    start: 10,
    end: undefined,
  });

  // From start to index
  expect(parseEnumSplit('category[:20]')).toEqual({
    path: 'category',
    start: 0,
    end: 20,
  });

  // Entire enum
  expect(parseEnumSplit('category[:]')).toEqual({
    path: 'category',
    start: 0,
    end: undefined,
  });
});

test('parseEnumSplit - regular paths have no special flags', () => {
  const result = parseEnumSplit('metadata');
  expect(result).toEqual({ path: 'metadata' });

  const nestedResult = parseEnumSplit('user.profile.bio');
  expect(nestedResult).toEqual({ path: 'user.profile.bio' });
});

test('validateSliceCompleteness - valid complete slices', () => {
  const slices = [
    { start: 0, end: 50, item: 'category[0:50]' },
    { start: 50, end: 100, item: 'category[50:100]' },
    { start: 100, end: 150, item: 'category[100:150]' },
  ];

  const errors = validateSliceCompleteness('category', slices, 150);
  expect(errors.length).toBe(0);
});

test('validateSliceCompleteness - detects gaps', () => {
  const slices = [
    { start: 0, end: 50, item: 'category[0:50]' },
    { start: 60, end: 100, item: 'category[60:100]' }, // Gap from 50-60
  ];

  const errors = validateSliceCompleteness('category', slices, 100);
  expect(errors.length).toBe(1);
  expect(errors[0].includes('Gap in enum slices')).toBe(true);
  expect(errors[0].includes('[50:60]')).toBe(true);
});

test('validateSliceCompleteness - detects overlaps', () => {
  const slices = [
    { start: 0, end: 50, item: 'category[0:50]' },
    { start: 45, end: 100, item: 'category[45:100]' }, // Overlap from 45-50
  ];

  const errors = validateSliceCompleteness('category', slices, 100);
  expect(errors.length).toBe(1);
  expect(errors[0].includes('Overlapping enum slices')).toBe(true);
});

test('validateSliceCompleteness - detects incomplete coverage', () => {
  const slices = [
    { start: 0, end: 50, item: 'category[0:50]' },
    { start: 50, end: 80, item: 'category[50:80]' }, // Missing 80-100
  ];

  const errors = validateSliceCompleteness('category', slices, 100);
  expect(errors.length).toBe(1);
  expect(errors[0].includes('Incomplete enum slices')).toBe(true);
  expect(errors[0].includes('[80:100]')).toBe(true);
});

test('decomposeSchema - manual slice notation', () => {
  const enumOptions = Array.from({ length: 200 }, (_, i) => `option${i}`);
  const schema = z.object({
    category: z.enum(enumOptions as [string, ...string[]]),
    name: z.string(),
  });

  const plan = [
    'name',
    'category[0:100]',
    'category[100:150]',
    'category[150:]',
  ];

  const decomposed = decomposeSchema(schema, plan);

  expect(decomposed.length).toBe(4);

  const categorySchemas = decomposed.filter((d) => d.name.includes('category'));
  expect(categorySchemas.length).toBe(3);

  categorySchemas.forEach((categorySchema) => {
    const schemaShape = (categorySchema.schema as z.ZodObject).shape;
    const enumSchema = schemaShape.category;
    expect(enumSchema instanceof z.ZodEnum).toBe(true);
    const enumOptions = enumSchema.options;
    expect(enumOptions.length > 0).toBe(true);

    const validOption = enumOptions[0];
    expect(categorySchema.schema.safeParse({
      category: validOption,
      name: 'Test Item'
    }).success).toBe(true);

    const invalidOption = 'not-in-this-slice';
    expect(categorySchema.schema.safeParse({
      category: invalidOption,
      name: 'Test Item'
    }).success).toBe(false);
  });

  const nameSchema = decomposed.find(d => d.name === 'name');
  expect(nameSchema).toBeDefined();
  expect(nameSchema.schema.safeParse({
    name: 'Valid Name'
  }).success).toBe(true);
  expect(nameSchema.schema.safeParse({
    name: 123
  }).success).toBe(false);
});

test('decomposeSchema - shorthand slice notation', () => {
  const enumOptions = Array.from({ length: 100 }, (_, i) => `item${i}`);
  const schema = z.object({
    items: z.enum(enumOptions as [string, ...string[]]),
    description: z.string(),
  });

  const plan = [
    'description',
    'items[:50]', // First 50 items
    'items[50:]', // Remaining items
  ];

  const decomposed = decomposeSchema(schema, plan);

  expect(decomposed.length).toBe(3);

  const itemSchemas = decomposed.filter((d) => d.name.includes('items'));
  expect(itemSchemas.length).toBe(2);

  const firstSlice = itemSchemas.find((d) => d.name.includes('0'));
  expect(firstSlice).toBeDefined();
  const firstSchemaShape = (firstSlice.schema as z.ZodObject).shape;
  const firstEnum = firstSchemaShape.items;
  expect(firstEnum.options.length).toBe(50);

  const secondSlice = itemSchemas.find((d) => d.name.includes('end'));
  expect(secondSlice).toBeDefined();
  const secondSchemaShape = (secondSlice.schema as z.ZodObject).shape;
  const secondEnum = secondSchemaShape.items;
  expect(secondEnum.options.length).toBe(50);

  const firstValidOption = firstEnum.options[0];
  expect(firstSlice.schema.safeParse({
    items: firstValidOption,
    description: 'First slice test'
  }).success).toBe(true);

  expect(firstSlice.schema.safeParse({
    items: 'item75',
    description: 'First slice test'
  }).success).toBe(false);

  const secondValidOption = secondEnum.options[0];
  expect(secondSlice.schema.safeParse({
    items: secondValidOption,
    description: 'Second slice test'
  }).success).toBe(true);

  expect(secondSlice.schema.safeParse({
    items: 'item25',
    description: 'Second slice test'
  }).success).toBe(false);

  const descriptionSchema = decomposed.find(d => d.name === 'description');
  expect(descriptionSchema).toBeDefined();
  expect(descriptionSchema.schema.safeParse({
    description: 'Valid description string'
  }).success).toBe(true);
  expect(descriptionSchema.schema.safeParse({
    description: 42
  }).success).toBe(false);
});

test('validatePlan - validates slice completeness', () => {
  const enumOptions = Array.from({ length: 100 }, (_, i) => `option${i}`);
  const schema = z.object({
    category: z.enum(enumOptions as [string, ...string[]]),
    name: z.string(),
  });

  // Valid complete slices
  const validPlan = ['name', 'category[0:50]', 'category[50:100]'];
  const validErrors = validatePlan(validPlan, schema);
  expect(validErrors.length).toBe(0);

  // Invalid incomplete slices
  const invalidPlan = ['name', 'category[0:50]', 'category[60:100]']; // Gap 50-60
  const invalidErrors = validatePlan(invalidPlan, schema);
  expect(invalidErrors.length > 0).toBe(true);
  expect(
    invalidErrors.some((error) => error.includes('Gap in enum slices')),
  ).toBe(true);

  // Invalid overlapping slices
  const overlapPlan = ['name', 'category[0:60]', 'category[50:100]']; // Overlap 50-60
  const overlapErrors = validatePlan(overlapPlan, schema);
  expect(overlapErrors.length > 0).toBe(true);
  expect(
    overlapErrors.some((error) => error.includes('Overlapping enum slices')),
  ).toBe(true);
});

test('validatePlan - validates slice bounds', () => {
  const enumOptions = Array.from({ length: 50 }, (_, i) => `option${i}`);
  const schema = z.object({
    category: z.enum(enumOptions as [string, ...string[]]),
  });

  // Out of bounds end index
  const outOfBoundsPlan = ['category[0:100]'];
  const errors = validatePlan(outOfBoundsPlan, schema);
  expect(errors.length > 0).toBe(true);
  expect(errors.some((error) => error.includes('exceeds enum length'))).toBe(true);

  // Negative start index
  const negativePlan = ['category[-5:10]'];
  const negativeErrors = validatePlan(negativePlan, schema);
  expect(negativeErrors.length > 0).toBe(true);
  expect(
    negativeErrors.some((error) =>
      error.includes('Start index cannot be negative'),
    ),
  ).toBe(true);

  // Start >= end
  const invalidRangePlan = ['category[10:5]'];
  const rangeErrors = validatePlan(invalidRangePlan, schema);
  expect(rangeErrors.length > 0).toBe(true);
  expect(
    rangeErrors.some((error) =>
      error.includes('Start index must be less than end index'),
    ),
  ).toBe(true);
});

test('decomposeSchema - mixed chunk and slice notation', () => {
  const enumOptions = Array.from({ length: 300 }, (_, i) => `option${i}`);
  const schema = z.object({
    largeCat: z.enum(enumOptions as [string, ...string[]]),
    smallCat: z.enum(['a', 'b', 'c', 'd', 'e'] as [string, ...string[]]),
    name: z.string(),
  });

  const plan = [
    'name',
    'largeCat[50]',
    'smallCat[0:3]',
    'smallCat[3:]',
  ];

  const decomposed = decomposeSchema(schema, plan);

  expect(decomposed.length >= 4).toBe(true);

  const largeCatChunks = decomposed.filter((d) => d.name.includes('largeCat'));
  expect(largeCatChunks.length > 1).toBe(true);

  const smallCatSlices = decomposed.filter((d) => d.name.includes('smallCat'));
  expect(smallCatSlices.length).toBe(2);
});

// Array and record path tests (no bracket notation — auto-detected from schema)

test('decomposeSchema - array path extracts raw array schema', () => {
  const schema = z.object({
    users: z.array(z.object({
      name: z.string(),
      email: z.string().email(),
      age: z.number()
    })),
    title: z.string()
  });

  const plan = ['title', 'users'];
  const decomposed = decomposeSchema(schema, plan);

  expect(decomposed.length).toBe(2);

  // Check title schema
  const titleSchema = decomposed.find(d => d.name === 'title');
  expect(titleSchema).toBeDefined();
  expect(titleSchema.targetPaths).toEqual(['title']);
  expect(titleSchema.schema.safeParse({
    title: 'Hello, world!'
  }).success).toBe(true);

  // Check users schema — should contain the raw array, NOT { index, value }
  const usersSchema = decomposed.find(d => d.targetPaths.includes('users'));
  expect(usersSchema).toBeDefined();

  const usersSchemaShape = (usersSchema.schema as z.ZodObject).shape;
  // Should have 'users' key wrapping the array
  expect(usersSchemaShape.users).toBeDefined();
  expect(usersSchemaShape.users instanceof z.ZodArray).toBe(true);

  // Should NOT have { index, value } structure
  expect(usersSchemaShape.index).toBeUndefined();
  expect(usersSchemaShape.value).toBeUndefined();
});

test('decomposeSchema - record path extracts raw record schema', () => {
  const schema = z.object({
    configs: z.record(z.string(), z.object({
      enabled: z.boolean(),
      value: z.string()
    })),
    metadata: z.string()
  });

  const plan = ['metadata', 'configs'];
  const decomposed = decomposeSchema(schema, plan);

  expect(decomposed.length).toBe(2);

  // Check metadata schema
  const metadataSchema = decomposed.find(d => d.name === 'metadata');
  expect(metadataSchema).toBeDefined();
  expect(metadataSchema.targetPaths).toEqual(['metadata']);

  // Check configs schema — should contain the raw record, NOT { key, value }
  const configsSchema = decomposed.find(d => d.targetPaths.includes('configs'));
  expect(configsSchema).toBeDefined();

  const configsSchemaShape = (configsSchema.schema as z.ZodObject).shape;
  // Should have 'configs' key wrapping the record
  expect(configsSchemaShape.configs).toBeDefined();
  expect(configsSchemaShape.configs instanceof z.ZodRecord).toBe(true);

  // Should NOT have { key, value } structure
  expect(configsSchemaShape.key).toBeUndefined();
  expect(configsSchemaShape.value).toBeUndefined();
});

test('decomposeSchema - mixed array and record paths', () => {
  const schema = z.object({
    users: z.array(z.object({
      name: z.string(),
      email: z.string()
    })),
    settings: z.record(z.string(), z.object({
      enabled: z.boolean(),
      config: z.string()
    })),
    metadata: z.object({
      version: z.string(),
      description: z.string()
    })
  });

  const plan = ['metadata', 'users', 'settings'];
  const decomposed = decomposeSchema(schema, plan);

  expect(decomposed.length).toBe(3);

  // Check all three schemas exist
  const metadataSchema = decomposed.find(d => d.targetPaths.includes('metadata'));
  const usersSchema = decomposed.find(d => d.targetPaths.includes('users'));
  const settingsSchema = decomposed.find(d => d.targetPaths.includes('settings'));

  expect(metadataSchema).toBeDefined();
  expect(usersSchema).toBeDefined();
  expect(settingsSchema).toBeDefined();

  // Verify schemas contain raw types
  const usersShape = (usersSchema.schema as z.ZodObject).shape;
  expect(usersShape.users instanceof z.ZodArray).toBe(true);

  const settingsShape = (settingsSchema.schema as z.ZodObject).shape;
  expect(settingsShape.settings instanceof z.ZodRecord).toBe(true);
});

// Deep path tests (paths through array elements)

test('getSchemaAtDeepPath - traverses through arrays', () => {
  const schema = z.object({
    views: z.array(z.object({
      name: z.string(),
      tracks: z.object({
        top: z.array(z.object({
          type: z.string(),
          height: z.number(),
        })),
      }),
    })),
  });

  // Simple top-level path
  const viewsResult = getSchemaAtDeepPath(schema, 'views');
  expect(viewsResult).toBeDefined();
  expect(viewsResult!.schema instanceof z.ZodArray).toBe(true);
  expect(viewsResult!.segments).toEqual([
    { key: 'views', collectionType: 'none' },
  ]);

  // Path through array element
  const tracksResult = getSchemaAtDeepPath(schema, 'views.tracks');
  expect(tracksResult).toBeDefined();
  expect(tracksResult!.segments).toEqual([
    { key: 'views', collectionType: 'array' },
    { key: 'tracks', collectionType: 'none' },
  ]);

  // Nested path through array to sub-array
  const topResult = getSchemaAtDeepPath(schema, 'views.tracks.top');
  expect(topResult).toBeDefined();
  expect(topResult!.schema instanceof z.ZodArray).toBe(true);
  expect(topResult!.segments).toEqual([
    { key: 'views', collectionType: 'array' },
    { key: 'tracks', collectionType: 'none' },
    { key: 'top', collectionType: 'none' },
  ]);
});

test('getSchemaAtDeepPath - traverses through records', () => {
  const schema = z.object({
    configs: z.record(z.string(), z.object({
      settings: z.object({
        enabled: z.boolean(),
      }),
    })),
  });

  const result = getSchemaAtDeepPath(schema, 'configs.settings');
  expect(result).toBeDefined();
  expect(result!.segments).toEqual([
    { key: 'configs', collectionType: 'record' },
    { key: 'settings', collectionType: 'none' },
  ]);
});

test('getSchemaAtDeepPath - returns undefined for invalid paths', () => {
  const schema = z.object({
    views: z.array(z.object({
      name: z.string(),
    })),
  });

  expect(getSchemaAtDeepPath(schema, 'views.nonexistent')).toBeUndefined();
  expect(getSchemaAtDeepPath(schema, 'nonexistent')).toBeUndefined();
});

test('decomposeSchema - deep path through array extracts top-level key', () => {
  const schema = z.object({
    views: z.array(z.object({
      name: z.string(),
      tracks: z.object({
        top: z.array(z.object({
          type: z.string(),
        })),
        bottom: z.array(z.object({
          type: z.string(),
        })),
      }),
    })),
    title: z.string(),
  });

  const plan = ['title', 'views.tracks.top'];
  const decomposed = decomposeSchema(schema, plan);

  expect(decomposed.length).toBe(2);

  const titleSchema = decomposed.find(d => d.targetPaths.includes('title'));
  expect(titleSchema).toBeDefined();

  // Deep path should extract the top-level key 'views' with full path in targetPaths
  const tracksTopSchema = decomposed.find(d =>
    d.targetPaths.includes('views.tracks.top')
  );
  expect(tracksTopSchema).toBeDefined();
  expect(tracksTopSchema!.name).toBe('views-tracks-top');

  // The schema should wrap the top-level 'views' property
  const shape = (tracksTopSchema!.schema as z.ZodObject).shape;
  expect(shape.views).toBeDefined();
  expect(shape.views instanceof z.ZodArray).toBe(true);
});

test('validatePlan - validates deep paths through arrays', () => {
  const schema = z.object({
    views: z.array(z.object({
      name: z.string(),
      tracks: z.object({
        top: z.array(z.object({
          type: z.string(),
        })),
      }),
    })),
  });

  // Valid deep path
  const validErrors = validatePlan(['views.tracks.top'], schema);
  expect(validErrors.length).toBe(0);

  // Invalid deep path
  const invalidErrors = validatePlan(['views.tracks.nonexistent'], schema);
  expect(invalidErrors.length).toBe(1);
  expect(invalidErrors[0]).toContain('does not exist');
});
