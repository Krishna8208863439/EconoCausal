import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: 'frontend/public',
  server: {
    host: '0.0.0.0',
    port: 3000,
<<<<<<< HEAD
    allowedHosts: 'all',
=======
>>>>>>> c252a66c1d9cdab11c0455b44796e49ac90fba8c
  },
  build: {
    outDir: 'dist',
  },
})
