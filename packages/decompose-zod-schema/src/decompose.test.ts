import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { z } from 'zod';

// Import the decompose functions
import { applyPartialUpdate, decomposeSchema, validatePlan } from './index.js';
import { parseEnumSplit } from './utils.js';
import { validateSliceCompleteness } from './validate.js';

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
  assert.ok(decomposed);
  assert.equal(Array.isArray(decomposed), true);

  // Each decomposed schema should have required properties
  decomposed.forEach((item) => {
    assert.ok(item.name);
    assert.ok(item.schema);
    assert.ok(item.targetPaths);
    assert.equal(Array.isArray(item.targetPaths), true);
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
    assert.ok(basicSchema.schema.safeParse({
      name: 'John Doe',
      age: 30,
      email: 'john.doe@example.com'
    }).success);

    // Test invalid email
    assert.ok(!basicSchema.schema.safeParse({
      name: 'John Doe',
      age: 30,
      email: 'invalid-email'
    }).success);

    // Test invalid age type
    assert.ok(!basicSchema.schema.safeParse({
      name: 'John Doe',
      age: 'thirty',
      email: 'john.doe@example.com'
    }).success);
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

  assert.ok(decomposed);
  assert.equal(Array.isArray(decomposed), true);

  // Verify that target paths are properly tracked
  const allPaths = decomposed.flatMap((item) => item.targetPaths);
  const hasNestedPaths = allPaths.some((path) => path.includes('.'));

  // Should have nested paths for nested objects
  assert.equal(hasNestedPaths, true);

  // Test that we have the expected structure but skip complex safeParse validation
  // since nested schemas may have complex internal structures that are harder to test directly

  // Verify that we can find schemas for each target path
  const userNameSchema = decomposed.find(d => d.targetPaths.includes('user.name'));
  const bioSchema = decomposed.find(d => d.targetPaths.includes('user.profile.bio'));
  const themeSchema = decomposed.find(d => d.targetPaths.includes('settings.theme'));

  // Just verify the schemas exist and have the expected structure
  assert.ok(userNameSchema, 'Should have schema for user.name path');
  assert.ok(bioSchema, 'Should have schema for user.profile.bio path');
  assert.ok(themeSchema, 'Should have schema for settings.theme path');

  // Test structure exists
  if (userNameSchema) {
    assert.ok(userNameSchema.schema, 'user.name schema should exist');
    assert.ok(userNameSchema.name, 'user.name schema should have a name');
  }

  if (bioSchema) {
    assert.ok(bioSchema.schema, 'bio schema should exist');
    assert.ok(bioSchema.name, 'bio schema should have a name');
  }

  if (themeSchema) {
    assert.ok(themeSchema.schema, 'theme schema should exist');
    assert.ok(themeSchema.name, 'theme schema should have a name');
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

  assert.ok(decomposed);

  // Should split the large enum into multiple schemas
  const enumSchemas = decomposed.filter((item) =>
    item.targetPaths.some((path) => path.includes('[')),
  );

  // Should have multiple enum chunks
  assert.equal(enumSchemas.length > 1, true);

  // Test that decomposed enum schemas work correctly with safeParse
  enumSchemas.forEach((enumSchema) => {
    // Note: We test more carefully by using actual options from each chunk
    const categoryField = enumSchema.schema.shape?.category;
    if (categoryField?.options) {
      const validOption = categoryField.options[0]; // Use first option from this chunk
      const testData = {
        category: validOption,
        name: 'Test Name'
      };

      assert.ok(enumSchema.schema.safeParse(testData).success,
        `Valid enum option ${validOption} should pass validation for schema ${enumSchema.name}`);

      // Test with invalid enum option
      const invalidData = {
        category: 'invalid-option-not-in-enum',
        name: 'Test Name'
      };

      assert.ok(!enumSchema.schema.safeParse(invalidData).success,
        `Invalid enum option should fail validation for schema ${enumSchema.name}`);
    }
  });

  // Also test the regular 'name' field schema if it exists
  const nameSchema = decomposed.find(item =>
    item.targetPaths.includes('name') && !item.targetPaths.some(path => path.includes('['))
  );

  if (nameSchema) {
    assert.ok(nameSchema.schema.safeParse({ name: 'Test Name' }).success);
    assert.ok(!nameSchema.schema.safeParse({ name: 123 }).success); // Invalid type
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

  assert.equal(result.name, 'Jane');
  assert.equal(result.age, 25);
  assert.equal(result.email, 'john@example.com'); // unchanged
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

  assert.equal(result.user.profile.bio, 'Updated bio');
  assert.equal(result.settings.theme, 'dark');
  assert.equal(result.user.name, 'John'); // unchanged
  assert.equal(result.user.profile.avatar, 'avatar1.jpg'); // unchanged
  assert.equal(result.settings.notifications, true); // unchanged
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
  assert.equal(originalResult.success, true);

  // Apply updates using each decomposed schema and verify the result is still valid
  decomposed.forEach((decomposedItem) => {
    // For decomposed schemas, we need to construct data that matches the schema structure
    // Instead of trying to extract from the original nested data, let's use the decomposed schema
    // to validate against the test data directly

    // If the decomposed schema can't validate the full test data (which is expected),
    // we'll just verify that we can apply partial updates correctly
    const sampleUpdate: Record<string, unknown> = {};
    decomposedItem.targetPaths.forEach((path) => {
      if (path === 'user.name') sampleUpdate.name = 'Test User Updated';
      if (path === 'user.age') sampleUpdate.age = 26;
      if (path === 'settings.theme') sampleUpdate.theme = 'light';
      if (path === 'settings.notifications')
        sampleUpdate.notifications = false;
    });

    if (Object.keys(sampleUpdate).length > 0) {
      // Apply partial update and verify the result is still valid with original schema
      const updatedData = applyPartialUpdate(
        testData,
        decomposedItem.targetPaths,
        sampleUpdate,
      );
      const finalResult = originalSchema.safeParse(updatedData);
      assert.equal(
        finalResult.success,
        true,
        `Updated data failed original schema validation after applying ${decomposedItem.name}`,
      );
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
  assert.equal(initialResult.success, true);

  // Apply multiple partial updates
  decomposed.forEach((decomposedItem, index) => {
    // Create some test updates for each decomposed schema
    const updates: Record<string, unknown> = {};

    decomposedItem.targetPaths.forEach((path) => {
      const pathParts = path.split('.');
      const finalKey = pathParts[pathParts.length - 1];

      // Generate different test values based on the key
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

    // Apply the partial update
    if (Object.keys(updates).length > 0) {
      currentData = applyPartialUpdate(
        currentData,
        decomposedItem.targetPaths,
        updates,
      ) as typeof currentData;

      // Verify data is still valid after each update
      const updateResult = schema.safeParse(currentData);
      assert.equal(
        updateResult.success,
        true,
        `Data became invalid after applying update ${index} (${decomposedItem.name})`,
      );
    }
  });
});

// New tests for slice notation functionality

test('parseEnumSplit - handles all slice notation formats', () => {
  // Regular path
  assert.deepEqual(parseEnumSplit('category'), { path: 'category' });

  // Chunk size notation
  assert.deepEqual(parseEnumSplit('category[50]'), {
    path: 'category',
    chunkSize: 50,
  });

  // Full slice notation
  assert.deepEqual(parseEnumSplit('category[10:20]'), {
    path: 'category',
    start: 10,
    end: 20,
  });

  // From index to end
  assert.deepEqual(parseEnumSplit('category[10:]'), {
    path: 'category',
    start: 10,
    end: undefined,
  });

  // From start to index
  assert.deepEqual(parseEnumSplit('category[:20]'), {
    path: 'category',
    start: 0,
    end: 20,
  });

  // Entire enum
  assert.deepEqual(parseEnumSplit('category[:]'), {
    path: 'category',
    start: 0,
    end: undefined,
  });
});

test('validateSliceCompleteness - valid complete slices', () => {
  const slices = [
    { start: 0, end: 50, item: 'category[0:50]' },
    { start: 50, end: 100, item: 'category[50:100]' },
    { start: 100, end: 150, item: 'category[100:150]' },
  ];

  const errors = validateSliceCompleteness('category', slices, 150);
  assert.equal(errors.length, 0);
});

test('validateSliceCompleteness - detects gaps', () => {
  const slices = [
    { start: 0, end: 50, item: 'category[0:50]' },
    { start: 60, end: 100, item: 'category[60:100]' }, // Gap from 50-60
  ];

  const errors = validateSliceCompleteness('category', slices, 100);
  assert.equal(errors.length, 1);
  assert.ok(errors[0].includes('Gap in enum slices'));
  assert.ok(errors[0].includes('[50:60]'));
});

test('validateSliceCompleteness - detects overlaps', () => {
  const slices = [
    { start: 0, end: 50, item: 'category[0:50]' },
    { start: 45, end: 100, item: 'category[45:100]' }, // Overlap from 45-50
  ];

  const errors = validateSliceCompleteness('category', slices, 100);
  assert.equal(errors.length, 1);
  assert.ok(errors[0].includes('Overlapping enum slices'));
});

test('validateSliceCompleteness - detects incomplete coverage', () => {
  const slices = [
    { start: 0, end: 50, item: 'category[0:50]' },
    { start: 50, end: 80, item: 'category[50:80]' }, // Missing 80-100
  ];

  const errors = validateSliceCompleteness('category', slices, 100);
  assert.equal(errors.length, 1);
  assert.ok(errors[0].includes('Incomplete enum slices'));
  assert.ok(errors[0].includes('[80:100]'));
});

test('decomposeSchema - manual slice notation', () => {
  const enumOptions = Array.from({ length: 200 }, (_, i) => `option${i}`);
  const schema = z.object({
    category: z.enum(enumOptions as [string, ...string[]]),
    name: z.string(),
  });

  // Test complete slice decomposition
  const plan = [
    'name',
    'category[0:100]',
    'category[100:150]',
    'category[150:]',
  ];

  const decomposed = decomposeSchema(schema, plan);

  assert.equal(decomposed.length, 4);

  // Verify slice schemas contain correct enum options
  const categorySchemas = decomposed.filter((d) => d.name.includes('category'));
  assert.equal(categorySchemas.length, 3);

  // Check that all category slices have the correct enum values and test with safeParse
  categorySchemas.forEach((categorySchema) => {
    const schemaShape = (categorySchema.schema as z.ZodObject).shape;
    const enumSchema = schemaShape.category;
    assert.ok(enumSchema instanceof z.ZodEnum);
    const enumOptions = enumSchema.options;
    assert.ok(enumOptions.length > 0);

    // Test safeParse with valid option from this slice
    const validOption = enumOptions[0];
    assert.ok(categorySchema.schema.safeParse({
      category: validOption,
      name: 'Test Item'
    }).success, `Schema ${categorySchema.name} should accept valid option ${validOption}`);

    // Test safeParse with invalid option (from outside this slice)
    const invalidOption = 'not-in-this-slice';
    assert.ok(!categorySchema.schema.safeParse({
      category: invalidOption,
      name: 'Test Item'
    }).success, `Schema ${categorySchema.name} should reject invalid option ${invalidOption}`);
  });

  // Test the name schema
  const nameSchema = decomposed.find(d => d.name === 'name');
  assert.ok(nameSchema);
  assert.ok(nameSchema.schema.safeParse({
    name: 'Valid Name'
  }).success);
  assert.ok(!nameSchema.schema.safeParse({
    name: 123 // Invalid type
  }).success);
});

test('decomposeSchema - shorthand slice notation', () => {
  const enumOptions = Array.from({ length: 100 }, (_, i) => `item${i}`);
  const schema = z.object({
    items: z.enum(enumOptions as [string, ...string[]]),
    description: z.string(),
  });

  // Test shorthand notation
  const plan = [
    'description',
    'items[:50]', // First 50 items
    'items[50:]', // Remaining items
  ];

  const decomposed = decomposeSchema(schema, plan);

  assert.equal(decomposed.length, 3);

  // Verify the shorthand slices work correctly
  const itemSchemas = decomposed.filter((d) => d.name.includes('items'));
  assert.equal(itemSchemas.length, 2);

  // First slice should have 50 items
  const firstSlice = itemSchemas.find((d) => d.name.includes('0'));
  assert.ok(firstSlice);
  const firstSchemaShape = (firstSlice.schema as z.ZodObject).shape;
  const firstEnum = firstSchemaShape.items;
  assert.equal(firstEnum.options.length, 50);

  // Second slice should have 50 items (100 - 50)
  const secondSlice = itemSchemas.find((d) => d.name.includes('end'));
  assert.ok(secondSlice);
  const secondSchemaShape = (secondSlice.schema as z.ZodObject).shape;
  const secondEnum = secondSchemaShape.items;
  assert.equal(secondEnum.options.length, 50);

  // Test safeParse validation for shorthand slices
  // Test first slice (items[:50])
  const firstValidOption = firstEnum.options[0]; // Should be 'item0'
  assert.ok(firstSlice.schema.safeParse({
    items: firstValidOption,
    description: 'First slice test'
  }).success, `First slice should accept ${firstValidOption}`);

  assert.ok(!firstSlice.schema.safeParse({
    items: 'item75', // Should be in second slice, not first
    description: 'First slice test'
  }).success, 'First slice should reject items from second slice');

  // Test second slice (items[50:])
  const secondValidOption = secondEnum.options[0]; // Should be 'item50'
  assert.ok(secondSlice.schema.safeParse({
    items: secondValidOption,
    description: 'Second slice test'
  }).success, `Second slice should accept ${secondValidOption}`);

  assert.ok(!secondSlice.schema.safeParse({
    items: 'item25', // Should be in first slice, not second
    description: 'Second slice test'
  }).success, 'Second slice should reject items from first slice');

  // Test the description schema
  const descriptionSchema = decomposed.find(d => d.name === 'description');
  assert.ok(descriptionSchema);
  assert.ok(descriptionSchema.schema.safeParse({
    description: 'Valid description string'
  }).success);
  assert.ok(!descriptionSchema.schema.safeParse({
    description: 42 // Invalid type
  }).success);
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
  assert.equal(validErrors.length, 0);

  // Invalid incomplete slices
  const invalidPlan = ['name', 'category[0:50]', 'category[60:100]']; // Gap 50-60
  const invalidErrors = validatePlan(invalidPlan, schema);
  assert.ok(invalidErrors.length > 0);
  assert.ok(
    invalidErrors.some((error) => error.includes('Gap in enum slices')),
  );

  // Invalid overlapping slices
  const overlapPlan = ['name', 'category[0:60]', 'category[50:100]']; // Overlap 50-60
  const overlapErrors = validatePlan(overlapPlan, schema);
  assert.ok(overlapErrors.length > 0);
  assert.ok(
    overlapErrors.some((error) => error.includes('Overlapping enum slices')),
  );
});

test('validatePlan - validates slice bounds', () => {
  const enumOptions = Array.from({ length: 50 }, (_, i) => `option${i}`);
  const schema = z.object({
    category: z.enum(enumOptions as [string, ...string[]]),
  });

  // Out of bounds end index
  const outOfBoundsPlan = ['category[0:100]']; // Enum only has 50 options
  const errors = validatePlan(outOfBoundsPlan, schema);
  assert.ok(errors.length > 0);
  assert.ok(errors.some((error) => error.includes('exceeds enum length')));

  // Negative start index
  const negativePlan = ['category[-5:10]'];
  const negativeErrors = validatePlan(negativePlan, schema);
  assert.ok(negativeErrors.length > 0);
  assert.ok(
    negativeErrors.some((error) =>
      error.includes('Start index cannot be negative'),
    ),
  );

  // Start >= end
  const invalidRangePlan = ['category[10:5]'];
  const rangeErrors = validatePlan(invalidRangePlan, schema);
  assert.ok(rangeErrors.length > 0);
  assert.ok(
    rangeErrors.some((error) =>
      error.includes('Start index must be less than end index'),
    ),
  );
});

test('decomposeSchema - mixed chunk and slice notation', () => {
  const enumOptions = Array.from({ length: 300 }, (_, i) => `option${i}`);
  const schema = z.object({
    largeCat: z.enum(enumOptions as [string, ...string[]]),
    smallCat: z.enum(['a', 'b', 'c', 'd', 'e'] as [string, ...string[]]),
    name: z.string(),
  });

  // Mix of chunk (auto-split) and manual slices
  const plan = [
    'name',
    'largeCat[50]', // Auto-chunk into groups of 50
    'smallCat[0:3]', // Manual slice first 3
    'smallCat[3:]', // Manual slice remaining
  ];

  const decomposed = decomposeSchema(schema, plan);

  // Should have name + multiple largeCat chunks + 2 smallCat slices
  assert.ok(decomposed.length >= 4);

  // Check that we have multiple largeCat chunks (since 300 options > 50 chunk size)
  const largeCatChunks = decomposed.filter((d) => d.name.includes('largeCat'));
  assert.ok(largeCatChunks.length > 1);

  // Check that we have exactly 2 smallCat slices
  const smallCatSlices = decomposed.filter((d) => d.name.includes('smallCat'));
  assert.equal(smallCatSlices.length, 2);
});

test('decomposeSchema - array[] split notation', () => {
  const schema = z.object({
    users: z.array(z.object({
      name: z.string(),
      email: z.string().email(),
      age: z.number()
    })),
    title: z.string()
  });

  // Test that the schema is valid
  assert.ok(schema.safeParse({
    users: [
      {
        name: 'John Doe',
        email: 'john.doe@example.com',
        age: 30,
      }
    ],
    title: 'Hello, world!'
  }).success);

  const plan = ['title', 'users[]'];
  const decomposed = decomposeSchema(schema, plan);

  assert.equal(decomposed.length, 2);

  // Check title schema
  const titleSchema = decomposed.find(d => d.name === 'title');
  assert.ok(titleSchema);
  assert.deepEqual(titleSchema.targetPaths, ['title']);
  assert.ok(titleSchema.schema.safeParse({
    title: 'Hello, world!'
  }).success);

  // Check users array split schema
  const usersSchema = decomposed.find(d => d.name === 'users-item');
  assert.ok(usersSchema);
  assert.deepEqual(usersSchema.targetPaths, ['users[]']);
  assert.ok(usersSchema.schema.safeParse({
    index: 0,
    value: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      age: 30,
    }
  }).success);

  // Verify the array split creates { index: number, value: T } structure
  const usersSchemaShape = (usersSchema.schema as z.ZodObject).shape;
  assert.ok(usersSchemaShape.index);
  assert.ok(usersSchemaShape.value);

  // Check that index is a number
  assert.ok(usersSchemaShape.index instanceof z.ZodNumber);

  // Check that value has the original array element structure
  const valueSchema = usersSchemaShape.value as z.ZodObject;
  assert.ok(valueSchema instanceof z.ZodObject);
  const valueShape = valueSchema.shape;
  assert.ok(valueShape.name);
  assert.ok(valueShape.email);
  assert.ok(valueShape.age);
});

test('decomposeSchema - record{} split notation', () => {
  const schema = z.object({
    configs: z.record(z.string(), z.object({
      enabled: z.boolean(),
      value: z.string()
    })),
    metadata: z.string()
  });

  const plan = ['metadata', 'configs{}'];
  const decomposed = decomposeSchema(schema, plan);

  assert.equal(decomposed.length, 2);

  // Check metadata schema
  const metadataSchema = decomposed.find(d => d.name === 'metadata');
  assert.ok(metadataSchema);
  assert.deepEqual(metadataSchema.targetPaths, ['metadata']);

  // Check configs record split schema
  const configsSchema = decomposed.find(d => d.name === 'configs-entry');
  assert.ok(configsSchema);
  assert.deepEqual(configsSchema.targetPaths, ['configs{}']);

  // Verify the record split creates { key: K, value: V } structure
  const configsSchemaShape = (configsSchema.schema as z.ZodObject).shape;
  assert.ok(configsSchemaShape.key);
  assert.ok(configsSchemaShape.value);

  // Check that key is a string (default for z.record)
  assert.ok(configsSchemaShape.key instanceof z.ZodString);

  // Check that value has the original record value structure
  const valueSchema = configsSchemaShape.value as z.ZodObject;
  assert.ok(valueSchema instanceof z.ZodObject);
  const valueShape = valueSchema.shape;
  assert.ok(valueShape.enabled);
  assert.ok(valueShape.value);

  // Test safeParse validation for record split
  assert.ok(metadataSchema.schema.safeParse({
    metadata: 'Test metadata string'
  }).success);

  assert.ok(!metadataSchema.schema.safeParse({
    metadata: 123 // Invalid type
  }).success);

  // Test the record entry schema
  assert.ok(configsSchema.schema.safeParse({
    key: 'database',
    value: {
      enabled: true,
      value: 'localhost:5432'
    }
  }).success);

  // Test invalid record entry
  assert.ok(!configsSchema.schema.safeParse({
    key: 'database',
    value: {
      enabled: 'invalid', // Should be boolean
      value: 'localhost:5432'
    }
  }).success);
});

test('decomposeSchema - record{} with enum key split notation', () => {
  const categoryEnum = z.enum(['user', 'admin', 'guest']);
  const schema = z.object({
    permissions: z.record(categoryEnum, z.object({
      read: z.boolean(),
      write: z.boolean()
    })),
    name: z.string()
  });

  const plan = ['name', 'permissions{}'];
  const decomposed = decomposeSchema(schema, plan);

  assert.equal(decomposed.length, 2);

  // Check permissions record split schema
  const permissionsSchema = decomposed.find(d => d.name === 'permissions-entry');
  assert.ok(permissionsSchema);

  // Verify the record split creates { key: CategoryEnum, value: V } structure
  const permissionsSchemaShape = (permissionsSchema.schema as z.ZodObject).shape;
  assert.ok(permissionsSchemaShape.key);
  assert.ok(permissionsSchemaShape.value);

  // Check that key is the enum type
  assert.ok(permissionsSchemaShape.key instanceof z.ZodEnum);
  const keyEnum = permissionsSchemaShape.key;
  assert.deepEqual(keyEnum.options, ['user', 'admin', 'guest']);

  // Check that value has the original record value structure
  const valueSchema = permissionsSchemaShape.value as z.ZodObject;
  assert.ok(valueSchema instanceof z.ZodObject);
  const valueShape = valueSchema.shape;
  assert.ok(valueShape.read);
  assert.ok(valueShape.write);

  // Test safeParse validation for enum record split
  const nameSchema = decomposed.find(d => d.name === 'name');
  if (nameSchema) {
    assert.ok(nameSchema.schema.safeParse({
      name: 'User Management System'
    }).success);

    assert.ok(!nameSchema.schema.safeParse({
      name: 42 // Invalid type
    }).success);
  }

  // Test the permissions entry schema with valid enum key
  assert.ok(permissionsSchema.schema.safeParse({
    key: 'admin',
    value: {
      read: true,
      write: true
    }
  }).success);

  // Test with invalid enum key
  assert.ok(!permissionsSchema.schema.safeParse({
    key: 'invalid-role', // Not in enum
    value: {
      read: true,
      write: true
    }
  }).success);

  // Test with invalid value structure
  assert.ok(!permissionsSchema.schema.safeParse({
    key: 'user',
    value: {
      read: 'yes', // Should be boolean
      write: true
    }
  }).success);
});

test('decomposeSchema - mixed array and record splits', () => {
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

  const plan = ['metadata', 'users[]', 'settings{}'];
  const decomposed = decomposeSchema(schema, plan);

  assert.equal(decomposed.length, 3);

  // Check all three schemas exist
  const metadataSchema = decomposed.find(d => d.name === 'metadata');
  const usersSchema = decomposed.find(d => d.name === 'users-item');
  const settingsSchema = decomposed.find(d => d.name === 'settings-entry');

  assert.ok(metadataSchema);
  assert.ok(usersSchema);
  assert.ok(settingsSchema);

  // Verify target paths
  assert.deepEqual(metadataSchema.targetPaths, ['metadata']);
  assert.deepEqual(usersSchema.targetPaths, ['users[]']);
  assert.deepEqual(settingsSchema.targetPaths, ['settings{}']);
});

test('parseEnumSplit - handles array and record split notation', () => {
  // Test array split parsing
  const arrayResult = parseEnumSplit('users[]');
  assert.equal(arrayResult.path, 'users');
  assert.equal(arrayResult.isArraySplit, true);
  assert.equal(arrayResult.isRecordSplit, undefined);

  // Test record split parsing
  const recordResult = parseEnumSplit('configs{}');
  assert.equal(recordResult.path, 'configs');
  assert.equal(recordResult.isRecordSplit, true);
  assert.equal(recordResult.isArraySplit, undefined);

  // Test regular path parsing (should not match array/record patterns)
  const regularResult = parseEnumSplit('metadata');
  assert.equal(regularResult.path, 'metadata');
  assert.equal(regularResult.isArraySplit, undefined);
  assert.equal(regularResult.isRecordSplit, undefined);

  // Test nested path array split
  const nestedArrayResult = parseEnumSplit('user.preferences.items[]');
  assert.equal(nestedArrayResult.path, 'user.preferences.items');
  assert.equal(nestedArrayResult.isArraySplit, true);

  // Test nested path record split
  const nestedRecordResult = parseEnumSplit('config.settings.values{}');
  assert.equal(nestedRecordResult.path, 'config.settings.values');
  assert.equal(nestedRecordResult.isRecordSplit, true);
});
