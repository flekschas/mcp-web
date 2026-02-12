import { toCanvas, toJpeg, toPng } from 'html-to-image';
import type { Options as HtmlToImageOptions } from 'html-to-image/lib/types';
import { z } from 'zod';
import { BaseTool } from '../base.js';

interface Options extends HtmlToImageOptions {
  name?: string;
  description?: string;
  format?: 'png' | 'jpeg' | 'webp';
  elementSelector?: string;
}

const TakeScreenshotInputSchema = z.object({
  elementSelector: z.string().optional().describe('CSS selector to query'),
});
type TakeScreenshotInput = z.infer<typeof TakeScreenshotInputSchema>;

/**
 * Returns the screenshot as a data URL string (e.g., "data:image/png;base64,...").
 * The bridge detects data URL strings and converts them into native MCP ImageContent
 * blocks, so Claude receives the image efficiently rather than as raw base64 text.
 */
const TakeScreenshotOutputSchema = z
  .string()
  .describe('The screenshot as a data URL');

const createScreenshot = (options: Options) => {
  return async (params?: TakeScreenshotInput): Promise<string> => {
    return takeScreenshot(params || {}, options);
  };
};

async function takeScreenshot(
  params: TakeScreenshotInput,
  options: Options,
): Promise<string> {
  const parsedParams = TakeScreenshotInputSchema.safeParse(params);

  if (!parsedParams.success) {
    throw new Error('Invalid parameters');
  }

  const { elementSelector } = parsedParams.data;
  const { format } = options;

  const element: HTMLElement = elementSelector
    ? document.querySelector(elementSelector) || document.body
    : document.body;

  try {
    if (format === 'png') {
      return await toPng(element, options);
    } else if (format === 'jpeg') {
      return await toJpeg(element, options);
    } else if (format === 'webp') {
      // html-to-image doesn't have direct webp support, convert from canvas
      const canvas = await toCanvas(element, options);
      return canvas.toDataURL('image/webp', options.quality);
    }
    return await toPng(element, options);
  } catch (error) {
    throw new Error(
      `Failed to take screenshot: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export class ScreenshotTool extends BaseTool<
  typeof TakeScreenshotInputSchema,
  typeof TakeScreenshotOutputSchema
> {
  #name: string;
  #description: string;
  #inputSchema = TakeScreenshotInputSchema;
  #outputSchema = TakeScreenshotOutputSchema;
  #handler: (params?: TakeScreenshotInput) => Promise<string>;

  constructor(options: Options) {
    super();
    this.#name = options.name || 'screenshot';
    this.#description =
      options.description || 'Take a screenshot of the web page';
    this.#handler = createScreenshot(options);
  }

  get name(): string {
    return this.#name;
  }

  get description(): string {
    return this.#description;
  }

  get inputSchema(): typeof TakeScreenshotInputSchema {
    return this.#inputSchema;
  }

  get outputSchema(): typeof TakeScreenshotOutputSchema {
    return this.#outputSchema;
  }

  get handler(): (params?: TakeScreenshotInput) => Promise<string> {
    return this.#handler;
  }
}
