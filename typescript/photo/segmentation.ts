// 人物領域分割：MediaPipe ImageSegmenter（selfie multiclass）による領域分離
// すべて端末内で実行され、写真は外部へ送信されない。
import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision';
import { maskFromClasses, featherMask, type Mask } from './mask';

// WASM ランタイムはアプリと同梱（javascript/fetch-models.mjs で配置。外部CDNに依存しない）
const WASM_BASE = `${import.meta.env.BASE_URL}mediapipe/wasm`;
const MODELS_BASE = `${import.meta.env.BASE_URL}models/`;

/** selfie_multiclass_256x256 のクラス番号 */
export const SEG_CLASS = {
  background: 0,
  hair: 1,
  bodySkin: 2,
  faceSkin: 3,
  clothes: 4,
  accessories: 5,
} as const;

export type RegionKind = 'hair' | 'face' | 'skin' | 'clothes' | 'person' | 'background';

const REGION_CLASSES: Record<RegionKind, number[]> = {
  hair: [SEG_CLASS.hair],
  face: [SEG_CLASS.faceSkin],
  skin: [SEG_CLASS.bodySkin, SEG_CLASS.faceSkin],
  clothes: [SEG_CLASS.clothes, SEG_CLASS.accessories],
  person: [SEG_CLASS.hair, SEG_CLASS.bodySkin, SEG_CLASS.faceSkin, SEG_CLASS.clothes, SEG_CLASS.accessories],
  background: [SEG_CLASS.background],
};

let segmenter: ImageSegmenter | null = null;

/** モデルファイルの有無を事前確認（存在しない場合は UI 側で案内する） */
export async function checkSegmentationAvailability(): Promise<boolean> {
  try {
    const res = await fetch(`${MODELS_BASE}selfie_multiclass_256x256.tflite`, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function initSegmenter(): Promise<void> {
  if (segmenter) return;
  const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
  segmenter = await ImageSegmenter.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath: `${MODELS_BASE}selfie_multiclass_256x256.tflite`,
    },
    runningMode: 'IMAGE',
    outputCategoryMask: true,
    outputConfidenceMasks: false,
  });
}

/**
 * 写真から領域マスクを生成する。
 * 返されるマスクは入力画像サイズへリサンプル済み・フェザー適用済み。
 */
export async function segmentPhoto(
  image: HTMLImageElement,
  kinds: RegionKind[],
  feather = 2,
): Promise<Record<string, Mask>> {
  if (!segmenter) throw new Error('セグメンテーションモデルが初期化されていません');
  const result = segmenter.segment(image);
  const cm = result.categoryMask;
  if (!cm) throw new Error('領域分割に失敗しました');
  const mw = cm.width;
  const mh = cm.height;
  const classes = cm.getAsUint8Array();
  const targetW = image.naturalWidth;
  const targetH = image.naturalHeight;
  const out: Record<string, Mask> = {};
  for (const kind of kinds) {
    const raw = maskFromClasses(classes, mw, mh, REGION_CLASSES[kind], targetW, targetH);
    out[kind] = feather > 0 ? featherMask(raw, feather) : raw;
  }
  cm.close();
  result.close();
  return out;
}
