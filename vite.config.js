import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { trackerBuildInfo } from './scripts/tracker-build-info.mjs'
import { courtStreakAppearanceCss } from './scripts/appearance-css.mjs'

export default defineConfig({
  plugins: [react()],
  css: { postcss: { plugins: [courtStreakAppearanceCss()] } },
  base: '/courtstreak-site/',
  server: { allowedHosts: ['terminal.local'] },
  define: { __COURTSTREAK_TRACKER_BUILD__: JSON.stringify(trackerBuildInfo(fileURLToPath(new URL('.', import.meta.url)))) },
})
