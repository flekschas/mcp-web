import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createCerebras } from '@ai-sdk/cerebras';
import type { LanguageModelV3 } from '@ai-sdk/provider';
import type { ModelConfig } from '../types.js';

/**
 * Creates an AI SDK LanguageModel from a ModelConfig.
 * Reads the API key from the environment variable specified in the config.
 */
export function createModel(config: ModelConfig): LanguageModelV3 {
  const apiKey = process.env[config.envKey];
  if (!apiKey) {
    throw new Error(
      `Missing API key: set ${config.envKey} environment variable for model ${config.id}`,
    );
  }

  switch (config.provider) {
    case 'anthropic':
      return createAnthropic({ apiKey })(config.modelName);

    case 'openai':
      return createOpenAI({ apiKey })(config.modelName);

    case 'openrouter':
      return createOpenAI({
        apiKey,
        baseURL: 'https://openrouter.ai/api/v1',
      }).chat(config.modelName);

    case 'cerebras':
      return createCerebras({
        apiKey,
        fetch: (async (url: string | URL | Request, init?: RequestInit) => {
          if (init?.body && typeof init.body === 'string') {
            const body = JSON.parse(init.body);
            if (
              body.response_format?.type === 'json_schema' &&
              body.response_format.json_schema
            ) {
              body.response_format.json_schema.strict = true;
            }
            return fetch(url, { ...init, body: JSON.stringify(body) });
          }
          return fetch(url, init);
        }) as typeof fetch,
      })(config.modelName);

    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}
