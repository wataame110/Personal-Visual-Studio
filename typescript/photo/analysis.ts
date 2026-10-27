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
  noseTip: 1,
  chinBottom: 152,
  foreheadTop: 10,
  faceLeft: 234,
  faceRight: 454,
  mouthLeft: 61,
  mouthRight: 291,
  browLeftTop: 105,
  browRightTop: 334,
};

// Pose Landmarker の主要インデックス
const POSE_IDX = { leftShoulder: 11, rightShoulder: 12, leftHip: 23, rightHip: 24, nose: 0 };

export interface GuideParams {
  /** 検出に成功した項目のみ含まれる。値はモデルの morph パラメータに対応。 */
  head?: { width?: number; length?: number; jawWidth?: number };
  eyeL?: { posX?: number; size?: number; height?: number };
  eyeR?: { posX?: number; size?: number; height?: number };
  nose?: { length?: number };
  mouth?: { width?: number };
  chest?: { shoulderWidth?: number };
  pelvis?: { width?: number };
  detectedItems: string[];
}

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
    const faceW = Math.abs(get(FACE_IDX.faceRight).x - get(FACE_IDX.faceLeft).x) * photoAspect;
    const faceH = Math.abs(get(FACE_IDX.foreheadTop).y - get(FACE_IDX.chinBottom).y);
    if (faceW > 0.01 && faceH > 0.01) {
      const ratio = faceH / faceW;
      guide.head = {
        length: Math.min(1.25, Math.max(0.8, ratio / 1.35)),
        width: 1,
      };
      guide.detectedItems.push('顔の輪郭');
    }
    const eyeW = Math.abs(get(FACE_IDX.rightEyeOuter).x - get(FACE_IDX.leftEyeOuter).x) * photoAspect;
    if (faceW > 0.01) {
      // 目の開き（上下まぶた間距離の左右平均）
      const openL = Math.abs(get(FACE_IDX.leftEyeTop).y - get(FACE_IDX.leftEyeBottom).y);
      const openR = Math.abs(get(FACE_IDX.rightEyeTop).y - get(FACE_IDX.rightEyeBottom).y);
      const openAvg = (openL + openR) / 2;
      const sizeRel = Math.min(1.6, Math.max(0.5, (openAvg / faceH) * 22));
      guide.eyeL = { size: sizeRel, height: sizeRel };
      guide.eyeR = { size: sizeRel, height: sizeRel };
      guide.detectedItems.push('目の位置・大きさ');
    }
    const mouthW = Math.abs(get(FACE_IDX.mouthRight).x - get(FACE_IDX.mouthLeft).x) * photoAspect;
    if (eyeW > 0.005) {
      guide.mouth = { width: Math.min(1.4, Math.max(0.7, mouthW / (eyeW * 0.62))) };
      guide.detectedItems.push('口の幅');
    }
  }
  const pl = result.poseLandmarks;
  if (pl.length >= 25) {
    const shoulderW = Math.abs(pl[POSE_IDX.leftShoulder].x - pl[POSE_IDX.rightShoulder].x) * photoAspect;
    const hipW = Math.abs(pl[POSE_IDX.leftHip].x - pl[POSE_IDX.rightHip].x) * photoAspect;
    if (shoulderW > 0.02 && hipW > 0.02) {
      const hipRatio = hipW / shoulderW;
      guide.pelvis = { width: Math.min(1.35, Math.max(0.75, hipRatio / 0.82)) };
      guide.detectedItems.push('肩幅・骨盤幅の比率');
    }
  }
  return guide;
}
