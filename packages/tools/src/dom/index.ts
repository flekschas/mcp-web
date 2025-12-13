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
  selector: z.string().default('body').describe('CSS selector to query')
});
type GetDOMElementsInput = z.infer<typeof GetDOMElementsInputSchema>;

const GetDOMElementsOutputSchema = z.object({
  elements: z.array(DOMElementSchema)
});
type GetDOMElementsOutput = z.infer<typeof GetDOMElementsOutputSchema>;

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
  get name(): string {
    return 'dom-query';
  }

  get description(): string {
    return 'Query the DOM for elements';
  }

  get inputSchema(): typeof GetDOMElementsInputSchema {
    return GetDOMElementsInputSchema;
  }

  get outputSchema(): typeof GetDOMElementsOutputSchema {
    return GetDOMElementsOutputSchema;
  }

  get handler(): (params: GetDOMElementsInput) => GetDOMElementsOutput {
    return getDOMElements;
  }
}
