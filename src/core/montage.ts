// 2Dモンタージュ合成エンジン
// PartStateMap（現在のスライダー状態）から写実的な人物画像（正面顔／全身）をCanvasに合成する。

import type { PartStateMap, HairConfig, ClothingState, BodyGlobals } from './types';

export interface MontageOptions {
  width: number;
  height: number;
  mode: 'face' | 'fullbody';
}

interface SkinTone {
  base: string;
  shadow: string;
  highlight: string;
  lip: string;
}

const SKIN_TONES: SkinTone[] = [
  { base: '#ffe8da', shadow: '#f0d0c0', highlight: '#fff4ec', lip: '#e0a0a0' },
  { base: '#f5d5b8', shadow: '#e0c0a8', highlight: '#fce8d5', lip: '#d89898' },
  { base: '#e8b89a', shadow: '#d0a080', highlight: '#f8d0b8', lip: '#c88888' }, // デフォルト
  { base: '#d8a880', shadow: '#c09070', highlight: '#e8c098', lip: '#b87878' },
  { base: '#c09068', shadow: '#a87858', highlight: '#d8a878', lip: '#a86868' },
  { base: '#a07850', shadow: '#886040', highlight: '#b88860', lip: '#985858' },
];

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

/** morph値（min..max）を 0..1 の正規化値に変換 */
function norm(v: number, min: number, max: number): number {
  return clamp((v - min) / (max - min), 0, 1);
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** color文字列から肌色インデックスを推定（ユーザーの色選択をSKIN_TONESにマップ） */
function skinIndexFromColor(color: string): number {
  let best = 2;
  let bestDist = Infinity;
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  SKIN_TONES.forEach((t, i) => {
    const tr = parseInt(t.base.slice(1, 3), 16);
    const tg = parseInt(t.base.slice(3, 5), 16);
    const tb = parseInt(t.base.slice(5, 7), 16);
    const d = (r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2;
    if (d < bestDist) { bestDist = d; best = i; }
  });
  return best;
}

export class MontageEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context is not available');
    this.ctx = ctx;
  }

  render(parts: PartStateMap, hair: HairConfig, clothing: ClothingState, globals: BodyGlobals, opts: MontageOptions): void {
    const { width, height, mode } = opts;
    this.canvas.width = width;
    this.canvas.height = height;

    // 背景（スタジオ風グラデーション）
    const bg = this.ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#e8edf2');
    bg.addColorStop(1, '#d0d8e0');
    this.ctx.fillStyle = bg;
    this.ctx.fillRect(0, 0, width, height);

    const skinIdx = skinIndexFromColor(parts.head?.color ?? '#e8b89a');
    const skin = SKIN_TONES[skinIdx];

    if (mode === 'face') {
      this.renderFace(parts, hair, clothing, skin, width, height);
    } else {
      this.renderFullBody(parts, hair, clothing, globals, skin, width, height);
    }
  }

  // ================= 顔モード =================
  private renderFace(parts: PartStateMap, hair: HairConfig, clothing: ClothingState, skin: SkinTone, w: number, h: number): void {
    const cx = w / 2;
    const cy = h / 2;
    const headW = w * 0.42;
    const headH = h * 0.70;

    // 髪（後ろ層）
    this.drawHairBack(hair, cx, cy, headW, headH);
    // 顔ベース
    this.drawFaceBase(parts, skin, cx, cy, headW, headH);
    // 耳
    this.drawEars(parts, skin, cx, cy, headW, headH);
    // 眉
    this.drawBrows(parts, hair, cx, cy, headW, headH);
    // 目
    this.drawEyes(parts, cx, cy, headW, headH);
    // 鼻
    this.drawNose(parts, skin, cx, cy, headW, headH);
    // 口
    this.drawMouth(parts, skin, cx, cy, headW, headH);
    // 髪（前層・前髪）
    this.drawHairFront(hair, cx, cy, headW, headH);
    // メガネ
    if (clothing.glasses.visible) {
      this.drawGlasses(clothing.glasses.color, clothing.glasses.shape, cx, cy, headW, headH);
    }
  }

  // ================= 全身モード =================
  private renderFullBody(parts: PartStateMap, hair: HairConfig, clothing: ClothingState, globals: BodyGlobals, skin: SkinTone, w: number, h: number): void {
    const cx = w / 2;
    const headH = h * 0.13 * clamp(globals.height / 1.65, 0.9, 1.1);
    const headW = headH * 0.78;
    const headCY = h * 0.075 + headH / 2;

    const neckLen = h * 0.035 * (parts.neck?.morph['length'] ?? 1);
    const torsoTop = headCY + headH * 0.48 + neckLen;
    const torsoH = h * 0.40;
    const legTop = torsoTop + torsoH * 0.90;
    const legH = h - legTop - h * 0.015;

    // 髪（後ろ層・全身時はロングヘアが体の後ろに見える）
    this.drawHairBack(hair, cx, headCY, headW, headH);
    // 首（頭の後ろに接続）
    this.drawNeck(parts, skin, cx, headCY + headH * 0.38, headW, neckLen + headH * 0.15);
    // 脚
    this.drawLegs(parts, skin, cx, legTop, legH, headW);
    // 胴体
    this.drawTorso(parts, skin, cx, torsoTop, torsoH, headW, globals);
    // 腕
    this.drawArms(parts, skin, cx, torsoTop, torsoH, headW);
    // 頭（顔パーツ一式）
    this.drawFaceBase(parts, skin, cx, headCY, headW, headH);
    this.drawEars(parts, skin, cx, headCY, headW, headH);
    this.drawBrows(parts, hair, cx, headCY, headW, headH);
    this.drawEyes(parts, cx, headCY, headW, headH);
    this.drawNose(parts, skin, cx, headCY, headW, headH);
    this.drawMouth(parts, skin, cx, headCY, headW, headH);
    this.drawHairFront(hair, cx, headCY, headW, headH);
    // メガネ
    if (clothing.glasses.visible) {
      this.drawGlasses(clothing.glasses.color, clothing.glasses.shape, cx, headCY, headW, headH);
    }
  }

  // ---------- 描画プリミティブ ----------

  private drawFaceBase(parts: PartStateMap, skin: SkinTone, cx: number, cy: number, w: number, h: number): void {
    const head = parts.head?.morph ?? {};
    const fw = w * (head['width'] ?? 1);
    const fh = h * (head['length'] ?? 1);
    const jaw = head['jawWidth'] ?? 1;
    const cheek = head['cheek'] ?? 1;

    const x0 = cx - fw / 2;
    const x1 = cx + fw / 2;
    const yTop = cy - fh / 2;
    const yBot = cy + fh / 2;
    const cheekY = cy - fh * 0.05;
    const jawY = cy + fh * 0.22;

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.moveTo(cx, yTop);
    // 右側面：額→こめかみ→頬→顎→顎先
    this.ctx.bezierCurveTo(x1, yTop, x1 + fw * 0.02, cheekY - fh * 0.15, cx + (fw / 2) * cheek, cheekY);
    this.ctx.bezierCurveTo(cx + (fw / 2) * cheek, cheekY + fh * 0.12, cx + (fw / 2) * jaw * 0.72, jawY, cx + (fw / 2) * jaw * 0.55, jawY + fh * 0.1);
    this.ctx.bezierCurveTo(cx + fw * 0.28 * jaw, yBot, cx + fw * 0.1, yBot, cx, yBot);
    // 左側面
    this.ctx.bezierCurveTo(cx - fw * 0.1, yBot, cx - fw * 0.28 * jaw, yBot, cx - (fw / 2) * jaw * 0.55, jawY + fh * 0.1);
    this.ctx.bezierCurveTo(cx - (fw / 2) * jaw * 0.72, jawY, cx - (fw / 2) * cheek, cheekY + fh * 0.12, cx - (fw / 2) * cheek, cheekY);
    this.ctx.bezierCurveTo(x0 - fw * 0.02, cheekY - fh * 0.15, x0, yTop, cx, yTop);
    this.ctx.closePath();

    // グラデーション肌
    const grad = this.ctx.createLinearGradient(cx - fw / 2, yTop, cx + fw / 2, yBot);
    grad.addColorStop(0, skin.highlight);
    grad.addColorStop(0.45, skin.base);
    grad.addColorStop(1, skin.shadow);
    this.ctx.fillStyle = grad;
    this.ctx.fill();

    // 輪郭線（ごく薄く）
    this.ctx.strokeStyle = 'rgba(90,60,45,0.18)';
    this.ctx.lineWidth = 0.8;
    this.ctx.stroke();

    // 頬のチーク（さりげなく）
    this.ctx.fillStyle = hexToRgba(skin.lip, 0.10);
    const cheekR = fw * 0.13;
    this.ctx.beginPath();
    this.ctx.ellipse(cx - fw * 0.26, cy + fh * 0.06, cheekR, cheekR * 0.7, 0, 0, Math.PI * 2);
    this.ctx.ellipse(cx + fw * 0.26, cy + fh * 0.06, cheekR, cheekR * 0.7, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawEars(parts: PartStateMap, skin: SkinTone, cx: number, cy: number, headW: number, headH: number): void {
    const head = parts.head?.morph ?? {};
    const fw = headW * (head['width'] ?? 1);
    const sizeL = parts.earL?.morph['size'] ?? 1;
    const sizeR = parts.earR?.morph['size'] ?? 1;
    const earY = cy - headH * 0.02;
    const pairs: Array<[number, number, PartStateMap[string] | undefined]> = [
      [cx - fw * 0.48, sizeL, parts.earL],
      [cx + fw * 0.48, sizeR, parts.earR],
    ];
    for (const [x, size, st] of pairs) {
      if (st && !st.visible) continue;
      const ew = headW * 0.07 * size;
      const eh = headH * 0.13 * size;
      this.ctx.beginPath();
      this.ctx.ellipse(x, earY, ew, eh, 0, 0, Math.PI * 2);
      this.ctx.fillStyle = skin.base;
      this.ctx.fill();
      this.ctx.strokeStyle = 'rgba(90,60,45,0.15)';
      this.ctx.lineWidth = 0.8;
      this.ctx.stroke();
      // 耳介の内陰影
      this.ctx.beginPath();
      this.ctx.ellipse(x, earY, ew * 0.4, eh * 0.5, 0, 0, Math.PI * 2);
      this.ctx.strokeStyle = hexToRgba(skin.shadow, 0.5);
      this.ctx.stroke();
    }
  }

  private drawEyes(parts: PartStateMap, cx: number, cy: number, headW: number, headH: number): void {
    const head = parts.head?.morph ?? {};
    const fw = headW * (head['width'] ?? 1);
    const eyeY = cy - headH * 0.08;
    const spacing = fw * 0.215;
    const eyes: Array<[number, PartStateMap[string] | undefined]> = [
      [cx - spacing, parts.eyeL],
      [cx + spacing, parts.eyeR],
    ];
    for (const [x, st] of eyes) {
      if (st && !st.visible) continue;
      const m = st?.morph ?? {};
      const size = m['size'] ?? 1;
      const wid = m['width'] ?? 1;
      const hei = m['height'] ?? 1;
      const tilt = ((m['tilt'] ?? 0) * Math.PI) / 180;
      const fold = m['fold'] ?? 0.4;
      const posY = (m['posY'] ?? 0) * headH * 8;
      const posX = (m['posX'] ?? 0) * fw * 8;

      const ew = headW * 0.155 * size * wid;
      const eh = ew * 0.52 * hei;
      const ex = x + posX;
      const ey = eyeY + posY;

      this.ctx.save();
      this.ctx.translate(ex, ey);
      this.ctx.rotate(tilt);

      // 白目
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, ew / 2, eh / 2, 0, 0, Math.PI * 2);
      this.ctx.fillStyle = '#fdfdfd';
      this.ctx.fill();
      this.ctx.strokeStyle = 'rgba(90,60,45,0.35)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();

      // 虹彩（日本人の黒〜茶系）
      const irisR = eh * 0.46;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, irisR, 0, Math.PI * 2);
      this.ctx.fillStyle = '#3a2a1a';
      this.ctx.fill();

      // 瞳孔
      this.ctx.beginPath();
      this.ctx.arc(0, 0, irisR * 0.5, 0, Math.PI * 2);
      this.ctx.fillStyle = '#100a06';
      this.ctx.fill();

      // ハイライト
      this.ctx.beginPath();
      this.ctx.arc(-irisR * 0.3, -irisR * 0.3, irisR * 0.22, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(255,255,255,0.9)';
      this.ctx.fill();

      // 上まぶたライン
      this.ctx.beginPath();
      this.ctx.ellipse(0, -eh * 0.06, ew * 0.5, eh * 0.5, 0, Math.PI * 1.08, Math.PI * 1.92);
      this.ctx.strokeStyle = 'rgba(60,40,30,0.55)';
      this.ctx.lineWidth = 1.6;
      this.ctx.stroke();

      // 二重まぶた
      if (fold > 0.05) {
        this.ctx.beginPath();
        this.ctx.ellipse(0, -eh * (0.22 + fold * 0.25), ew * 0.46, eh * 0.42, 0, Math.PI * 1.1, Math.PI * 1.9);
        this.ctx.strokeStyle = 'rgba(90,60,45,0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      }
      this.ctx.restore();
    }
  }

  private drawBrows(parts: PartStateMap, hair: HairConfig, cx: number, cy: number, headW: number, headH: number): void {
    const head = parts.head?.morph ?? {};
    const fw = headW * (head['width'] ?? 1);
    const baseY = cy - headH * 0.17;
    const spacing = fw * 0.215;
    const brows: Array<[number, PartStateMap[string] | undefined]> = [
      [cx - spacing, parts.browL],
      [cx + spacing, parts.browR],
    ];
    for (const [x, st] of brows) {
      if (st && !st.visible) continue;
      const m = st?.morph ?? {};
      const thickness = m['thickness'] ?? 1;
      const length = m['length'] ?? 1;
      const arch = m['arch'] ?? 0.2;
      const posY = (m['posY'] ?? 0) * headH * 8;

      const bw = headW * 0.16 * length;
      const bh = headH * 0.028 * thickness;
      const by = baseY + posY;

      this.ctx.save();
      this.ctx.translate(x, by);
      this.ctx.beginPath();
      // 眉山（アーチ）を持つ帯
      this.ctx.moveTo(-bw / 2, 0);
      this.ctx.quadraticCurveTo(0, -bh * (1.6 + arch * 2), bw / 2, -bh * 0.3);
      this.ctx.quadraticCurveTo(0, -bh * 0.4 + bh * arch, -bw / 2, bh * 0.6);
      this.ctx.closePath();
      this.ctx.fillStyle = hair.color;
      this.ctx.globalAlpha = 0.85;
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
      this.ctx.restore();
    }
  }

  private drawNose(parts: PartStateMap, skin: SkinTone, cx: number, cy: number, headW: number, headH: number): void {
    const st = parts.nose;
    if (st && !st.visible) return;
    const m = st?.morph ?? {};
    const bridgeH = m['bridgeHeight'] ?? 1;
    const tipSize = m['tipSize'] ?? 1;
    const alaeW = m['alaeWidth'] ?? 1;
    const len = m['length'] ?? 1;

    const noseTop = cy - headH * 0.06;
    const noseH = headH * 0.16 * len;
    const tipY = noseTop + noseH;
    const tipW = headW * 0.075 * tipSize;
    const alaeHalf = headW * 0.062 * alaeW;

    // 鼻筋の陰影（両サイド）
    this.ctx.strokeStyle = hexToRgba(skin.shadow, 0.75);
    this.ctx.lineWidth = 1.5;
    for (const s of [-1, 1]) {
      this.ctx.beginPath();
      this.ctx.moveTo(cx + s * headW * 0.018, noseTop);
      this.ctx.quadraticCurveTo(cx + s * headW * 0.022 * bridgeH, (noseTop + tipY) / 2, cx + s * alaeHalf * 0.55, tipY - noseH * 0.1);
      this.ctx.stroke();
    }
    // 鼻先
    this.ctx.beginPath();
    this.ctx.ellipse(cx, tipY, tipW / 2, tipW * 0.28, 0, 0, Math.PI * 2);
    this.ctx.fillStyle = hexToRgba(skin.shadow, 0.35);
    this.ctx.fill();

    // 鼻翼
    for (const s of [-1, 1]) {
      this.ctx.beginPath();
      this.ctx.ellipse(cx + s * alaeHalf * 0.8, tipY - noseH * 0.04, alaeHalf * 0.42, noseH * 0.09, s * 0.35, 0, Math.PI * 2);
      this.ctx.strokeStyle = hexToRgba(skin.shadow, 0.6);
      this.ctx.lineWidth = 1.3;
      this.ctx.stroke();
    }
    // 鼻孔
    for (const s of [-1, 1]) {
      this.ctx.beginPath();
      this.ctx.ellipse(cx + s * tipW * 0.28, tipY + noseH * 0.05, tipW * 0.13, noseH * 0.03, 0, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(40,20,15,0.55)';
      this.ctx.fill();
    }
  }

  private drawMouth(parts: PartStateMap, skin: SkinTone, cx: number, cy: number, headW: number, headH: number): void {
    const st = parts.mouth;
    if (st && !st.visible) return;
    const m = st?.morph ?? {};
    const wid = m['width'] ?? 1;
    const upper = m['upperLip'] ?? 1;
    const lower = m['lowerLip'] ?? 1;
    const lift = m['cornerLift'] ?? 0;
    const posY = (m['posY'] ?? 0) * headH * 8;

    const my = cy + headH * 0.26 + posY;
    const mw = headW * 0.24 * wid;
    const upH = headH * 0.02 * upper;
    const loH = headH * 0.028 * lower;
    const cornerY = my - lift * headH * 0.03;

    // 上唇
    this.ctx.beginPath();
    this.ctx.moveTo(cx - mw / 2, cornerY);
    this.ctx.quadraticCurveTo(cx - mw * 0.18, my - upH * 1.3, cx, my - upH * 0.9);
    this.ctx.quadraticCurveTo(cx + mw * 0.18, my - upH * 1.3, cx + mw / 2, cornerY);
    this.ctx.quadraticCurveTo(cx, my + upH * 0.15, cx - mw / 2, cornerY);
    this.ctx.closePath();
    this.ctx.fillStyle = hexToRgba(skin.lip, 0.92);
    this.ctx.fill();

    // 下唇
    this.ctx.beginPath();
    this.ctx.moveTo(cx - mw / 2, cornerY);
    this.ctx.quadraticCurveTo(cx, my + loH * 1.5, cx + mw / 2, cornerY);
    this.ctx.quadraticCurveTo(cx, my + loH * 0.35, cx - mw / 2, cornerY);
    this.ctx.closePath();
    this.ctx.fillStyle = hexToRgba(skin.lip, 1);
    this.ctx.fill();

    // 口裂線
    this.ctx.beginPath();
    this.ctx.moveTo(cx - mw / 2, cornerY);
    this.ctx.quadraticCurveTo(cx, my + loH * 0.1, cx + mw / 2, cornerY);
    this.ctx.strokeStyle = 'rgba(90,45,45,0.4)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
  }

  private drawHairBack(hair: HairConfig, cx: number, cy: number, headW: number, headH: number): void {
    if (hair.style === 'none') return;
    const vol = 0.9 + hair.volume * 0.35;
    const lenMap: Record<string, number> = { short: 0.08, bob: 0.32, medium: 0.52, long: 0.85, ponytail: 0.8, bun: 0.22 };
    const len = (lenMap[hair.style] ?? 0.4) * (0.6 + hair.length * 0.8);

    this.ctx.save();
    this.ctx.beginPath();
    // 頭を包む後ろ髪の塊
    this.ctx.moveTo(cx - headW * 0.58 * vol, cy - headH * 0.1);
    this.ctx.bezierCurveTo(cx - headW * 0.62 * vol, cy - headH * 0.62, cx + headW * 0.62 * vol, cy - headH * 0.62, cx + headW * 0.58 * vol, cy - headH * 0.1);
    // 垂れ下がる部分（顔モードでは控えめに）
    const drop = headH * (0.15 + len * 0.5);
    this.ctx.bezierCurveTo(cx + headW * 0.60 * vol, cy + drop, cx + headW * 0.25, cy + drop * 1.1, cx + headW * 0.12, cy + drop * 1.1);
    this.ctx.lineTo(cx - headW * 0.12, cy + drop * 1.1);
    this.ctx.bezierCurveTo(cx - headW * 0.25, cy + drop * 1.1, cx - headW * 0.60 * vol, cy + drop, cx - headW * 0.58 * vol, cy - headH * 0.1);
    this.ctx.closePath();

    const grad = this.ctx.createLinearGradient(cx - headW * 0.5, cy - headH * 0.6, cx + headW * 0.5, cy + headH);
    grad.addColorStop(0, hair.color2 && hair.gradient > 0.5 ? hair.color2 : hair.color);
    grad.addColorStop(0.35, hair.color);
    grad.addColorStop(1, hair.color);
    this.ctx.fillStyle = grad;
    this.ctx.fill();
    this.ctx.restore();
  }

  private drawHairFront(hair: HairConfig, cx: number, cy: number, headW: number, headH: number): void {
    if (hair.style === 'none') return;
    const vol = 0.9 + hair.volume * 0.35;
    const topY = cy - headH * 0.55;
    const part = hair.parting * headW * 0.12;

    // トップ（頭皮を覆うキャップ）
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.moveTo(cx - headW * 0.56 * vol, cy - headH * 0.12);
    this.ctx.bezierCurveTo(cx - headW * 0.6 * vol, topY - headH * 0.08, cx + headW * 0.6 * vol, topY - headH * 0.08, cx + headW * 0.56 * vol, cy - headH * 0.12);
    // 額ライン（分け目を反映）
    this.ctx.bezierCurveTo(
      cx + headW * 0.4 + part, cy - headH * (0.28 + hair.bangs * 0.1),
      cx - headW * 0.4 + part, cy - headH * (0.28 + hair.bangs * 0.1),
      cx - headW * 0.56 * vol, cy - headH * 0.12
    );
    this.ctx.closePath();
    this.ctx.fillStyle = hair.color;
    this.ctx.fill();

    // 前髪
    if (hair.bangs > 0.05) {
      const bangLen = headH * (0.12 + hair.bangs * 0.22);
      const fringeTop = topY + headH * 0.1;
      this.ctx.beginPath();
      this.ctx.moveTo(cx - headW * 0.5 * vol + part * 0.5, fringeTop);
      const strands = 7;
      for (let i = 0; i <= strands; i++) {
        const t = i / strands;
        const x = cx - headW * 0.5 * vol + part * 0.5 + t * headW * vol;
        const dip = Math.sin(t * Math.PI * strands * 0.9) * headH * 0.012;
        this.ctx.lineTo(x, fringeTop + bangLen * (0.75 + 0.25 * Math.sin(t * Math.PI)) + dip);
      }
      this.ctx.lineTo(cx + headW * 0.5 * vol + part * 0.5, fringeTop);
      this.ctx.closePath();
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  private drawGlasses(color: string, shape: 'round' | 'square' | 'wellington', cx: number, cy: number, headW: number, headH: number): void {
    const eyeY = cy - headH * 0.08;
    const spacing = headW * 0.215;
    const gw = headW * 0.19;
    const gh = shape === 'round' ? gw : headH * 0.115;

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = headW * 0.012;
    for (const x of [cx - spacing, cx + spacing]) {
      this.ctx.beginPath();
      if (shape === 'round') {
        this.ctx.arc(x, eyeY, gw / 2, 0, Math.PI * 2);
      } else {
        const y0 = eyeY - gh / 2;
        const r = shape === 'wellington' ? gh * 0.35 : gh * 0.15;
        this.ctx.roundRect(x - gw / 2, y0, gw, gh, r);
      }
      this.ctx.stroke();
    }
    // ブリッジ
    this.ctx.beginPath();
    this.ctx.moveTo(cx - spacing + gw / 2, eyeY);
    this.ctx.quadraticCurveTo(cx, eyeY - gh * 0.15, cx + spacing - gw / 2, eyeY);
    this.ctx.stroke();
    // テンプル（耳へ）
    this.ctx.beginPath();
    this.ctx.moveTo(cx - spacing - gw / 2, eyeY);
    this.ctx.lineTo(cx - headW * 0.5, eyeY - gh * 0.1);
    this.ctx.moveTo(cx + spacing + gw / 2, eyeY);
    this.ctx.lineTo(cx + headW * 0.5, eyeY - gh * 0.1);
    this.ctx.stroke();
  }

  private drawNeck(parts: PartStateMap, skin: SkinTone, cx: number, top: number, headW: number, h: number): void {
    const neck = parts.neck?.morph ?? {};
    const nw = headW * 0.22 * (neck['thickness'] ?? 1);
    const grad = this.ctx.createLinearGradient(cx - nw / 2, top, cx + nw / 2, top);
    grad.addColorStop(0, skin.shadow);
    grad.addColorStop(0.5, skin.base);
    grad.addColorStop(1, skin.shadow);
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(cx - nw / 2, top, nw, h);
  }

  private drawTorso(parts: PartStateMap, skin: SkinTone, cx: number, top: number, h: number, headW: number, globals: BodyGlobals): void {
    const chest = parts.chest?.morph ?? {};
    const waist = parts.waist?.morph ?? {};
    const pelvis = parts.pelvis?.morph ?? {};
    const breastL = parts.breastL?.morph ?? {};
    const breastR = parts.breastR?.morph ?? {};
    const fat = 1 + globals.bodyFat * 0.3;

    const shoulderW = headW * 2.0 * (chest['shoulderWidth'] ?? 1);
    const chestW = headW * 1.7 * (chest['width'] ?? 1) * fat;
    const waistW = headW * 1.35 * (waist['width'] ?? 1) * fat;
    const hipW = headW * 1.75 * (pelvis['width'] ?? 1) * fat;

    const shoulderY = top + h * 0.06;
    const chestY = top + h * 0.28;
    const waistY = top + h * 0.58;
    const hipY = top + h * 0.82;
    const hipBottomY = hipY + h * 0.08;

    this.ctx.beginPath();
    this.ctx.moveTo(cx - shoulderW / 2, shoulderY);
    this.ctx.bezierCurveTo(cx - chestW / 2, chestY - h * 0.1, cx - chestW / 2, chestY, cx - chestW / 2, chestY + h * 0.06);
    this.ctx.bezierCurveTo(cx - waistW / 2, waistY - h * 0.08, cx - waistW / 2, waistY, cx - waistW / 2, waistY + h * 0.05);
    this.ctx.bezierCurveTo(cx - hipW / 2, hipY - h * 0.1, cx - hipW / 2, hipY, cx - hipW / 2, hipBottomY);
    this.ctx.lineTo(cx + hipW / 2, hipBottomY);
    this.ctx.bezierCurveTo(cx + hipW / 2, hipY, cx + hipW / 2, hipY - h * 0.1, cx + waistW / 2, waistY + h * 0.05);
    this.ctx.bezierCurveTo(cx + waistW / 2, waistY, cx + waistW / 2, waistY - h * 0.08, cx + chestW / 2, chestY + h * 0.06);
    this.ctx.bezierCurveTo(cx + chestW / 2, chestY, cx + chestW / 2, chestY - h * 0.1, cx + shoulderW / 2, shoulderY);
    this.ctx.quadraticCurveTo(cx, top - h * 0.02, cx - shoulderW / 2, shoulderY);
    this.ctx.closePath();

    const grad = this.ctx.createLinearGradient(cx - shoulderW / 2, top, cx + shoulderW / 2, top + h);
    grad.addColorStop(0, skin.shadow);
    grad.addColorStop(0.5, skin.base);
    grad.addColorStop(1, skin.shadow);
    this.ctx.fillStyle = grad;
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(90,60,45,0.15)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    // 乳房（女性相当のサイズ時のみ）— 自然な陰影で表現
    const bustSize = ((breastL['size'] ?? 1) + (breastR['size'] ?? 1)) / 2;
    if (bustSize > 0.35 && globals.sex !== 'male') {
      const bustY = chestY + (breastL['posY'] ?? 0) * h * 2;
      const bustR = headW * 0.20 * bustSize;
      for (const s of [-1, 1]) {
        const bx = cx + s * headW * 0.28;
        // 柔らかいグラデーションでふくらみを表現（白い円ではなく）
        const grad2 = this.ctx.createRadialGradient(bx, bustY - bustR * 0.3, bustR * 0.1, bx, bustY, bustR * 1.1);
        grad2.addColorStop(0, hexToRgba(skin.highlight, 0.4));
        grad2.addColorStop(0.5, hexToRgba(skin.base, 0.15));
        grad2.addColorStop(1, 'rgba(0,0,0,0)');
        this.ctx.beginPath();
        this.ctx.ellipse(bx, bustY, bustR, bustR * 0.85, 0, 0, Math.PI * 2);
        this.ctx.fillStyle = grad2;
        this.ctx.fill();
        // 下側の影
        this.ctx.beginPath();
        this.ctx.ellipse(bx, bustY + bustR * 0.3, bustR * 0.7, bustR * 0.4, 0, 0, Math.PI * 2);
        this.ctx.fillStyle = hexToRgba(skin.shadow, 0.2);
        this.ctx.fill();
      }
    }
  }

  private drawArms(parts: PartStateMap, skin: SkinTone, cx: number, top: number, torsoH: number, headW: number): void {
    const chest = parts.chest?.morph ?? {};
    const shoulderW = headW * 2.0 * (chest['shoulderWidth'] ?? 1);
    const uaL = parts.upperArmL?.morph ?? {};
    const uaR = parts.upperArmR?.morph ?? {};
    const armLen = torsoH * 1.05;
    const pairs: Array<[number, Record<string, number>]> = [
      [cx - shoulderW / 2 + headW * 0.05, uaL],
      [cx + shoulderW / 2 - headW * 0.05, uaR],
    ];
    for (const [x, m] of pairs) {
      const w = headW * 0.30 * (m['thickness'] ?? 1);
      const grad = this.ctx.createLinearGradient(x - w / 2, top, x + w / 2, top);
      grad.addColorStop(0, skin.shadow);
      grad.addColorStop(0.5, skin.base);
      grad.addColorStop(1, skin.shadow);
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.roundRect(x - w / 2, top + torsoH * 0.03, w, armLen, w / 2);
      this.ctx.fill();
    }
  }

  private drawLegs(parts: PartStateMap, skin: SkinTone, cx: number, top: number, h: number, headW: number): void {
    const pelvis = parts.pelvis?.morph ?? {};
    const hipW = headW * 1.75 * (pelvis['width'] ?? 1);
    const thL = parts.thighL?.morph ?? {};
    const thR = parts.thighR?.morph ?? {};
    const pairs: Array<[number, Record<string, number>]> = [
      [cx - hipW / 4 - headW * 0.08, thL],
      [cx + hipW / 4 + headW * 0.08, thR],
    ];
    for (const [x, m] of pairs) {
      const wTop = headW * 0.55 * (m['thickness'] ?? 1);
      const wBot = wTop * 0.65;
      this.ctx.beginPath();
      this.ctx.moveTo(x - wTop / 2, top);
      this.ctx.lineTo(x - wBot / 2, top + h);
      this.ctx.lineTo(x + wBot / 2, top + h);
      this.ctx.lineTo(x + wTop / 2, top);
      this.ctx.closePath();
      const grad = this.ctx.createLinearGradient(x - wTop / 2, top, x + wTop / 2, top);
      grad.addColorStop(0, skin.shadow);
      grad.addColorStop(0.5, skin.base);
      grad.addColorStop(1, skin.shadow);
      this.ctx.fillStyle = grad;
      this.ctx.fill();
    }
  }
}
