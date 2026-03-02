import { defineConfig } from 'vite';

export default defineConfig({
  root: './browser',
  server: {
    port: 5191,
    strictPort: true,
  },
});
