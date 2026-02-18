import { MCPWebProvider } from '@mcp-web/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import baseConfig from '../mcp-web.config.ts';
import App from './App.tsx';
import './index.css';
import { clearDemoData, initializeSeedData } from '../seed-data';
import type { View } from './types';

// In dev mode, use the config's bridgeUrl (e.g., localhost:3001).
// In production, omit it so MCPWeb defaults to window.location.host,
// which works when the bridge and frontend share the same origin.
const config = {
  ...baseConfig,
  ...(!import.meta.env.DEV && { bridgeUrl: undefined }),
};

// Migrate old view format to new discriminated union format
function migrateViewFormat() {
  const stored = localStorage.getItem('view');
  if (!stored) return;
  
  try {
    const value = JSON.parse(stored);
    
    // Already in new format (object with type property)
    if (value && typeof value === 'object' && 'type' in value) {
      return;
    }
    
    // Migrate old format
    let newView: View;
    if (value === null) {
      newView = { type: 'inbox' };
    } else if (value === '__statistics__') {
      newView = { type: 'statistics' };
    } else if (typeof value === 'string') {
      newView = { type: 'project', id: value };
    } else {
      // Unknown format, default to inbox
      newView = { type: 'inbox' };
    }
    
    localStorage.setItem('view', JSON.stringify(newView));
  } catch {
    // Invalid JSON, reset to inbox
    localStorage.setItem('view', JSON.stringify({ type: 'inbox' }));
  }
}

// Run migrations before initializing seed data
migrateViewFormat();

// Initialize seed data on first run (when localStorage is empty)
initializeSeedData();

// Expose clearDemoData for developers (call from browser console)
declare global {
  interface Window {
    clearDemoData: typeof clearDemoData;
  }
}
window.clearDemoData = clearDemoData;

const root = document.getElementById('root');

if (root) {
  createRoot(root).render(
    <StrictMode>
      {/* Auto-connects to and disconnects from the MCP-Web bridge */}
      <MCPWebProvider config={config}>
        <App />
      </MCPWebProvider>
    </StrictMode>
  );
}

