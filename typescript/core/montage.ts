// 2Dモンタージュ合成エンジン
// PartStateMap（現在のスライダー状態）から写実的な人物画像（正面顔／全身）をCanvasに合成する。

import type { PartStateMap, HairConfig, ClothingState, BodyGlobals, PoseState } from './types';
import { buildSkeleton, updateSkeleton, JOINT_IDS } from './skeleton';
import { getPoseById } from './poses';

interface Pt {
  x: number;
  y: number;
}

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

  render(parts: PartStateMap, hair: HairConfig, clothing: ClothingState, globals: BodyGlobals, pose: PoseState, opts: MontageOptions): void {
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
      this.renderFullBody(parts, hair, clothing, globals, pose, skin, width, height);
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
  private renderFullBody(parts: PartStateMap, hair: HairConfig, clothing: ClothingState, globals: BodyGlobals, pose: PoseState, skin: SkinTone, w: number, h: number): void {
    // ---- 骨格を構築し、プリセット角度＋カスタム角度をマージして適用 ----
    const joints = buildSkeleton();
    const preset = pose.poseId && pose.poseId !== 'custom' ? getPoseById(pose.poseId) : undefined;
    updateSkeleton(joints, { ...(preset?.jointAngles ?? {}), ...pose.customJointAngles });

    // ---- 自動フィット：骨格全体がキャンバスに収まるよう変換 ----
    const PAD = 0.08; // 肢体の太さ・頭の余白（正規化座標）
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const j of joints.values()) {
      minX = Math.min(minX, j.pos.x);
      maxX = Math.max(maxX, j.pos.x);
      minY = Math.min(minY, j.pos.y);
      maxY = Math.max(maxY, j.pos.y);
    }
    minX -= PAD; maxX += PAD; minY -= PAD; maxY += PAD;
    const bw = Math.max(0.01, (maxX - minX) * w);
    const bh = Math.max(0.01, (maxY - minY) * h);
    const fitScale = Math.min((w * 0.92) / bw, (h * 0.92) / bh);
    const bcx = ((minX + maxX) / 2) * w;
    const bcy = ((minY + maxY) / 2) * h;

    const cam = pose.camera;
    const cosAz = Math.cos((cam.azimuth * Math.PI) / 180);
    const cosEl = Math.cos((cam.elevation * Math.PI) / 180);
    const camScale = 1 / Math.max(0.2, cam.distance);
    const proj = (pos: { x: number; y: number }): Pt => {
      const fx = (pos.x * w - bcx) * fitScale + w / 2;
      const fy = (pos.y * h - bcy) * fitScale + h / 2;
      return {
        x: w / 2 + (fx - w / 2) * cosAz * camScale,
        y: h / 2 + (fy - h / 2) * cosEl * camScale,
      };
    };
    const jp = (id: string): Pt => {
      const j = joints.get(id);
      return j ? proj(j.pos) : { x: w / 2, y: h / 2 };
    };

    // ---- 頭部の寸法と向き（首→頭の骨から）----
    const neckP = jp(JOINT_IDS.NECK);
    const headP = jp(JOINT_IDS.HEAD);
    const chestP = jp(JOINT_IDS.CHEST);
    const pelvisP = jp(JOINT_IDS.PELVIS);
    const neckLenPx = Math.max(8, Math.hypot(headP.x - neckP.x, headP.y - neckP.y));
    const headH = neckLenPx * 1.9;
    const headW = headH * 0.78;
    const headBone = Math.atan2(headP.y - neckP.y, headP.x - neckP.x);
    const headC: Pt = {
      x: headP.x + Math.cos(headBone) * headH * 0.02,
      y: headP.y + Math.sin(headBone) * headH * 0.02,
    };
    const headRot = headBone + Math.PI / 2; // 直立時（骨が真上）は回転0

    // ---- 胴体軸（骨盤→胸）とその垂線 ----
    const torsoDx = chestP.x - pelvisP.x;
    const torsoDy = chestP.y - pelvisP.y;
    const torsoLen = Math.max(20, Math.hypot(torsoDx, torsoDy));
    const tx = torsoDx / torsoLen;
    const ty = torsoDy / torsoLen;
    const px = -ty; // 体の左側（画面から見て）方向
    const py = tx;

    const fat = 1 + globals.bodyFat * 0.3;
    const chestM = parts.chest?.morph ?? {};
    const waistM = parts.waist?.morph ?? {};
    const pelvisM = parts.pelvis?.morph ?? {};
    const shoulderW = headW * 2.0 * (chestM['shoulderWidth'] ?? 1);
    const chestW = headW * 1.65 * (chestM['width'] ?? 1) * fat;
    const waistW = headW * 1.3 * (waistM['width'] ?? 1) * fat;
    const hipW = headW * 1.7 * (pelvisM['width'] ?? 1) * fat;
    const neckW = headW * 0.22 * (parts.neck?.morph['thickness'] ?? 1);

    // ---- 描画（奥→手前の順）----
    // 1. 後ろ髪
    this.ctx.save();
    this.ctx.translate(headC.x, headC.y);
    this.ctx.rotate(headRot);
    this.drawHairBack(hair, 0, 0, headW, headH);
    this.ctx.restore();

    // 2. 脚（胴体の後ろ）
    this.drawLeg(jp, JOINT_IDS.HIP_L, JOINT_IDS.KNEE_L, JOINT_IDS.ANKLE_L, JOINT_IDS.FOOT_L, parts.thighL, parts.calfL, parts.footL, headW, skin);
    this.drawLeg(jp, JOINT_IDS.HIP_R, JOINT_IDS.KNEE_R, JOINT_IDS.ANKLE_R, JOINT_IDS.FOOT_R, parts.thighR, parts.calfR, parts.footR, headW, skin);

    // 3. 胴体
    this.drawTorsoShape(parts, globals, skin, neckP, chestP, pelvisP, jp(JOINT_IDS.SHOULDER_L), jp(JOINT_IDS.SHOULDER_R), tx, ty, px, py, torsoLen, headW, shoulderW, chestW, waistW, hipW);

    // 4. 腕
    this.drawArm(jp, JOINT_IDS.SHOULDER_L, JOINT_IDS.ELBOW_L, JOINT_IDS.WRIST_L, JOINT_IDS.HAND_L, parts.upperArmL, parts.forearmL, parts.handL, headW, skin);
    this.drawArm(jp, JOINT_IDS.SHOULDER_R, JOINT_IDS.ELBOW_R, JOINT_IDS.WRIST_R, JOINT_IDS.HAND_R, parts.upperArmR, parts.forearmR, parts.handR, headW, skin);

    // 5. 首（胸・首関節の中間から頭へ）
    if (!parts.neck || parts.neck.visible) {
      const neckBase: Pt = { x: chestP.x + (neckP.x - chestP.x) * 0.6, y: chestP.y + (neckP.y - chestP.y) * 0.6 };
      const headDir = Math.hypot(headP.x - neckBase.x, headP.y - neckBase.y) || 1;
      const neckTop: Pt = {
        x: headP.x + ((headP.x - neckBase.x) / headDir) * headH * 0.05,
        y: headP.y + ((headP.y - neckBase.y) / headDir) * headH * 0.05,
      };
      this.limbSeg(neckBase, neckTop, neckW * 1.15, neckW * 0.9, skin);
    }

    // 6. 頭（顔パーツ一式・回転対応）
    this.ctx.save();
    this.ctx.translate(headC.x, headC.y);
    this.ctx.rotate(headRot);
    this.drawFaceBase(parts, skin, 0, 0, headW, headH);
    this.drawEars(parts, skin, 0, 0, headW, headH);
    this.drawBrows(parts, hair, 0, 0, headW, headH);
    this.drawEyes(parts, 0, 0, headW, headH);
    this.drawNose(parts, skin, 0, 0, headW, headH);
    this.drawMouth(parts, skin, 0, 0, headW, headH);
    this.drawHairFront(hair, 0, 0, headW, headH);
    if (clothing.glasses.visible) {
      this.drawGlasses(clothing.glasses.color, clothing.glasses.shape, 0, 0, headW, headH);
    }
    this.ctx.restore();
  }

  // ---------- 全身の描画プリミティブ（骨格駆動） ----------

  /** 関節2点間を丸端キャップ付きのテーパー肢体として描画 */
  private limbSeg(p1: Pt, p2: Pt, w1: number, w2: number, skin: SkinTone): void {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.5) return;
    const nx = -dy / len;
    const ny = dx / len;
    const a1 = Math.atan2(ny, nx);

    this.ctx.beginPath();
    this.ctx.moveTo(p1.x + (nx * w1) / 2, p1.y + (ny * w1) / 2);
    this.ctx.lineTo(p2.x + (nx * w2) / 2, p2.y + (ny * w2) / 2);
    // 端点キャップは外向き（セグメントから遠ざかる側）に膨らませる
    this.ctx.arc(p2.x, p2.y, w2 / 2, a1, a1 + Math.PI, true);
    this.ctx.lineTo(p1.x - (nx * w1) / 2, p1.y - (ny * w1) / 2);
    this.ctx.arc(p1.x, p1.y, w1 / 2, a1 + Math.PI, a1, true);
    this.ctx.closePath();

    const grad = this.ctx.createLinearGradient(p1.x - nx * w1, p1.y - ny * w1, p1.x + nx * w1, p1.y + ny * w1);
    grad.addColorStop(0, skin.shadow);
    grad.addColorStop(0.5, skin.base);
    grad.addColorStop(1, skin.shadow);
    this.ctx.fillStyle = grad;
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(90,60,45,0.15)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
  }

  private drawLeg(
    jp: (id: string) => Pt,
    hipId: string, kneeId: string, ankleId: string, footId: string,
    thighPart: PartStateMap[string] | undefined,
    calfPart: PartStateMap[string] | undefined,
    footPart: PartStateMap[string] | undefined,
    headW: number, skin: SkinTone,
  ): void {
    const thighW = headW * 0.40 * (thighPart?.morph['thickness'] ?? 1);
    const calfW = headW * 0.28 * (calfPart?.morph['thickness'] ?? 1);
    const hip = jp(hipId);
    const knee = jp(kneeId);
    const ankle = jp(ankleId);
    const foot = jp(footId);
    if (!thighPart || thighPart.visible) this.limbSeg(hip, knee, thighW, calfW * 1.2, skin);
    if (!calfPart || calfPart.visible) this.limbSeg(knee, ankle, calfW * 1.1, calfW * 0.6, skin);
    if (!footPart || footPart.visible) {
      const ang = Math.atan2(foot.y - ankle.y, foot.x - ankle.x);
      const len = Math.max(headW * 0.34, Math.hypot(foot.x - ankle.x, foot.y - ankle.y) * 1.5);
      const cx = ankle.x + Math.cos(ang) * len * 0.55;
      const cy = ankle.y + Math.sin(ang) * len * 0.55;
      this.ctx.save();
      this.ctx.translate(cx, cy);
      this.ctx.rotate(ang);
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, len / 2, headW * 0.11, 0, 0, Math.PI * 2);
      this.ctx.fillStyle = skin.base;
      this.ctx.fill();
      this.ctx.strokeStyle = 'rgba(90,60,45,0.15)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  private drawArm(
    jp: (id: string) => Pt,
    shoulderId: string, elbowId: string, wristId: string, handId: string,
    upperPart: PartStateMap[string] | undefined,
    forePart: PartStateMap[string] | undefined,
    handPart: PartStateMap[string] | undefined,
    headW: number, skin: SkinTone,
  ): void {
    const armW = headW * 0.24 * (upperPart?.morph['thickness'] ?? 1);
    const foreW = headW * 0.20 * (forePart?.morph['thickness'] ?? 1);
    const sh = jp(shoulderId);
    const el = jp(elbowId);
    const ha = jp(handId);
    if (!upperPart || upperPart.visible) this.limbSeg(sh, el, armW, foreW * 1.05, skin);
    // 前腕は手関節まで伸ばして手と接続させる
    if (!forePart || forePart.visible) this.limbSeg(el, ha, foreW, foreW * 0.6, skin);
    if (!handPart || handPart.visible) {
      this.ctx.beginPath();
      this.ctx.arc(ha.x, ha.y, headW * 0.10, 0, Math.PI * 2);
      this.ctx.fillStyle = skin.base;
      this.ctx.fill();
      this.ctx.strokeStyle = 'rgba(90,60,45,0.15)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }
  }

  /** 骨格に沿った胴体（肩・胸・腰・骨盤の幅を持つ滑らかなシルエット） */
  private drawTorsoShape(
    parts: PartStateMap, globals: BodyGlobals, skin: SkinTone,
    neckP: Pt, chestP: Pt, pelvisP: Pt, shoulderLP: Pt, shoulderRP: Pt,
    tx: number, ty: number, px: number, py: number, torsoLen: number,
    headW: number, shoulderW: number, chestW: number, waistW: number, hipW: number,
  ): void {
    const waistC: Pt = { x: chestP.x - tx * torsoLen * 0.55, y: chestP.y - ty * torsoLen * 0.55 };
    const bottomC: Pt = { x: pelvisP.x - tx * headW * 0.4, y: pelvisP.y - ty * headW * 0.4 };

    // 左側（上→下）と右側（下→上）の輪郭点
    const left: Pt[] = [
      shoulderLP,
      { x: chestP.x - (px * chestW) / 2, y: chestP.y - (py * chestW) / 2 },
      { x: waistC.x - (px * waistW) / 2, y: waistC.y - (py * waistW) / 2 },
      { x: pelvisP.x - (px * hipW) / 2, y: pelvisP.y - (py * hipW) / 2 },
      { x: bottomC.x - (px * hipW * 0.4), y: bottomC.y - (py * hipW * 0.4) },
    ];
    const right: Pt[] = [
      { x: bottomC.x + px * hipW * 0.4, y: bottomC.y + py * hipW * 0.4 },
      { x: pelvisP.x + (px * hipW) / 2, y: pelvisP.y + (py * hipW) / 2 },
      { x: waistC.x + (px * waistW) / 2, y: waistC.y + (py * waistW) / 2 },
      { x: chestP.x + (px * chestW) / 2, y: chestP.y + (py * chestW) / 2 },
      shoulderRP,
    ];

    // 滑らかな閉曲線（中点経由の二次曲線）
    const ring = [...left, ...right];
    this.ctx.beginPath();
    this.ctx.moveTo((ring[0].x + ring[ring.length - 1].x) / 2, (ring[0].y + ring[ring.length - 1].y) / 2);
    for (let i = 0; i < ring.length; i++) {
      const cur = ring[i];
      const nxt = ring[(i + 1) % ring.length];
      this.ctx.quadraticCurveTo(cur.x, cur.y, (cur.x + nxt.x) / 2, (cur.y + nxt.y) / 2);
    }
    this.ctx.closePath();

    const grad = this.ctx.createLinearGradient(
      chestP.x - px * shoulderW, chestP.y - py * shoulderW,
      chestP.x + px * shoulderW, chestP.y + py * shoulderW,
    );
    grad.addColorStop(0, skin.shadow);
    grad.addColorStop(0.5, skin.base);
    grad.addColorStop(1, skin.shadow);
    this.ctx.fillStyle = grad;
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(90,60,45,0.15)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    // 乳房（女性相当のサイズ時のみ）— 胴体軸に沿って配置
    const bustSize = ((parts.breastL?.morph['size'] ?? 1) + (parts.breastR?.morph['size'] ?? 1)) / 2;
    if (bustSize > 0.35 && globals.sex !== 'male') {
      const bustR = headW * 0.20 * bustSize;
      const bustCY = 0.28; // 胸→骨盤方向への比率
      const bc: Pt = { x: chestP.x - tx * torsoLen * bustCY, y: chestP.y - ty * torsoLen * bustCY };
      for (const s of [-1, 1]) {
        const bx = bc.x + px * headW * 0.28 * s;
        const by = bc.y + py * headW * 0.28 * s;
        const grad2 = this.ctx.createRadialGradient(bx, by - bustR * 0.3, bustR * 0.1, bx, by, bustR * 1.1);
        grad2.addColorStop(0, hexToRgba(skin.highlight, 0.4));
        grad2.addColorStop(0.5, hexToRgba(skin.base, 0.15));
        grad2.addColorStop(1, 'rgba(0,0,0,0)');
        this.ctx.beginPath();
        this.ctx.ellipse(bx, by, bustR, bustR * 0.85, Math.atan2(ty, tx) + Math.PI / 2, 0, Math.PI * 2);
        this.ctx.fillStyle = grad2;
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.ellipse(bx - tx * bustR * 0.3, by - ty * bustR * 0.3, bustR * 0.7, bustR * 0.4, Math.atan2(ty, tx) + Math.PI / 2, 0, Math.PI * 2);
        this.ctx.fillStyle = hexToRgba(skin.shadow, 0.2);
        this.ctx.fill();
      }
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
}
