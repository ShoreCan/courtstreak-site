import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { trackerBuildInfo } from './scripts/tracker-build-info.mjs'

export default defineConfig({
  plugins: [react()],
  base: '/courtstreak-site/',
  define: { __COURTSTREAK_TRACKER_BUILD__: JSON.stringify(trackerBuildInfo(fileURLToPath(new URL('.', import.meta.url)))) },
})
