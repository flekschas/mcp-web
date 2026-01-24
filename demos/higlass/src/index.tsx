import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './app/app.tsx';

// MCP Tools are defined outside the React component using the Jotai state directly. To load them, we need to explicitly import them here.
import './higlass/tools.ts';

const root = document.getElementById('root');

if (root) {
  createRoot(root).render(<App />);
}
