import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Regenerate the app icons in public/ after changing public/favicon.svg:
//   npm run icons
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    // Home-screen icons get a full-bleed dark square behind the mark.
    maskable: { sizes: [512], padding: 0.25, resizeOptions: { background: '#0c0d10', fit: 'contain' } },
    apple: { sizes: [180], padding: 0.2, resizeOptions: { background: '#0c0d10', fit: 'contain' } },
  },
  images: ['public/favicon.svg'],
})
