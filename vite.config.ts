import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // pdf-lib tek başına ~511 kB'tır; yalnızca PDF işlemi istendiğinde dinamik yüklenir.
    chunkSizeWarningLimit: 550,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
