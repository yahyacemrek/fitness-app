import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Göreli yollar: GitHub Pages'te (kullanici.github.io/repo-adi/) depo adı ne olursa olsun çalışır
  base: './',
});
