import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { copyFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { trackerBuildInfo } from './scripts/tracker-build-info.mjs'
import { courtStreakAppearanceCss } from './scripts/appearance-css.mjs'
import { diagnosticOutput } from './scripts/diagnostic-output.mjs'

export default defineConfig({
  plugins: [react(), diagnosticOutput(), {
    name: 'shooting-pilot-deep-link',
    async writeBundle({ dir }) {
      const shooting = resolve(dir, 'tracker-tests/shooting')
      await mkdir(shooting, { recursive: true })
      await copyFile(resolve(dir, 'index.html'), resolve(shooting, 'index.html'))
    },
  }],
  css: { postcss: { plugins: [courtStreakAppearanceCss()] } },
  base: '/courtstreak-site/',
  build: {rollupOptions: {input: {
    app: fileURLToPath(new URL('./index.html', import.meta.url)),
    safariCheck: fileURLToPath(new URL('./tests/browser/safari-gpu-check.html', import.meta.url)),
  }}},
  server: { allowedHosts: ['terminal.local'] },
  define: { __COURTSTREAK_TRACKER_BUILD__: JSON.stringify(trackerBuildInfo(fileURLToPath(new URL('.', import.meta.url)))) },
})
