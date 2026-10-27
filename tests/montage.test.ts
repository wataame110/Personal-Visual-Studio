// モンタージュ合成エンジンのテスト
import { describe, it, expect } from 'vitest';
import { MontageEngine } from '../src/core/montage';
import { createDefaultParts } from '../src/core/parts';
import { DEFAULTS } from '../src/core/store';

function createCanvas(): HTMLCanvasElement {
  return document.createElement('canvas');
}

describe('MontageEngine', () => {
  it('顔モードで描画できる（例外なく実行される）', () => {
    const canvas = createCanvas();
    const engine = new MontageEngine(canvas);
    expect(() => {
      engine.render(createDefaultParts(), structuredClone(DEFAULTS.hair), structuredClone(DEFAULTS.clothing), structuredClone(DEFAULTS.globals), {
        width: 512,
        height: 512,
        mode: 'face',
      });
    }).not.toThrow();
    expect(canvas.width).toBe(512);
    expect(canvas.height).toBe(512);
  });

  it('全身モードで描画できる', () => {
    const canvas = createCanvas();
    const engine = new MontageEngine(canvas);
    expect(() => {
      engine.render(createDefaultParts(), structuredClone(DEFAULTS.hair), structuredClone(DEFAULTS.clothing), structuredClone(DEFAULTS.globals), {
        width: 400,
        height: 800,
        mode: 'fullbody',
      });
    }).not.toThrow();
  });

  it('パーツ非表示が反映される（目を非表示にしても例外にならない）', () => {
    const canvas = createCanvas();
    const engine = new MontageEngine(canvas);
    const parts = createDefaultParts();
    parts.eyeL.visible = false;
    parts.eyeR.visible = false;
    expect(() => {
      engine.render(parts, structuredClone(DEFAULTS.hair), structuredClone(DEFAULTS.clothing), structuredClone(DEFAULTS.globals), {
        width: 512,
        height: 512,
        mode: 'face',
      });
    }).not.toThrow();
  });

  it('極端なパラメータ値でも例外にならない', () => {
    const canvas = createCanvas();
    const engine = new MontageEngine(canvas);
    const parts = createDefaultParts();
    // 全パラメータを最小・最大に振る
    for (const id of Object.keys(parts)) {
      for (const key of Object.keys(parts[id].morph)) {
        parts[id].morph[key] = 999; // 範囲外の値
      }
    }
    expect(() => {
      engine.render(parts, structuredClone(DEFAULTS.hair), structuredClone(DEFAULTS.clothing), structuredClone(DEFAULTS.globals), {
        width: 512,
        height: 512,
        mode: 'face',
      });
    }).not.toThrow();
  });

  it('髪型がnoneでも描画できる', () => {
    const canvas = createCanvas();
    const engine = new MontageEngine(canvas);
    const hair = { ...structuredClone(DEFAULTS.hair), style: 'none' as const };
    expect(() => {
      engine.render(createDefaultParts(), hair, structuredClone(DEFAULTS.clothing), structuredClone(DEFAULTS.globals), {
        width: 512,
        height: 512,
        mode: 'face',
      });
    }).not.toThrow();
  });
});
