import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        about: resolve(import.meta.dirname, 'about.html'),
        register: resolve(import.meta.dirname, 'register.html'),
        booking: resolve(import.meta.dirname, 'booking.html'),
        careSchedules: resolve(import.meta.dirname, 'src/careSchedules.html'),
      },
    },
  },
})