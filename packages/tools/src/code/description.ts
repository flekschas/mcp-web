import type { ToolDefinitionZod } from '@mcp-web/types';
import { z } from 'zod';

/**
 * Converts a JSON Schema object to a TypeScript-style type string.
 */
function jsonSchemaToTypeString(
  schema: Record<string, unknown>,
  indent = 0,
): string {
  const pad = '  '.repeat(indent);
  const type = schema.type as string | undefined;

  if (schema.enum) {
    const values = schema.enum as unknown[];
    return values
      .map((v) => (typeof v === 'string' ? `'${v}'` : String(v)))
      .join(' | ');
  }

  if (schema.const !== undefined) {
    const v = schema.const;
    return typeof v === 'string' ? `'${v}'` : String(v);
  }

  if (schema.anyOf) {
    const options = schema.anyOf as Record<string, unknown>[];
    return options
      .map((o) => jsonSchemaToTypeString(o, indent))
      .join(' | ');
  }

  if (schema.oneOf) {
    const options = schema.oneOf as Record<string, unknown>[];
    return options
      .map((o) => jsonSchemaToTypeString(o, indent))
      .join(' | ');
  }

  if (type === 'string') return 'string';
  if (type === 'number' || type === 'integer') return 'number';
  if (type === 'boolean') return 'boolean';
  if (type === 'null') return 'null';

  if (type === 'array') {
    const items = schema.items as Record<string, unknown> | undefined;
    if (items) {
      return `${jsonSchemaToTypeString(items, indent)}[]`;
    }
    return 'unknown[]';
  }

  if (type === 'object') {
    const properties = schema.properties as
      | Record<string, Record<string, unknown>>
      | undefined;
    if (!properties || Object.keys(properties).length === 0) {
      return 'Record<string, unknown>';
    }

    const required = (schema.required as string[]) ?? [];
    const lines = Object.entries(properties).map(([key, prop]) => {
      const optional = !required.includes(key);
      const typeStr = jsonSchemaToTypeString(prop, indent + 1);
      const desc = prop.description
        ? ` // ${prop.description as string}`
        : '';
      return `${pad}  ${key}${optional ? '?' : ''}: ${typeStr};${desc}`;
    });

    return `{\n${lines.join('\n')}\n${pad}}`;
  }

  // additionalProperties pattern (Record-like)
  if (schema.additionalProperties) {
    const valueSchema = schema.additionalProperties as Record<string, unknown>;
    if (typeof valueSchema === 'object') {
      return `Record<string, ${jsonSchemaToTypeString(valueSchema, indent)}>`;
    }
  }

  return 'unknown';
}

/**
 * Generates a function signature for a single tool.
 */
function toolToSignature(tool: ToolDefinitionZod): string {
  const lines: string[] = [];

  // Add description as JSDoc comment
  if (tool.description) {
    lines.push(`/** ${tool.description} */`);
  }

  let paramsStr = '';
  if (tool.inputSchema) {
    try {
      const jsonSchema = z.toJSONSchema(tool.inputSchema as z.ZodSchema);
      paramsStr = `params: ${jsonSchemaToTypeString(jsonSchema as Record<string, unknown>)}`;
    } catch {
      paramsStr = 'params: unknown';
    }
  }

  let returnStr = 'unknown';
  if (tool.outputSchema) {
    try {
      const jsonSchema = z.toJSONSchema(tool.outputSchema as z.ZodSchema);
      returnStr = jsonSchemaToTypeString(jsonSchema as Record<string, unknown>);
    } catch {
      // keep unknown
    }
  }

  lines.push(
    `async function ${tool.name}(${paramsStr}): Promise<${returnStr}>`,
  );

  return lines.join('\n');
}

/**
 * Generates the full description for a CodeTool from its constituent tools.
 */
export function generateCodeToolDescription(
  tools: ToolDefinitionZod[],
): string {
  const signatures = tools.map(toolToSignature).join('\n\n');

  return [
    'Execute JavaScript code in a sandboxed environment.',
    'Available functions (all async, called as globals):',
    '',
    '```typescript',
    signatures,
    '```',
    '',
    'Top-level await is supported.',
    'The last expression is returned as the result.',
  ].join('\n');
}
