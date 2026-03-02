import type { ModelConfig } from '../types.js';

export const MODEL_REGISTRY: ModelConfig[] = [
  // Native AI SDK providers
  {
    id: 'claude-opus-4.6',
    provider: 'anthropic',
    modelName: 'claude-opus-4-6',
    envKey: 'ANTHROPIC_API_KEY',
  },
  {
    id: 'claude-sonnet-4.6',
    provider: 'anthropic',
    modelName: 'claude-sonnet-4-6',
    envKey: 'ANTHROPIC_API_KEY',
  },
  {
    id: 'gpt-5.3-codex',
    provider: 'openai',
    modelName: 'gpt-5.3-codex',
    envKey: 'OPENAI_API_KEY',
  },
  // OpenRouter models
  {
    id: 'kimi-k2.5',
    provider: 'openrouter',
    modelName: 'moonshotai/kimi-k2.5',
    envKey: 'OPENROUTER_API_KEY',
  },
  {
    id: 'minimax-m2.5',
    provider: 'openrouter',
    modelName: 'minimax/minimax-m2.5',
    envKey: 'OPENROUTER_API_KEY',
  },
  {
    id: 'glm-5',
    provider: 'openrouter',
    modelName: 'z-ai/glm-5',
    envKey: 'OPENROUTER_API_KEY',
  },
  {
    id: 'qwen-3.5',
    provider: 'openrouter',
    modelName: 'qwen/qwen3.5-397b-a17b',
    envKey: 'OPENROUTER_API_KEY',
  },

  // Cerebras
  {
    id: 'gpt-oss-120b',
    provider: 'cerebras',
    modelName: 'gpt-oss-120b',
    envKey: 'CEREBRAS_API_KEY',
  },
];

export function getModelConfig(id: string): ModelConfig | undefined {
  return MODEL_REGISTRY.find((m) => m.id === id);
}

export function getAvailableModels(): ModelConfig[] {
  return MODEL_REGISTRY.filter((m) => process.env[m.envKey]);
}
