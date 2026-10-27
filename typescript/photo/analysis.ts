// MediaPipe による写真解析（端末内完結。外部APIへ画像を送信しない）
import { FilesetResolver, FaceLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';

export interface Landmark2D {
  x: number; // 0..1（画像内正規化座標）
  y: number;
  label: string;
}

export interface PhotoAnalysisResult {
  faceLandmarks: Landmark2D[];
  poseLandmarks: Landmark2D[];
  imageWidth: number;
  imageHeight: number;
}

let faceLandmarker: FaceLandmarker | null = null;
let poseLandmarker: PoseLandmarker | null = null;
let initPromise: Promise<void> | null = null;

const base = () => import.meta.env.BASE_URL;

/** モデルの利用可否を事前確認（未配置なら手動モードへ） */
export async function checkModelAvailability(): Promise<{ face: boolean; pose: boolean }> {
  const head = async (url: string) => {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      return res.ok;
    } catch {
      return false;
    }
  };
  const [face, pose] = await Promise.all([
    head(`${base()}models/face_landmarker.task`),
    head(`${base()}models/pose_landmarker_lite.task`),
  ]);
  return { face, pose };
}

async function init(): Promise<void> {
  if (faceLandmarker && poseLandmarker) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(`${base()}mediapipe/wasm`);
    const avail = await checkModelAvailability();
    if (avail.face) {
      faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: `${base()}models/face_landmarker.task` },
        runningMode: 'IMAGE',
        numFaces: 1,
      });
    }
    if (avail.pose) {
      poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: `${base()}models/pose_landmarker_lite.task` },
        runningMode: 'IMAGE',
        numPoses: 1,
      });
    }
    if (!faceLandmarker && !poseLandmarker) {
      throw new Error('解析モデルが配置されていません。手動モードで編集してください。');
    }
  })();
  try {
    await initPromise;
  } finally {
    initPromise = null;
  }
}

/**
 * 画像を解析し、顔・姿勢のランドマークを返す。
 * すべてブラウザ内で処理され、画像は外部へ送信されない。
 */
export async function analyzePhoto(image: HTMLImageElement): Promise<PhotoAnalysisResult> {
  await init();
  const faceLandmarks: Landmark2D[] = [];
  const poseLandmarks: Landmark2D[] = [];

  if (faceLandmarker) {
    const result = faceLandmarker.detect(image);
    const face = result.faceLandmarks?.[0];
    if (face) {
      face.forEach((p, i) => faceLandmarks.push({ x: p.x, y: p.y, label: `face-${i}` }));
    }
  }
  if (poseLandmarker) {
    const result = poseLandmarker.detect(image);
    const pose = result.landmarks?.[0];
    if (pose) {
      pose.forEach((p, i) => poseLandmarks.push({ x: p.x, y: p.y, label: `pose-${i}` }));
    }
  }
  if (faceLandmarks.length === 0 && poseLandmarks.length === 0) {
    throw new Error('人物を検出できませんでした。正面を向いた写真で再試行するか、手動モードで編集してください。');
  }
  return { faceLandmarks, poseLandmarks, imageWidth: image.naturalWidth, imageHeight: image.naturalHeight };
}

// MediaPipe Face Landmarker の主要インデックス
const FACE_IDX = {
  leftEyeOuter: 263,
  rightEyeOuter: 33,
  leftEyeTop: 159,
  leftEyeBottom: 145,
  rightEyeTop: 386,
  rightEyeBottom: 374,
  leftEyeCenter: 468, // irisが無い場合は近似として利用され得る（検出点数で確認）
  noseTip: 1,
  noseBottom: 2,
  chinBottom: 152,
  foreheadTop: 10,
  faceLeft: 234,
  faceRight: 454,
  jawLeft: 172, // 顎ライン左（咬筋付近）
  jawRight: 397, // 顎ライン右
  cheekLeft: 116,
  cheekRight: 345,
  mouthLeft: 61,
  mouthRight: 291,
  mouthTop: 0,
  mouthBottom: 17,
  browLeftTop: 105,
  browRightTop: 334,
  hairline: 151, // 額中央の生え際近似
};

// Pose Landmarker の主要インデックス
const POSE_IDX = { leftShoulder: 11, rightShoulder: 12, leftHip: 23, rightHip: 24, nose: 0 };

export interface GuideParams {
  /** 検出に成功した項目のみ含まれる。値はモデルの morph パラメータに対応。 */
  head?: { width?: number; length?: number; jawWidth?: number };
  eyeL?: { posX?: number; size?: number; height?: number };
  eyeR?: { posX?: number; size?: number; height?: number };
  nose?: { length?: number };
  mouth?: { width?: number; posY?: number };
  chest?: { shoulderWidth?: number };
  pelvis?: { width?: number };
  detectedItems: string[];
}

/** 正規化座標の距離を画像アスペクトで補正した水平距離 */
const dx = (a: Landmark2D, b: Landmark2D, aspect: number) => Math.abs(a.x - b.x) * aspect;
const dy = (a: Landmark2D, b: Landmark2D) => Math.abs(a.y - b.y);
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * ランドマークから初期ガイドパラメータを推定する。
 * 写真から得られない情報（奥行き・体積等）は推定しない。
 * 推定値はあくまで初期ガイドであり、実測値ではない。
 */
export function landmarksToGuideParams(result: PhotoAnalysisResult, photoAspect: number): GuideParams {
  const guide: GuideParams = { detectedItems: [] };
  const fl = result.faceLandmarks;
  if (fl.length > 400) {
    const get = (i: number) => fl[i];
    const faceW = dx(get(FACE_IDX.faceRight), get(FACE_IDX.faceLeft), photoAspect);
    const faceH = dy(get(FACE_IDX.foreheadTop), get(FACE_IDX.chinBottom));
    if (faceW > 0.01 && faceH > 0.01) {
      const ratio = faceH / faceW;
      guide.head = {
        length: clamp(ratio / 1.35, 0.8, 1.25),
        width: 1,
      };
      guide.detectedItems.push('顔の輪郭');
      // 顎の幅：顔の最大幅に対する顎ライン幅の比率（標準比0.78で正規化）
      const jawW = dx(get(FACE_IDX.jawRight), get(FACE_IDX.jawLeft), photoAspect);
      if (jawW > 0.005) {
        guide.head.jawWidth = clamp(jawW / faceW / 0.78, 0.6, 1.4);
        guide.detectedItems.push('顎の幅');
      }
    }
    const eyeW = dx(get(FACE_IDX.rightEyeOuter), get(FACE_IDX.leftEyeOuter), photoAspect);
    if (faceW > 0.01 && eyeW > 0.005) {
      // 目の開き（上下まぶた間距離の左右平均）
      const openL = dy(get(FACE_IDX.leftEyeTop), get(FACE_IDX.leftEyeBottom));
      const openR = dy(get(FACE_IDX.rightEyeTop), get(FACE_IDX.rightEyeBottom));
      const openAvg = (openL + openR) / 2;
      const sizeRel = clamp((openAvg / faceH) * 22, 0.5, 1.6);
      guide.eyeL = { size: sizeRel, height: sizeRel };
      guide.eyeR = { size: sizeRel, height: sizeRel };
      guide.detectedItems.push('目の位置・大きさ');
      // 目の離隔：両目外眼角間距離と顔幅の比率（標準比0.62で正規化）を左右位置の対称補正へ
      const spacingRatio = eyeW / faceW;
      const offset = clamp((spacingRatio - 0.62) * 0.05, -0.012, 0.012);
      if (Math.abs(offset) > 0.001) {
        guide.eyeL.posX = offset;
        guide.eyeR.posX = offset;
      }
    }
    const mouthW = dx(get(FACE_IDX.mouthRight), get(FACE_IDX.mouthLeft), photoAspect);
    if (eyeW > 0.005) {
      guide.mouth = { width: clamp(mouthW / (eyeW * 0.62), 0.7, 1.4) };
      guide.detectedItems.push('口の幅');
      // 口の上下位置：鼻先〜顎先の間での口の相対位置（標準0.38で正規化）
      const noseToChin = dy(get(FACE_IDX.noseTip), get(FACE_IDX.chinBottom));
      const noseToMouth = dy(get(FACE_IDX.noseTip), get(FACE_IDX.mouthTop));
      if (noseToChin > 0.005) {
        const rel = noseToMouth / noseToChin;
        const posY = clamp((rel - 0.38) * 0.06, -0.01, 0.01);
        if (Math.abs(posY) > 0.0015) guide.mouth.posY = posY;
        guide.detectedItems.push('口の位置');
      }
    }
    // 鼻の長さ：眉間〜鼻先の顔長に対する比率（標準0.33で正規化）
    const browMidY = (get(FACE_IDX.browLeftTop).y + get(FACE_IDX.browRightTop).y) / 2;
    const noseLen = Math.abs(get(FACE_IDX.noseTip).y - browMidY);
    if (faceH > 0.01 && noseLen > 0.005) {
      guide.nose = { length: clamp(noseLen / faceH / 0.33, 0.8, 1.3) };
      guide.detectedItems.push('鼻の長さ');
    }
  }
  const pl = result.poseLandmarks;
  if (pl.length >= 25) {
    const shoulderW = dx(pl[POSE_IDX.leftShoulder], pl[POSE_IDX.rightShoulder], photoAspect);
    const hipW = dx(pl[POSE_IDX.leftHip], pl[POSE_IDX.rightHip], photoAspect);
    if (shoulderW > 0.02 && hipW > 0.02) {
      const hipRatio = hipW / shoulderW;
      guide.pelvis = { width: clamp(hipRatio / 0.82, 0.75, 1.35) };
      guide.detectedItems.push('肩幅・骨盤幅の比率');
    }
    // 頭の幅：顔幅と肩幅の比率から推定（標準比0.42で正規化）
    if (fl.length > 400 && shoulderW > 0.02) {
      const faceW = dx(fl[FACE_IDX.faceRight], fl[FACE_IDX.faceLeft], photoAspect);
      if (faceW > 0.01 && guide.head) {
        guide.head.width = clamp(faceW / shoulderW / 0.42, 0.7, 1.3);
        guide.detectedItems.push('頭身比（頭の幅）');
      }
    }
  }
  return guide;
}

/** 画素配列（RGBAフラット）の平均色を #rrggbb で返す。純粋関数として単体テスト可能。 */
export function averagePixels(pixels: number[] | Uint8ClampedArray): string {
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i + 2 < pixels.length; i += 4) {
    r += pixels[i];
    g += pixels[i + 1];
    b += pixels[i + 2];
    n++;
  }
  if (n === 0) return '#000000';
  const hex = (v: number) => Math.round(v / n).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/** 彩度・輝度が肌らしくない画素（背景・髪・白飛び等）を除く簡易フィルタ。純粋関数。 */
export function filterSkinPixels(pixels: Uint8ClampedArray): number[] {
  const out: number[] = [];
  for (let i = 0; i + 2 < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    // 肌色の一般的条件：R>G>B寄り・極端な暗黒/白飛び/無彩色を除外
    if (max < 40 || min > 245) continue;
    if (max - min < 12) continue; // 無彩色（背景・衣服等）を除外
    if (r >= g && g >= b - 8) out.push(r, g, b, 255);
  }
  return out;
}

export interface IdentityColors {
  /** 頬・額の平均から推定した肌色 */
  skinColor?: string;
  /** 生え際より上の領域から推定した髪色 */
  hairColor?: string;
}

/**
 * 写真から肌色・髪色を抽出する（端末内処理）。
 * 照明の影響を受けるため参考値であり、適用後に手動調整できる。
 */
export function sampleIdentityColors(
  image: HTMLImageElement,
  result: PhotoAnalysisResult,
): IdentityColors {
  if (typeof document === 'undefined') return {};
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return {};
  const w = image.naturalWidth;
  const h = image.naturalHeight;
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(image, 0, 0);

  const colors: IdentityColors = {};
  const fl = result.faceLandmarks;
  if (fl.length > 400) {
    // 肌色：左右の頬と額の小領域をサンプル
    const patch = (cx: number, cy: number, size: number): Uint8ClampedArray | null => {
      const x = Math.round(cx * w - size / 2);
      const y = Math.round(cy * h - size / 2);
      if (x < 0 || y < 0 || x + size > w || y + size > h) return null;
      return ctx.getImageData(x, y, size, size).data;
    };
    const size = Math.max(6, Math.round(w * 0.015));
    const samples: number[] = [];
    for (const idx of [FACE_IDX.cheekLeft, FACE_IDX.cheekRight, FACE_IDX.hairline]) {
      const data = patch(fl[idx].x, fl[idx].y, size);
      if (data) samples.push(...filterSkinPixels(data));
    }
    if (samples.length >= 12) colors.skinColor = averagePixels(samples);

    // 髪色：生え際より上（額トップのさらに上）をサンプル
    const hairY = fl[FACE_IDX.foreheadTop].y - (fl[FACE_IDX.hairline].y - fl[FACE_IDX.foreheadTop].y) * 1.5;
    const hairData = patch(fl[FACE_IDX.foreheadTop].x, Math.max(0.01, hairY), size);
    if (hairData) {
      // 暗めの画素のみ採用（肌・背景を除外）
      const dark: number[] = [];
      for (let i = 0; i + 2 < hairData.length; i += 4) {
        const lum = hairData[i] * 0.3 + hairData[i + 1] * 0.6 + hairData[i + 2] * 0.1;
        if (lum < 140) dark.push(hairData[i], hairData[i + 1], hairData[i + 2], 255);
      }
      if (dark.length >= 12) colors.hairColor = averagePixels(dark);
    }
  }
  return colors;
}
