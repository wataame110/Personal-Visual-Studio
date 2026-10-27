#!/usr/bin/env node
// MediaPipe モデルファイルの取得ツール（開発者用）
// モデルはアプリケーションと同梱して配布し、外部AI APIに依存しない構成とする。
// 使い方: node javascript/fetch-models.mjs
import { createWriteStream, mkdirSync, existsSync, cpSync } from 'node:fs';
import { get } from 'node:https';
import { dirname, join } from 'node:path';

const MODELS = [
  {
    url: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
    out: 'models/face_landmarker.task',
  },
  {
    url: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
    out: 'models/pose_landmarker_lite.task',
  },
  {
    // 領域分割（髪/顔肌/体肌/衣服の自動分離）用。Google 公式配布。
    url: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite',
    out: 'models/selfie_multiclass_256x256.tflite',
  },
];

function download(url, out) {
  return new Promise((resolve, reject) => {
    mkdirSync(dirname(out), { recursive: true });
    const file = createWriteStream(out);
    const request = (u) => {
      get(u, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          request(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${u}`));
          return;
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      }).on('error', reject);
    };
    request(url);
  });
}

// WASM ランタイムを node_modules から同梱
// アプリは実行時に `<base>mediapipe/wasm/` から読み込む（vite.config.ts の copyAssetsPlugin が dist へ複製）
const wasmSrc = 'node_modules/@mediapipe/tasks-vision/wasm';
const wasmOut = 'mediapipe/wasm';
if (existsSync(wasmSrc)) {
  mkdirSync(wasmOut, { recursive: true });
  cpSync(wasmSrc, wasmOut, { recursive: true });
  console.log(`WASM ランタイムを ${wasmOut} にコピーしました。`);
} else {
  console.warn('node_modules/@mediapipe/tasks-vision/wasm が見つかりません。先に npm install を実行してください。');
}

for (const m of MODELS) {
  if (existsSync(m.out)) {
    console.log(`既に存在します: ${m.out}`);
    continue;
  }
  try {
    await download(m.url, m.out);
    console.log(`取得しました: ${m.out}`);
  } catch (e) {
    console.error(`取得に失敗しました: ${m.url}`);
    console.error(String(e));
    console.error('手動でダウンロードして配置してください。写真解析機能はモデル未配置でも手動モードで利用できます。');
  }
}
