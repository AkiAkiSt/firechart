import { readFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string
}

// FIRECHART_BASE is the path the app is served from, for example "/firechart/"
// on GitHub Pages. Local development and the desktop shell use "/".
export default defineConfig({
  base: process.env.FIRECHART_BASE ?? '/',
  plugins: [
    react(),
    tailwindcss(),
    // Makes the site installable and usable offline. New versions are
    // downloaded in the background and used the next time the app opens.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Firechart',
        short_name: 'Firechart',
        description: 'Tick your habits each day and watch your fire charts fill in.',
        theme_color: '#0c0d10',
        background_color: '#0c0d10',
        display: 'standalone',
        // Relative, so the app works from any folder it is hosted in.
        start_url: './',
        scope: './',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
