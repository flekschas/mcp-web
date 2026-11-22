import { MCPWeb } from '@mcp-web/core';
import baseConfig from '../../mcp-web.config';

// In dev mode, use the config's bridgeUrl. In production, omit it so MCPWeb
// defaults to window.location.host.
const config = {
  ...baseConfig,
  ...(!import.meta.env.DEV && { bridgeUrl: undefined }),
};

export const mcp = new MCPWeb(config);
