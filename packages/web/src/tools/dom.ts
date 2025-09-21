import { z } from 'zod';
import { BaseTool } from './base';
import type { ToolDefinition, ToolResult } from './types';

const inputSchema = z.object({ selector: z.string().describe('CSS selector to query') });
type InputSchema = z.infer<typeof inputSchema>;
const inputJsonSchema = z.toJSONSchema(inputSchema, { target: "draft-7" });

interface DOMElement {
  tagName: string;
  id: string;
  className: string;
  textContent: string | null;
  attributes: Record<string, string>;
}

function getDOMElements(params: InputSchema): ToolResult<DOMElement[]> {
  const parsedParams = inputSchema.safeParse(params);

  if (!parsedParams.success) {
    return {
      error: 'Invalid input parameters'
    }
  }

  const { selector } = parsedParams.data;

  const elements = document.querySelectorAll(selector);

  return {
    value: Array.from(elements).map((el) => ({
      tagName: el.tagName,
      id: el.id,
      className: el.className,
      textContent: el.textContent?.trim() || null,
      attributes: Array.from(el.attributes).reduce((acc, attr) => {
        acc[attr.name] = attr.value;
        return acc;
      }, {} as Record<string, string>)
    } satisfies DOMElement))
  }
}

export class DOMQueryTool extends BaseTool<{ selector: string }, DOMElement[]> {
  static readonly NAME = 'dom-query';
  static readonly DESCRIPTION = 'Query the DOM for elements';
  static readonly INPUT_SCHEMA = inputJsonSchema;

  public readonly handler = getDOMElements;

  get name() {
    return DOMQueryTool.NAME;
  }

  get description() {
    return DOMQueryTool.DESCRIPTION;
  }

  get inputSchema() {
    return DOMQueryTool.INPUT_SCHEMA;
  }

  toDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      handler: this.handler,
      inputSchema: this.inputSchema
    };
  }
}
