import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

function copyModelsPlugin() {
  return {
    name: 'copy-models',
    generateBundle(this: { emitFile: (asset: { type: 'asset'; fileName: string; source: Buffer }) => void }) {
      const root = join(process.cwd(), 'models');
      const walk = (dir: string) => {
        for (const entry of readdirSync(dir)) {
          const absolute = join(dir, entry);
          if (statSync(absolute).isDirectory()) walk(absolute);
          else {
            const fileName = relative(root, absolute).split('\\').join('/');
            this.emitFile({ type: 'asset', fileName: `models/${fileName}`, source: readFileSync(absolute) });
          }
        }
      };
      walk(root);
    },
  };
}

// GitHub Pages のサブディレクトリ公開に対応するため、base は相対パス './' を使用する。
// これにより https://<user>.github.io/<repo>/ のようなサブパス配下でも
// 静的アセットが正しく解決される。
export default defineConfig({
  base: './',
  plugins: [react(), copyModelsPlugin()],
  // json/ 配下（json/auth/profiles.json 等）を dist ルートにコピーして配信する
  publicDir: 'json',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 2048,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          mediapipe: ['@mediapipe/tasks-vision'],
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
