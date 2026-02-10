import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';

const useSSL = process.argv.includes('--ssl');

export default defineConfig({
  plugins: [react(), tailwindcss(), ...(useSSL ? [mkcert()] : [])],
  server: { port: 5175 },
});
