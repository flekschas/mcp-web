import type { ToolDefinition, ToolResult } from '@mcp-web/types';
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

const takeScreenshotSchema = z.object({
  elementSelector: z.string().optional().describe('CSS selector to query'),
});
type TakeScreenshot = z.infer<typeof takeScreenshotSchema>;
const takeScreenshotJsonSchema = z.toJSONSchema(takeScreenshotSchema, { target: "draft-7" });

const createDynamicScreenshot = (options: Options) => {
  return async (params: TakeScreenshot): Promise<ToolResult<string>> => {
    return takeScreenshot(params, options);
  }
}

const createStaticScreenshot = (options: Options) => {
  return async (): Promise<ToolResult<string>> => {
    const staticParams: TakeScreenshot = {
      elementSelector: options.elementSelector
    };
    return takeScreenshot(staticParams, options);
  }
}

async function takeScreenshot(params: TakeScreenshot, options: Options): Promise<ToolResult<string>> {
  const parsedParams = takeScreenshotSchema.safeParse(params);

  if (!parsedParams.success) {
    return {
      error: 'Invalid parameters'
    }
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
      value: result
    }
  } catch (_error) {
    return {
      error: 'Failed to take screenshot'
    }
  }
}

export class ScreenshotTool extends BaseTool<TakeScreenshot, string> {
  public readonly name;
  public readonly description;
  public readonly inputSchema;
  public readonly handler;

  constructor(options: Options) {
    super();
    this.name = options.name || 'screenshot';
    this.description = options.description || 'Take a screenshot of the web page';

    if (options.elementSelector) {
      // Static mode: no input schema, always use predefined selector
      this.inputSchema = undefined;
      this.handler = createStaticScreenshot(options);
    } else {
      // Dynamic mode: current behavior
      this.inputSchema = takeScreenshotJsonSchema;
      this.handler = createDynamicScreenshot(options);
    }
  }

  override toDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      handler: this.handler,
      inputSchema: this.inputSchema
    };
  }
}
