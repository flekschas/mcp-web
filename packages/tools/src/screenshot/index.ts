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

const TakeScreenshotOutputSchema = z.object({
  format: z.enum(['png', 'jpeg', 'webp']).describe('The format of the screenshot'),
  dataUrl: z.string().describe('The data URL of the screenshot'),
});
type TakeScreenshotOutput = z.infer<typeof TakeScreenshotOutputSchema>;

const createScreenshot = (options: Options) => {
  return async (params?: TakeScreenshotInput): Promise<TakeScreenshotOutput> => {
    return takeScreenshot(params || {}, options);
  }
}

async function takeScreenshot(
  params: TakeScreenshotInput,
  options: Options
): Promise<TakeScreenshotOutput> {
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
    // The image as a data URL
    let result: string;

    if (format === 'png') {
      result = await toPng(element, options);
    } else if (format === 'jpeg') {
      result = await toJpeg(element, options);
    } else if (format === 'webp') {
      // html-to-image doesn't have direct webp support, convert from canvas
      const canvas = await toCanvas(element, options);
      result = canvas.toDataURL('image/webp', options.quality);
    } else {
      result = await toPng(element, options);
    }

    return {
      format: format || 'png',
      dataUrl: result,
    };
  } catch (error) {
    throw new Error(`Failed to take screenshot: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export class ScreenshotTool extends BaseTool<typeof TakeScreenshotInputSchema, typeof TakeScreenshotOutputSchema> {
  #name: string;
  #description: string;
  #inputSchema = TakeScreenshotInputSchema;
  #outputSchema = TakeScreenshotOutputSchema;
  #handler: (params?: TakeScreenshotInput) => Promise<TakeScreenshotOutput>;

  constructor(options: Options) {
    super();
    this.#name = options.name || 'screenshot';
    this.#description = options.description || 'Take a screenshot of the web page';
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

  get handler(): (params?: TakeScreenshotInput) => Promise<TakeScreenshotOutput> {
    return this.#handler;
  }
}
