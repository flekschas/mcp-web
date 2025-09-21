import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './app/app.tsx';

// MCP Tools are defined outside the React component using the Jotai state directly. To lead them, we need to explicitelt import them here.
import './higlass/tools.ts';

const root = document.getElementById('root');

if (root) {
  createRoot(root).render(<App />);
}
