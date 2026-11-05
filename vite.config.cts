import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json'

// Note: this file uses the `.cts` extension (CommonJS TypeScript) on purpose.
// `vite-plugin-pwa` loads `workbox-build` via a `require()` fallback that only
// works when the Vite config is bundled as CommonJS.
// https://vitejs.dev/config/
export default defineConfig({
  define: {
    // Exposes the version from package.json to the app (see src/vite-env.d.ts).
    // When this value changes, the bundle hash changes, so the service worker
    // detects a new version and prompts the user to update.
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/pwa-icon.svg'],
      manifest: {
        name: 'NorasApp',
        short_name: 'NorasApp',
        description: 'Learn smarter, offline.',
        lang: 'en',
        theme_color: '#6366f1',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/pwa-icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/pwa-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icons/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
