import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    port: 5173,
    open: true
  },

  build: {
    rollupOptions: {
      input: {

        // Trang chủ
        main: resolve(import.meta.dirname, 'index.html'),

        // Trang giới thiệu
        about: resolve(import.meta.dirname, 'about.html'),

        // Trang dịch vụ
        services: resolve(import.meta.dirname, 'services.html'),

        // Trang bảng giá
        pricing: resolve(import.meta.dirname, 'pricing.html'),

        // Trang đặt lịch
        booking: resolve(import.meta.dirname, 'booking.html'),

        // Trang User
        user: resolve(import.meta.dirname, 'user.html'),

        // Trang Admin
        careSchedules: resolve(
          import.meta.dirname,
          'src/careSchedules.html'
        )
      }
    }
  }
});