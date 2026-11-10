import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// FIRECHART_BASE is the path the app is served from, for example "/firechart/"
// on GitHub Pages. Local development and the desktop shell use "/".
export default defineConfig({
  base: process.env.FIRECHART_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
