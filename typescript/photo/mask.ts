// 編集マスク：領域の自動生成・手動補正・幾何操作
// すべて純粋関数として実装し、単体テスト可能にする。

/** 0..1 の編集強度マスク（1=完全に編集対象、0=原本画素を完全保持） */
export interface Mask {
  width: number;
  height: number;
  /** row-major, 0..255 */
  data: Uint8Array;
}

export function createMask(width: number, height: number, fill = 0): Mask {
  return { width, height, data: new Uint8Array(width * height).fill(fill) };
}

export function cloneMask(m: Mask): Mask {
  return { width: m.width, height: m.height, data: new Uint8Array(m.data) };
}

/** 領域クラスマップ（画素ごとのクラス番号）から指定クラスのマスクを生成 */
export function maskFromClasses(
  classMap: Uint8Array,
  width: number,
  height: number,
  classes: number[],
  targetW: number,
  targetH: number,
): Mask {
  const out = createMask(targetW, targetH);
  const sx = width / targetW;
  const sy = height / targetH;
  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const cx = Math.min(width - 1, Math.floor(x * sx));
      const cy = Math.min(height - 1, Math.floor(y * sy));
      if (classes.includes(classMap[cy * width + cx])) out.data[y * targetW + x] = 255;
    }
  }
  return out;
}

/** 円形ブラシでマスクを加算/減算（手動補正用） */
export function applyBrush(m: Mask, cx: number, cy: number, radius: number, add: boolean, softness = 0.5): void {
  const r = Math.max(1, radius);
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(m.width - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const y1 = Math.min(m.height - 1, Math.ceil(cy + r));
  const inner = r * Math.min(0.95, Math.max(0, softness));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d > r) continue;
      const t = d <= inner ? 1 : 1 - (d - inner) / (r - inner || 1);
      const v = Math.round(t * 255);
      const i = y * m.width + x;
      m.data[i] = add ? Math.max(m.data[i], v) : Math.min(m.data[i], 255 - v);
    }
  }
}

/** 膨張・収縮（radius px） */
export function dilateMask(m: Mask, radius: number): Mask {
  return morphology(m, radius, true);
}
export function erodeMask(m: Mask, radius: number): Mask {
  return morphology(m, radius, false);
}
function morphology(m: Mask, radius: number, dilate: boolean): Mask {
  const r = Math.max(1, Math.round(radius));
  const out = cloneMask(m);
  for (let y = 0; y < m.height; y++) {
    for (let x = 0; x < m.width; x++) {
      const i = y * m.width + x;
      if (dilate ? m.data[i] < 128 : m.data[i] >= 128) continue;
      let found = false;
      outer: for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy > r * r) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= m.width || ny >= m.height) continue;
          const v = m.data[ny * m.width + nx];
          if (dilate ? v >= 128 : v < 128) { found = true; break outer; }
        }
      }
      if (found) out.data[i] = dilate ? 255 : 0;
    }
  }
  return out;
}

/** 境界のぼかし（自然な合成のためのフェザー） */
export function featherMask(m: Mask, radius: number): Mask {
  const r = Math.max(1, Math.round(radius));
  const out = createMask(m.width, m.height);
  for (let y = 0; y < m.height; y++) {
    for (let x = 0; x < m.width; x++) {
      let sum = 0, n = 0;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= m.width || ny >= m.height) continue;
          sum += m.data[ny * m.width + nx];
          n++;
        }
      }
      out.data[y * m.width + x] = Math.round(sum / n);
    }
  }
  return out;
}

export function invertMask(m: Mask): Mask {
  const out = cloneMask(m);
  for (let i = 0; i < out.data.length; i++) out.data[i] = 255 - out.data[i];
  return out;
}

export function unionMask(a: Mask, b: Mask): Mask {
  const out = createMask(a.width, a.height);
  for (let i = 0; i < out.data.length; i++) out.data[i] = Math.max(a.data[i], b.data[i]);
  return out;
}

/** マスクの占有率（0..1）。表示用の統計 */
export function maskCoverage(m: Mask): number {
  let n = 0;
  for (let i = 0; i < m.data.length; i++) if (m.data[i] >= 128) n++;
  return m.data.length ? n / m.data.length : 0;
}

/** マスクをPNG互換のRGBA Uint8ClampedArrayへ可視化変換（赤半透明） */
export function maskToOverlay(m: Mask, color: [number, number, number] = [255, 80, 80]): Uint8ClampedArray {
  const out = new Uint8ClampedArray(m.width * m.height * 4);
  for (let i = 0; i < m.data.length; i++) {
    const a = m.data[i];
    out[i * 4] = color[0];
    out[i * 4 + 1] = color[1];
    out[i * 4 + 2] = color[2];
    out[i * 4 + 3] = Math.round(a * 0.45);
  }
  return out;
}
