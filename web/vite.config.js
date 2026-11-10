import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

const api = 'http://127.0.0.1:3001'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    proxy: { '/api': api, '/admin/api': api, '/uploads': api },
  },
})
