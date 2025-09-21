#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { Command } from 'commander';
import { z } from 'zod';
import { decomposeSchema } from './decompose.js';
import { estimateTokensByJsonSchema } from './utils.js'

interface CliOptions {
  input: string;
  output?: string;
  schema: string;
  tokens: number;
  enumSize: number;
  verbose: boolean;
}

function log(message: string, verbose: boolean) {
  if (verbose) {
    console.log(`[INFO] ${message}`);
  }
}

async function extractSchemaFromFile(
  filePath: string,
  schemaName: string,
): Promise<z.ZodSchema> {
  try {
    // Read the TypeScript file
    await readFile(filePath, 'utf-8');

    // This is a simplified approach - in a real implementation, you might want to:
    // 1. Use a TypeScript parser/AST
    // 2. Dynamically import and evaluate the module
    // 3. Support more complex schema definitions

    // For now, we'll create a simple example schema that users can modify
    const exampleSchema = z.object({
      user: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string().email(),
        age: z.number(),
        profile: z.object({
          bio: z.string(),
          avatar: z.string().url().optional(),
          preferences: z.object({
            theme: z.enum(['light', 'dark', 'auto']),
            language: z.enum([
              'en',
              'es',
              'fr',
              'de',
              'it',
              'pt',
              'ru',
              'ja',
              'ko',
              'zh',
            ]),
            notifications: z.boolean(),
            newsletter: z.boolean(),
          }),
        }),
      }),
      settings: z.object({
        privacy: z.enum(['public', 'private', 'friends']),
        twoFactor: z.boolean(),
        apiKeys: z.array(z.string()),
      }),
      metadata: z.object({
        createdAt: z.date(),
        updatedAt: z.date(),
        version: z.number(),
        tags: z.array(z.string()),
        categories: z.enum(
          Array.from({ length: 150 }, (_, i) => `category-${i}`) as [
            string,
            ...string[],
          ],
        ),
      }),
    });

    // Log warning about simplified extraction
    console.warn(
      `Warning: Using example schema. In a real implementation, this would parse '${schemaName}' from '${filePath}'.`,
    );
    console.warn(
      'To use your own schema, modify the CLI to properly import and extract your schema definition.',
    );

    return exampleSchema;
  } catch (error) {
    throw new Error(
      `Failed to extract schema from ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function main() {
  const program = new Command();

  program
    .name('decompose-zod-schema')
    .description(
      'Utility for decomposing large Zod schemas into smaller, manageable sub-schemas',
    )
    .version('0.1.0')
    .requiredOption(
      '-i, --input <file>',
      'Input TypeScript file containing schema definition',
    )
    .option('-o, --output <file>', 'Output JSON file for decomposed schemas')
    .requiredOption(
      '-s, --schema <name>',
      'Name of the schema variable to decompose',
    )
    .option(
      '-t, --tokens <number>',
      'Maximum tokens per decomposed schema',
      '2000',
    )
    .option(
      '-e, --enum-size <number>',
      'Maximum enum size before splitting',
      '200',
    )
    .option('-v, --verbose', 'Verbose output', false)
    .addHelpText(
      'after',
      `
Examples:
  $ decompose-zod-schema -i schema.ts -s userSchema -o decomposed.json
  $ decompose-zod-schema -i schema.ts -s configSchema -t 1000 -e 100 -v`,
    );

  program.parse();
  const options = program.opts() as CliOptions;

  // Convert string options to numbers
  options.tokens = parseInt(options.tokens as unknown as string, 10);
  options.enumSize = parseInt(options.enumSize as unknown as string, 10);

  try {
    log(
      `Extracting schema '${options.schema}' from '${options.input}'`,
      options.verbose,
    );
    const schema = await extractSchemaFromFile(options.input, options.schema);

    log('Estimating token count for original schema', options.verbose);
    const originalTokens = estimateTokensByJsonSchema(schema);
    log(`Original schema estimated tokens: ${originalTokens}`, options.verbose);

    if (originalTokens <= options.tokens) {
      log(
        'Schema is already within token limits, no decomposition needed',
        options.verbose,
      );
      const result = {
        originalTokens,
        maxTokensPerSchema: options.tokens,
        needsDecomposition: false,
        decomposedSchemas: [
          {
            name: 'complete',
            schema: JSON.parse(JSON.stringify(schema._def)),
            targetPaths: ['*'],
            estimatedTokens: originalTokens,
          },
        ],
      };

      if (options.output) {
        await writeFile(
          options.output,
          JSON.stringify(result, null, 2),
          'utf-8',
        );
        log(`Results written to ${options.output}`, options.verbose);
      } else {
        console.log(JSON.stringify(result, null, 2));
      }
      return;
    }

    log('Decomposing schema', options.verbose);
    const decomposed = decomposeSchema(
      schema as z.ZodObject<Record<string, z.ZodTypeAny>>,
      {
        maxTokensPerSchema: options.tokens,
        maxOptionsPerEnum: options.enumSize,
      },
    );

    log(`Created ${decomposed.length} decomposed schemas`, options.verbose);

    const result = {
      originalTokens,
      maxTokensPerSchema: options.tokens,
      maxOptionsPerEnum: options.enumSize,
      needsDecomposition: true,
      decomposedSchemas: decomposed.map((item) => ({
        name: item.name,
        schema: JSON.parse(JSON.stringify(item.schema._def)),
        targetPaths: item.targetPaths,
        estimatedTokens: estimateTokensByJsonSchema(item.schema),
      })),
    };

    // Summary
    log('\\nDecomposition Summary:', options.verbose);
    log(`  Original tokens: ${originalTokens}`, options.verbose);
    log(`  Decomposed into: ${decomposed.length} schemas`, options.verbose);
    decomposed.forEach((item, index) => {
      const tokens = estimateTokensByJsonSchema(item.schema);
      log(
        `  Schema ${index + 1} (${item.name}): ${tokens} tokens, ${item.targetPaths.length} paths`,
        options.verbose,
      );
    });

    if (options.output) {
      await writeFile(options.output, JSON.stringify(result, null, 2), 'utf-8');
      log(`Results written to ${options.output}`, options.verbose);
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error(
      `Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}

// Run the CLI if this file is being executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
