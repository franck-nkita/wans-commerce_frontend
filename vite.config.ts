/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Le premier rendu charge les pages à la demande : marge pour les machines lentes.
    testTimeout: 15000,
    // Fichiers exécutés l'un après l'autre : en parallèle, la contention rendait les tests de rendu instables.
    fileParallelism: false,
  },
})
