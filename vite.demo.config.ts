import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist/demo-runtime',
    emptyOutDir: false,
    lib: {
      entry: fileURLToPath(new URL('./src/demo-standalone.tsx', import.meta.url)),
      name: 'TalkDemoRuntime',
      formats: ['iife'],
      fileName: () => 'demo-standalone.js',
      cssFileName: 'demo-standalone',
    },
  },
})
