import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './app/app.tsx';

// Registers the MCP tools, which read and write the Jotai state directly.
import './spec/tools.ts';

const root = document.getElementById('root');

if (root) {
  createRoot(root).render(<App />);
}
