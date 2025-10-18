import { svelte } from '@sveltejs/vite-plugin-svelte'
import { PORTS } from 'checkers-shared'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: PORTS.FRONTEND
  }
})
