import { MCPWebProvider } from '@mcp-web/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MCP_WEB_CONFIG } from '../mcp-web.config.ts';
import App from './App.tsx';
import './index.css';

const root = document.getElementById('root');

if (root) {
  createRoot(root).render(
    <StrictMode>
      {/* Auto-connects to and disconnects from the MCP-Web bridge */}
      <MCPWebProvider config={MCP_WEB_CONFIG}>
        <App />
      </MCPWebProvider>
    </StrictMode>
  );
}

