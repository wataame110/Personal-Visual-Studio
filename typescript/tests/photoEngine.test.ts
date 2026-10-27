// 写真編集エンジンの単体テスト
// 最重要検証：マスク外の原本画素がビット一致で保持されること（受け入れ条件）
import { describe, it, expect } from 'vitest';
import {
  blendPreservingOutside, hueShiftWithinMask, smoothWithinMask,
  inpaintWithinMask, adjustWithinMask, type RGBImage,
} from '../photo/composite';
import {
  createMask, cloneMask, applyBrush, unionMask, featherMask, maskCoverage, type Mask,
} from '../photo/mask';
import { createField, addStroke, applyWarp, fieldMaxDisplacement } from '../photo/warp';
import {
  createSession, setMask, pushOp, undoOp, redoOp, renderSession,
  serializeSession, deserializeSession,
} from '../photo/ops';

const W = 16;
const H = 16;

function makeImage(seed = 0): RGBImage {
  const data = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    data[i * 4] = (i * 7 + seed) % 256;
    data[i * 4 + 1] = (i * 13 + seed * 3) % 256;
    data[i * 4 + 2] = (i * 29 + 100) % 256;
    data[i * 4 + 3] = 255;
  }
  return { width: W, height: H, data };
}

/** 左半分=255、右半分=0 のマスク */
function leftHalfMask(): Mask {
  const m = createMask(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W / 2; x++) m.data[y * W + x] = 255;
  }
  return m;
}

function rightHalfEquals(a: RGBImage, b: RGBImage): boolean {
  for (let y = 0; y < H; y++) {
    for (let x = W / 2; x < W; x++) {
      const p = (y * W + x) * 4;
      for (let c = 0; c < 4; c++) {
        if (a.data[p + c] !== b.data[p + c]) return false;
      }
    }
  }
  return true;
}

describe('原本画素保持（マスク外ビット一致）', () => {
  const img = makeImage();
  const mask = leftHalfMask();

  it('blendPreservingOutside: マスク0の画素は原本と完全一致', () => {
    const edited = makeImage(200); // 全体が異なる画像
    const out = blendPreservingOutside(img, edited, mask);
    expect(rightHalfEquals(out, img)).toBe(true);
    // マスク内は編集画像になる
    expect(out.data[0]).toBe(edited.data[0]);
  });

  it('hueShiftWithinMask: マスク外は完全一致', () => {
    const out = hueShiftWithinMask(img, mask, 120, 1.2, 1);
    expect(rightHalfEquals(out, img)).toBe(true);
  });

  it('smoothWithinMask: マスク外は完全一致', () => {
    const out = smoothWithinMask(img, mask, 1, 3);
    expect(rightHalfEquals(out, img)).toBe(true);
  });

  it('adjustWithinMask: マスク外は完全一致', () => {
    const out = adjustWithinMask(img, mask, 40, 40);
    expect(rightHalfEquals(out, img)).toBe(true);
  });

  it('inpaintWithinMask: マスク外は完全一致、内部は周囲色へ近づく', () => {
    const out = inpaintWithinMask(img, cloneMask(mask), 200);
    expect(rightHalfEquals(out, img)).toBe(true);
  });

  it('applyWarp: マスク外は完全一致', () => {
    const field = createField(W, H);
    addStroke(field, { fromX: 4, fromY: 8, toX: 6, toY: 8, radius: 4, strength: 1 });
    const out = applyWarp(img, field, mask);
    expect(rightHalfEquals(out, img)).toBe(true);
  });
});

describe('マスク操作', () => {
  it('ブラシ追加・除去', () => {
    const m = createMask(W, H);
    applyBrush(m, 8, 8, 4, true);
    expect(maskCoverage(m)).toBeGreaterThan(0);
    const before = m.data[8 * W + 8];
    applyBrush(m, 8, 8, 4, false);
    expect(m.data[8 * W + 8]).toBeLessThan(before);
  });

  it('unionMask は両方の領域を含む', () => {
    const a = createMask(W, H);
    const b = createMask(W, H);
    applyBrush(a, 4, 4, 3, true);
    applyBrush(b, 12, 12, 3, true);
    const u = unionMask(a, b);
    expect(u.data[4 * W + 4]).toBeGreaterThan(0);
    expect(u.data[12 * W + 12]).toBeGreaterThan(0);
  });

  it('featherMask は範囲を保持しつつ境界をならす', () => {
    const m = leftHalfMask();
    const f = featherMask(m, 2);
    // 中心は完全なまま
    expect(f.data[8 * W + 2]).toBe(255);
    // 境界は中間値
    const edge = f.data[8 * W + W / 2];
    expect(edge).toBeGreaterThan(0);
    expect(edge).toBeLessThan(255);
  });
});

describe('ワープ', () => {
  it('ゼロ変形場は元画素と一致', () => {
    const img = makeImage();
    const out = applyWarp(img, createField(W, H));
    expect(Array.from(out.data)).toEqual(Array.from(img.data));
  });

  it('ストロークで変位が生じる', () => {
    const field = createField(W, H);
    addStroke(field, { fromX: 8, fromY: 8, toX: 12, toY: 8, radius: 5, strength: 1 });
    expect(fieldMaxDisplacement(field)).toBeGreaterThan(0);
  });
});

describe('編集セッション（非破壊・Undo/Redo・保存復元）', () => {
  it('操作列の適用とマスク外保持', () => {
    const img = makeImage();
    let s = createSession(W, H);
    s = setMask(s, 'hair', leftHalfMask());
    s = pushOp(s, { kind: 'recolor', maskId: 'hair', hueDeg: 90, satScale: 1, lumScale: 1 });
    s = pushOp(s, { kind: 'adjust', maskId: 'hair', brightness: 20, contrast: 0 });
    const out = renderSession(img, s);
    expect(rightHalfEquals(out, img)).toBe(true);
  });

  it('undo/redo が操作列を正しく往復する', () => {
    let s = createSession(W, H);
    s = setMask(s, 'hair', leftHalfMask());
    s = pushOp(s, { kind: 'adjust', maskId: 'hair', brightness: 10, contrast: 0 });
    s = pushOp(s, { kind: 'adjust', maskId: 'hair', brightness: 20, contrast: 0 });
    expect(s.ops).toHaveLength(2);
    s = undoOp(s);
    expect(s.ops).toHaveLength(1);
    expect(s.redoOps).toHaveLength(1);
    s = redoOp(s);
    expect(s.ops).toHaveLength(2);
    expect(s.redoOps).toHaveLength(0);
  });

  it('undo すると描画が元に戻る', () => {
    const img = makeImage();
    let s = createSession(W, H);
    s = setMask(s, 'hair', leftHalfMask());
    const before = renderSession(img, s);
    s = pushOp(s, { kind: 'adjust', maskId: 'hair', brightness: 60, contrast: 0 });
    const edited = renderSession(img, s);
    expect(Array.from(edited.data)).not.toEqual(Array.from(before.data));
    s = undoOp(s);
    const restored = renderSession(img, s);
    expect(Array.from(restored.data)).toEqual(Array.from(before.data));
  });

  it('serialize/deserialize の往復で同一の描画結果になる', () => {
    const img = makeImage();
    let s = createSession(W, H);
    s = setMask(s, 'hair', leftHalfMask());
    s = pushOp(s, { kind: 'recolor', maskId: 'hair', hueDeg: 45, satScale: 1.2, lumScale: 0.9 });
    const field = createField(W, H);
    addStroke(field, { fromX: 4, fromY: 8, toX: 6, toY: 10, radius: 4, strength: 0.8 });
    s = pushOp(s, { kind: 'warp', maskId: 'hair', field });
    const expected = renderSession(img, s);
    const restored = deserializeSession(JSON.parse(JSON.stringify(serializeSession(s))));
    const actual = renderSession(img, restored);
    expect(Array.from(actual.data)).toEqual(Array.from(expected.data));
  });
});
