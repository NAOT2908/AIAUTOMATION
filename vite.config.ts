import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/AIAUTOMATION/',
  plugins: [react()],
  server: {
    port: 7820,
    open: true,
    watch: {
      ignored: ['**/*.png', '**/*.crdownload', '**/dist/**', '**/*.tmp'],
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-three': ['three', '@react-three/fiber', '@react-three/drei'],
          'vendor-fx': ['postprocessing', '@react-three/postprocessing'],
          'vendor-react': ['react', 'react-dom', 'zustand'],
        },
      },
    },
  },
})
