import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        about: resolve(import.meta.dirname, 'about.html'),
        admin: resolve(import.meta.dirname, 'src/admin.html'),
        adminPets: resolve(import.meta.dirname, 'src/adminPets.html'),
        adminShipping: resolve(import.meta.dirname, 'src/adminShipping.html'),
        adminServices: resolve(import.meta.dirname, 'src/adminServices.html'),
        adminPayments: resolve(import.meta.dirname, 'src/adminPayments.html'),
        adminReviews: resolve(import.meta.dirname, 'src/adminReviews.html'),
        services: resolve(import.meta.dirname, 'services.html'),
        pricing: resolve(import.meta.dirname, 'pricing.html'),
        booking: resolve(import.meta.dirname, 'booking.html'),
        addresses: resolve(import.meta.dirname, 'addresses.html'),
        payment: resolve(import.meta.dirname, 'payment.html'),
        careSchedules: resolve(import.meta.dirname, 'src/careSchedules.html'),
        user: resolve(import.meta.dirname, 'user.html'),
        history: resolve(import.meta.dirname, 'history.html'),
        profile: resolve(import.meta.dirname, 'profile.html'),
      },
    },
  },
})