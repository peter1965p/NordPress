import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

const api = process.env.NP_API || 'http://127.0.0.1:3001'   // andere API: NP_API=http://127.0.0.1:13101 npm run dev

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    proxy: { '/api': api, '/admin/api': api, '/uploads': api },
  },
})
