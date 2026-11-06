import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { trackerBuildInfo } from './scripts/tracker-build-info.mjs'
import { courtStreakAppearanceCss } from './scripts/appearance-css.mjs'
import { diagnosticOutput } from './scripts/diagnostic-output.mjs'

export default defineConfig({
  plugins: [react(), diagnosticOutput()],
  css: { postcss: { plugins: [courtStreakAppearanceCss()] } },
  base: '/courtstreak-site/',
  build: {rollupOptions: {input: {
    app: fileURLToPath(new URL('./index.html', import.meta.url)),
    safariCheck: fileURLToPath(new URL('./tests/browser/safari-gpu-check.html', import.meta.url)),
  }}},
  server: { allowedHosts: ['terminal.local'] },
  define: { __COURTSTREAK_TRACKER_BUILD__: JSON.stringify(trackerBuildInfo(fileURLToPath(new URL('.', import.meta.url)))) },
})
