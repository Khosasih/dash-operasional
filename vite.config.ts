import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

import { excelStoragePlugin } from './src/server/excelStoragePlugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools(), excelStoragePlugin()],

  server: {
    allowedHosts: ['dash-operasional.atmajaya.ac.id'],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/cpu': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
