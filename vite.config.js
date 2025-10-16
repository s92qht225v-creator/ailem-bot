import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    open: true,
    allowedHosts: ['spongy-sledlike-narcisa.ngrok-free.dev', '.ngrok-free.dev', '.ngrok.io'],
    hmr: {
      protocol: 'wss',
      host: 'spongy-sledlike-narcisa.ngrok-free.dev',
      clientPort: 443
    }
  }
})
