import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// GitHub Pages のサブディレクトリ公開に対応するため、base は相対パス './' を使用する。
// これにより https://<user>.github.io/<repo>/ のようなサブパス配下でも
// 静的アセットが正しく解決される。
export default defineConfig({
  base: './',
  plugins: [react()],
  // json/ 配下（json/auth/profiles.json 等）を dist ルートにコピーして配信する
  publicDir: 'json',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 2048,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['typescript/tests/**/*.test.ts'],
  },
});
