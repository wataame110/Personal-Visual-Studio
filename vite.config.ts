import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// models/（MediaPipe モデル等）と mediapipe/（WASM ランタイム）を dist へ複製する。
// これらはバンドル対象外の大容量バイナリのため、実行時に <base>models/... から直接読み込む。
// 開発サーバーでも同パスで配信するため configureServer のミドルウェアを併設する。
function copyAssetsPlugin() {
  const dirs = ['models', 'mediapipe'];
  const serve = (dirName: string) => (req: { url?: string }, res: { setHeader: (k: string, v: string) => void; end: (b?: Buffer) => void; statusCode: number }, next: () => void) => {
    const url = (req.url ?? '').split('?')[0].replace(/^\.\//, '/').replace(/^\//, '');
    const file = join(process.cwd(), dirName, url);
    if (!url || url.includes('..') || !existsSync(file) || !statSync(file).isFile()) return next();
    res.setHeader('Content-Type', file.endsWith('.wasm') ? 'application/wasm' : file.endsWith('.js') ? 'text/javascript' : 'application/octet-stream');
    res.statusCode = 200;
    res.end(readFileSync(file));
  };
  return {
    name: 'copy-assets',
    configureServer(server: { middlewares: { use: (path: string, fn: ReturnType<typeof serve>) => void } }) {
      for (const d of dirs) server.middlewares.use(`/${d}/`, serve(d));
    },
    generateBundle(this: { emitFile: (asset: { type: 'asset'; fileName: string; source: Buffer }) => void }) {
      for (const dirName of dirs) {
        const root = join(process.cwd(), dirName);
        if (!existsSync(root)) continue;
        const walk = (dir: string) => {
          for (const entry of readdirSync(dir)) {
            const absolute = join(dir, entry);
            if (statSync(absolute).isDirectory()) walk(absolute);
            else {
              const fileName = relative(root, absolute).split('\\').join('/');
              this.emitFile({ type: 'asset', fileName: `${dirName}/${fileName}`, source: readFileSync(absolute) });
            }
          }
        };
        walk(root);
      }
    },
  };
}

// GitHub Pages のサブディレクトリ公開に対応するため、base は相対パス './' を使用する。
// これにより https://<user>.github.io/<repo>/ のようなサブパス配下でも
// 静的アセットが正しく解決される。
export default defineConfig({
  base: './',
  plugins: [react(), copyAssetsPlugin()],
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
