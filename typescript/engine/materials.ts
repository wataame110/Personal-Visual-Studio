// 皮膚・粘膜・衣服などのPBRマテリアル生成
import * as THREE from 'three';

/**
 * 肌の微細な質感テクスチャ（毛穴・細かな凹凸・粗さムラ）を手続き的に生成する。
 * 決定的な疑似乱数を使用し、同一パラメータでは同一結果になる。
 * テスト環境（Canvas非対応）では null を返し、ベースマテリアルのみ使用する。
 */
interface SkinDetailMaps {
  bumpMap: THREE.Texture;
  roughnessMap: THREE.Texture;
}

const skinDetailCache = new Map<string, SkinDetailMaps | null>();

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeSkinDetailMaps(variant: string): SkinDetailMaps | null {
  const cached = skinDetailCache.get(variant);
  if (cached !== undefined) return cached;
  let maps: SkinDetailMaps | null = null;
  try {
    if (typeof document !== 'undefined') {
      const size = 256;
      const bumpCanvas = document.createElement('canvas');
      const roughCanvas = document.createElement('canvas');
      bumpCanvas.width = bumpCanvas.height = size;
      roughCanvas.width = roughCanvas.height = size;
      const bctx = bumpCanvas.getContext('2d');
      const rctx = roughCanvas.getContext('2d');
      if (bctx && rctx) {
        const seed = [...variant].reduce((acc, c) => acc * 31 + c.charCodeAt(0), 7);
        const rand = mulberry32(seed);
        const bimg = bctx.createImageData(size, size);
        const rimg = rctx.createImageData(size, size);
        // 複数スケールの値ノイズで毛穴〜皮膚のうねりを表現
        const grids: { cell: number; amp: number; vals: number[] }[] = [
          { cell: 4, amp: 0.5, vals: [] },   // 毛穴レベル
          { cell: 16, amp: 0.3, vals: [] },  // 小さな凹凸
          { cell: 64, amp: 0.2, vals: [] },  // 大きなうねり
        ];
        for (const g of grids) {
          const n = size / g.cell + 2;
          g.vals = Array.from({ length: n * n }, () => rand());
        }
        const sample = (g: { cell: number; vals: number[] }, x: number, y: number) => {
          const n = size / g.cell + 2;
          const gx = x / g.cell, gy = y / g.cell;
          const x0 = Math.floor(gx), y0 = Math.floor(gy);
          const fx = gx - x0, fy = gy - y0;
          const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
          const v = (xx: number, yy: number) => g.vals[(yy % n) * n + (xx % n)];
          return (v(x0, y0) * (1 - sx) + v(x0 + 1, y0) * sx) * (1 - sy)
            + (v(x0, y0 + 1) * (1 - sx) + v(x0 + 1, y0 + 1) * sx) * sy;
        };
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            let v = 0, ampSum = 0;
            for (const g of grids) { v += sample(g, x, y) * g.amp; ampSum += g.amp; }
            v /= ampSum;
            const i = (y * size + x) * 4;
            const bump = Math.round(v * 255);
            bimg.data[i] = bimg.data[i + 1] = bimg.data[i + 2] = bump;
            bimg.data[i + 3] = 255;
            // 粗さムラ：中心値を維持しつつ ±10% 程度の変動
            const rough = Math.round((0.5 + (v - 0.5) * 0.4) * 255);
            rimg.data[i] = rimg.data[i + 1] = rimg.data[i + 2] = rough;
            rimg.data[i + 3] = 255;
          }
        }
        bctx.putImageData(bimg, 0, 0);
        rctx.putImageData(rimg, 0, 0);
        const bumpMap = new THREE.CanvasTexture(bumpCanvas);
        bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
        const roughnessMap = new THREE.CanvasTexture(roughCanvas);
        roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;
        maps = { bumpMap, roughnessMap };
      }
    }
  } catch {
    maps = null;
  }
  skinDetailCache.set(variant, maps);
  return maps;
}

/**
 * 皮膚マテリアル：MeshPhysicalMaterial による写実的シェーディング。
 * - sheen: 皮膚特有の柔らかな裏返り反射（桃色）
 * - clearcoat: 薄い角質層の光沢
 * - envMapIntensity: 環境光（IBL）の影響度
 * - bumpMap/roughnessMap: 毛穴・微細凹凸・粗さムラ（利用可能な環境のみ）
 */
export function skinMaterial(color: string, roughness = 0.58): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    roughness,
    metalness: 0.0,
    clearcoat: 0.12,
    clearcoatRoughness: 0.55,
    sheen: 0.4,
    sheenRoughness: 0.65,
    sheenColor: new THREE.Color('#ff9d7a'),
    envMapIntensity: 0.55,
  });
  const detail = makeSkinDetailMaps('skin');
  if (detail) {
    mat.bumpMap = detail.bumpMap;
    mat.bumpScale = 0.35;
    mat.roughnessMap = detail.roughnessMap;
  }
  return mat;
}

export function mucosaMaterial(color: string, roughness = 0.35): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    roughness,
    metalness: 0.0,
    clearcoat: 0.35,
    clearcoatRoughness: 0.3,
    sheen: 0.25,
    sheenColor: new THREE.Color('#ff8899'),
    envMapIntensity: 0.65,
  });
}

export function clothMaterial(color: string, pattern: 'solid' | 'stripe' | 'dot' | 'check' = 'solid'): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.9,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
  if (pattern !== 'solid') {
    mat.map = makePatternTexture(color, pattern);
    mat.color = new THREE.Color('#ffffff');
  }
  return mat;
}

function makePatternTexture(baseColor: string, pattern: string): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = shade(baseColor, 0.75);
  if (pattern === 'stripe') {
    for (let y = 0; y < size; y += 16) ctx.fillRect(0, y, size, 8);
  } else if (pattern === 'dot') {
    for (let y = 8; y < size; y += 24)
      for (let x = 8; x < size; x += 24) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
  } else if (pattern === 'check') {
    for (let y = 0; y < size; y += 32)
      for (let x = 0; x < size; x += 32) ctx.fillRect(x, y, 16, 16);
    for (let y = 16; y < size; y += 32)
      for (let x = 16; x < size; x += 32) ctx.fillRect(x, y, 16, 16);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

function shade(hex: string, factor: number): string {
  const c = new THREE.Color(hex);
  c.multiplyScalar(factor);
  return `#${c.getHexString()}`;
}

export function hairMaterial(color: string, color2: string, gradient: number): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.55,
    metalness: 0.15,
    side: THREE.DoubleSide,
  });
  if (gradient > 0.02) {
    // 毛先に向かって color2 へ変化する簡易グラデーション
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, color);
    grad.addColorStop(Math.max(0.05, 1 - gradient), color);
    grad.addColorStop(1, color2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1, 64);
    const tex = new THREE.CanvasTexture(canvas);
    mat.map = tex;
    mat.color = new THREE.Color('#ffffff');
  }
  return mat;
}
