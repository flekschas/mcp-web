import type { ToolDefinitionZod } from '@mcp-web/types';
import type { z } from 'zod';

export interface ToolGenerationOptions {
  name: string;
  description: string;
  get: () => unknown;
  set: (value: unknown) => void;
  schema: z.ZodTypeAny;
}

export interface GeneratedTools {
  tools: ToolDefinitionZod[];
  warnings: string[];
}

export interface SchemaShape {
  type: 'fixed' | 'dynamic' | 'mixed' | 'unsupported';
  subtype: 'object' | 'array' | 'record' | 'primitive' | 'tuple' | 'unknown';
  hasOptionalFields: boolean;
  optionalPaths: string[];
  fixedPaths: string[];    // Paths to fixed-shape properties
  dynamicPaths: string[];  // Paths to arrays/records
}

export interface KeyFieldResult {
  type: 'explicit' | 'none';
  field?: string;
}
