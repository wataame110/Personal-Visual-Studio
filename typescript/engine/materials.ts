// 皮膚・粘膜・衣服などのPBRマテリアル生成
import * as THREE from 'three';

/**
 * 皮膚マテリアル：MeshPhysicalMaterial による写実的シェーディング。
 * - sheen: 皮膚特有の柔らかな裏返り反射（桃色）
 * - clearcoat: 薄い角質層の光沢
 * - envMapIntensity: 環境光（IBL）の影響度
 */
export function skinMaterial(color: string, roughness = 0.58): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
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
