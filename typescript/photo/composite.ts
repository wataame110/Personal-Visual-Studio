// 画素保持を保証する合成・色調処理
// 重要原則：マスク値が0の画素は必ず元写真の画素をそのまま返す。
import type { Mask } from './mask';

export interface RGBImage {
  width: number;
  height: number;
  /** row-major RGBA */
  data: Uint8ClampedArray;
}

/**
 * 原本画素保持の合成。
 * out = mask * edited + (1 - mask) * original
 * mask=0 の画素は original と完全一致する（検証可能な仕様）。
 */
export function blendPreservingOutside(original: RGBImage, edited: RGBImage, mask: Mask): RGBImage {
  const out = new Uint8ClampedArray(original.data);
  for (let i = 0; i < mask.data.length; i++) {
    const a = mask.data[i] / 255;
    if (a <= 0) continue;
    const p = i * 4;
    for (let c = 0; c < 3; c++) {
      out[p + c] = Math.round(original.data[p + c] * (1 - a) + edited.data[p + c] * a);
    }
  }
  return { width: original.width, height: original.height, data: out };
}

/**
 * 輝度保持の色相シフト（髪色・衣服の色変更用）。
 * マスク内の画素について、輝度(Y)を保ったまま色相を回転させる。
 */
export function hueShiftWithinMask(img: RGBImage, mask: Mask, hueDeg: number, satScale = 1, lumScale = 1): RGBImage {
  const out = new Uint8ClampedArray(img.data);
  const h = ((hueDeg % 360) + 360) % 360;
  const cosA = Math.cos((h * Math.PI) / 180);
  const sinA = Math.sin((h * Math.PI) / 180);
  for (let i = 0; i < mask.data.length; i++) {
    const a = mask.data[i] / 255;
    if (a <= 0) continue;
    const p = i * 4;
    const r = img.data[p] / 255, g = img.data[p + 1] / 255, b = img.data[p + 2] / 255;
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const u = (b - y) * 0.492;
    const v = (r - y) * 0.877;
    const u2 = (u * cosA - v * sinA) * satScale;
    const v2 = (u * sinA + v * cosA) * satScale;
    const y2 = Math.min(1, Math.max(0, y * lumScale));
    const nr = Math.min(255, Math.max(0, Math.round((y2 + v2 / 0.877) * 255)));
    const nb = Math.min(255, Math.max(0, Math.round((y2 + u2 / 0.492) * 255)));
    const ng = Math.min(255, Math.max(0, Math.round((y2 - 0.395 * u2 - 0.581 * v2) * 255)));
    out[p] = Math.round(img.data[p] * (1 - a) + nr * a);
    out[p + 1] = Math.round(img.data[p + 1] * (1 - a) + ng * a);
    out[p + 2] = Math.round(img.data[p + 2] * (1 - a) + nb * a);
  }
  return { width: img.width, height: img.height, data: out };
}

/**
 * 肌スムージング：マスク内でエッジ保持寄りの平滑化（簡易バイラテラル）。
 * 毛穴や質感を完全に消さないよう、色差の大きい画素は平滑化を弱める。
 */
export function smoothWithinMask(img: RGBImage, mask: Mask, strength = 0.6, radius = 3): RGBImage {
  const out = new Uint8ClampedArray(img.data);
  const { width, height } = img;
  const r = Math.max(1, Math.round(radius));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const a = (mask.data[i] / 255) * strength;
      if (a <= 0) continue;
      const p = i * 4;
      const cr = img.data[p], cg = img.data[p + 1], cb = img.data[p + 2];
      let sr = 0, sg = 0, sb = 0, sw = 0;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const q = (ny * width + nx) * 4;
          const dr = img.data[q] - cr, dg = img.data[q + 1] - cg, db = img.data[q + 2] - cb;
          const colorDist = Math.sqrt(dr * dr + dg * dg + db * db);
          // 色差が大きい（輪郭・眉・髪の境界）ほど重みを下げる
          const w = Math.exp(-colorDist / 40);
          sr += img.data[q] * w; sg += img.data[q + 1] * w; sb += img.data[q + 2] * w; sw += w;
        }
      }
      if (sw > 0) {
        out[p] = Math.round(cr * (1 - a) + (sr / sw) * a);
        out[p + 1] = Math.round(cg * (1 - a) + (sg / sw) * a);
        out[p + 2] = Math.round(cb * (1 - a) + (sb / sw) * a);
      }
    }
  }
  return { width: img.width, height: img.height, data: out };
}

/**
 * マスク領域の除去・補完（脱毛・小さなシミ除去等）。
 * 生成AIではなく、周囲の画素からの拡散充填（反復ラプラシアン）で近似する。
 * マスク内部の元画素は徐々に周囲色へ置き換わる。質感の再現は近似であることに注意。
 */
export function inpaintWithinMask(img: RGBImage, mask: Mask, iterations = 60): RGBImage {
  const out = new Uint8ClampedArray(img.data);
  const { width, height } = img;
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height;
  for (let it = 0; it < iterations; it++) {
    let changed = false;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (mask.data[i] < 200) continue; // 確実に対象の画素のみ
        const p = i * 4;
        let sr = 0, sg = 0, sb = 0, n = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = x + dx, ny = y + dy;
          if (!inside(nx, ny)) continue;
          const ni = ny * width + nx;
          if (mask.data[ni] >= 200) continue; // まだ未充填の画素は参照しない
          const q = ni * 4;
          sr += out[q]; sg += out[q + 1]; sb += out[q + 2]; n++;
        }
        if (n > 0) {
          out[p] = Math.round(sr / n);
          out[p + 1] = Math.round(sg / n);
          out[p + 2] = Math.round(sb / n);
          mask.data[i] = 100; // 充填済みとして段階的に解放（境界から内側へ進む）
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  return { width: img.width, height: img.height, data: out };
}

/** 明るさ・コントラスト調整（マスク内のみ） */
export function adjustWithinMask(img: RGBImage, mask: Mask, brightness = 0, contrast = 0): RGBImage {
  const out = new Uint8ClampedArray(img.data);
  const cf = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let i = 0; i < mask.data.length; i++) {
    const a = mask.data[i] / 255;
    if (a <= 0) continue;
    const p = i * 4;
    for (let c = 0; c < 3; c++) {
      const v = img.data[p + c];
      const nv = Math.min(255, Math.max(0, cf * (v + brightness - 128) + 128));
      out[p + c] = Math.round(v * (1 - a) + nv * a);
    }
  }
  return { width: img.width, height: img.height, data: out };
}
