// 局所画像変形（リキファイ）：写真上の局所的な形状編集
// 変形場は純粋関数として構築し、画素への適用は後方写像（元画素からのサンプリング）で行う。
// 変形場がゼロの画素は元画素と完全一致する。
import type { RGBImage } from './composite';
import type { Mask } from './mask';

export interface WarpStroke {
  /** 開始・終了座標（画像ピクセル） */
  fromX: number; fromY: number; toX: number; toY: number;
  /** 影響半径（px） */
  radius: number;
  /** 強度 0..1 */
  strength: number;
}

/** 変形場（各画素の移動ベクトル） */
export interface WarpField {
  width: number;
  height: number;
  /** row-major、dx/dy 交互 */
  vec: Float32Array;
}

export function createField(width: number, height: number): WarpField {
  return { width, height, vec: new Float32Array(width * height * 2) };
}

/** ストロークを変形場へ蓄積する（純粋関数） */
export function addStroke(field: WarpField, s: WarpStroke): void {
  const dx = s.toX - s.fromX;
  const dy = s.toY - s.fromY;
  const len = Math.hypot(dx, dy);
  if (len < 0.001 || s.radius <= 0) return;
  const r = s.radius;
  const x0 = Math.max(0, Math.floor(s.fromX - r));
  const x1 = Math.min(field.width - 1, Math.ceil(s.fromX + r));
  const y0 = Math.max(0, Math.floor(s.fromY - r));
  const y1 = Math.min(field.height - 1, Math.ceil(s.fromY + r));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x - s.fromX, y - s.fromY);
      if (d > r) continue;
      const falloff = (1 - d / r) ** 2 * s.strength;
      const i = (y * field.width + x) * 2;
      field.vec[i] += dx * falloff;
      field.vec[i + 1] += dy * falloff;
    }
  }
}

/**
 * 変形場の適用（後方写像・バイリニア補間）。
 * 変形場がゼロの画素は元画素とビット一致する。
 * mask が指定された場合、マスク0の画素も元画素のまま返す。
 */
export function applyWarp(img: RGBImage, field: WarpField, mask?: Mask): RGBImage {
  const out = new Uint8ClampedArray(img.data);
  const { width, height } = img;
  const sample = (sx: number, sy: number, p: number) => {
    const x0 = Math.floor(sx), y0 = Math.floor(sy);
    const x1 = Math.min(width - 1, x0 + 1), y1 = Math.min(height - 1, y0 + 1);
    const fx = sx - x0, fy = sy - y0;
    const c00 = (y0 * width + Math.min(width - 1, x0)) * 4 + p;
    const c10 = (y0 * width + x1) * 4 + p;
    const c01 = (y1 * width + Math.min(width - 1, x0)) * 4 + p;
    const c11 = (y1 * width + x1) * 4 + p;
    return img.data[c00] * (1 - fx) * (1 - fy) + img.data[c10] * fx * (1 - fy)
      + img.data[c01] * (1 - fx) * fy + img.data[c11] * fx * fy;
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (mask && mask.data[i] === 0) continue;
      const vx = field.vec[i * 2];
      const vy = field.vec[i * 2 + 1];
      if (Math.abs(vx) < 0.01 && Math.abs(vy) < 0.01) continue;
      const a = mask ? mask.data[i] / 255 : 1;
      const sx = Math.min(width - 1.001, Math.max(0, x - vx));
      const sy = Math.min(height - 1.001, Math.max(0, y - vy));
      const p = i * 4;
      for (let c = 0; c < 3; c++) {
        out[p + c] = Math.round(img.data[p + c] * (1 - a) + sample(sx, sy, c) * a);
      }
    }
  }
  return { width, height, data: out };
}

/** 変形場の最大変位（UI表示・検証用） */
export function fieldMaxDisplacement(field: WarpField): number {
  let m = 0;
  for (let i = 0; i < field.vec.length; i += 2) {
    m = Math.max(m, Math.hypot(field.vec[i], field.vec[i + 1]));
  }
  return m;
}
