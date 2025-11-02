import type { ToolDefinition } from '@mcp-web/types';
import { z } from 'zod';
import { BaseTool } from '../base.js';

const DOMElementSchema = z.object({
  tagName: z.string(),
  id: z.string(),
  className: z.string(),
  textContent: z.string().nullable(),
  attributes: z.record(z.string(), z.string())
});

type DOMElement = z.infer<typeof DOMElementSchema>;

const GetDOMElementsInputSchema = z.object({
  selector: z.string().describe('CSS selector to query')
});
type GetDOMElementsInput = z.infer<typeof GetDOMElementsInputSchema>;

const GetDOMElementsOutputSchema = z.object({
  elements: z.array(DOMElementSchema)
});
type GetDOMElementsOutput = z.infer<typeof GetDOMElementsOutputSchema>;

const getDOMElementsInputJsonSchema = z.toJSONSchema(GetDOMElementsInputSchema, { target: "draft-7" });

function getDOMElements(params: GetDOMElementsInput): GetDOMElementsOutput {
  const parsedParams = GetDOMElementsInputSchema.safeParse(params);

  if (!parsedParams.success) {
    throw new Error(`DOMQueryTool: Invalid input parameters: ${parsedParams.error.message}`);
  }

  const { selector } = parsedParams.data;

  const elements = document.querySelectorAll(selector);

  return {
    elements: Array.from(elements).map((el) => ({
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

export class DOMQueryTool extends BaseTool<typeof GetDOMElementsInputSchema, typeof GetDOMElementsOutputSchema> {
  public readonly name = 'dom-query';
  public readonly description = 'Query the DOM for elements';
  public readonly inputSchema = GetDOMElementsInputSchema;
  public readonly outputSchema = GetDOMElementsOutputSchema;
  public readonly handler = getDOMElements;
}
