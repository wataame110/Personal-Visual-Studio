// 非破壊編集セッション：原本 + 編集操作列 → 描画
// Undo/Redo・保存/復元は操作列の管理として実装する。
import type { Mask } from './mask';
import {
  blendPreservingOutside, hueShiftWithinMask, smoothWithinMask,
  inpaintWithinMask, adjustWithinMask, type RGBImage,
} from './composite';
import { applyWarp, type WarpField } from './warp';

/** 編集操作（すべてマスク指定。マスク外の原本画素は保持される） */
export type EditOp =
  | { kind: 'recolor'; maskId: string; hueDeg: number; satScale: number; lumScale: number }
  | { kind: 'smooth'; maskId: string; strength: number; radius: number }
  | { kind: 'inpaint'; maskId: string }
  | { kind: 'adjust'; maskId: string; brightness: number; contrast: number }
  | { kind: 'warp'; maskId: string; field: WarpField };

export interface EditSession {
  width: number;
  height: number;
  /** 名前つきマスク（部位領域・手動補正の結果） */
  masks: Record<string, Mask>;
  /** 適用済み操作列 */
  ops: EditOp[];
  /** Undoで取り消された操作（Redo用） */
  redoOps: EditOp[];
}

export function createSession(width: number, height: number): EditSession {
  return { width, height, masks: {}, ops: [], redoOps: [] };
}

export function setMask(s: EditSession, id: string, mask: Mask): EditSession {
  return { ...s, masks: { ...s.masks, [id]: mask } };
}

export function pushOp(s: EditSession, op: EditOp): EditSession {
  return { ...s, ops: [...s.ops, op], redoOps: [] };
}

export function undoOp(s: EditSession): EditSession {
  if (s.ops.length === 0) return s;
  return { ...s, ops: s.ops.slice(0, -1), redoOps: [...s.redoOps, s.ops[s.ops.length - 1]] };
}

export function redoOp(s: EditSession): EditSession {
  if (s.redoOps.length === 0) return s;
  return { ...s, redoOps: s.redoOps.slice(0, -1), ops: [...s.ops, s.redoOps[s.redoOps.length - 1]] };
}

/**
 * 操作列を原本へ適用して描画する。
 * 各操作はマスク内のみ変更するため、全操作を通してマスク外の画素は原本と一致する。
 */
export function renderSession(original: RGBImage, s: EditSession): RGBImage {
  let img = original;
  for (const op of s.ops) {
    const mask = s.masks[op.maskId];
    if (!mask) continue;
    switch (op.kind) {
      case 'recolor':
        img = hueShiftWithinMask(img, mask, op.hueDeg, op.satScale, op.lumScale);
        break;
      case 'smooth':
        img = smoothWithinMask(img, mask, op.strength, op.radius);
        break;
      case 'inpaint':
        img = inpaintWithinMask(img, { ...mask, data: new Uint8Array(mask.data) });
        break;
      case 'adjust':
        img = adjustWithinMask(img, mask, op.brightness, op.contrast);
        break;
      case 'warp':
        img = applyWarp(img, op.field, mask);
        break;
    }
    // 合成関数自体はマスク内のみ変更する設計だが、最終的な原本保持を保証レイヤーで再確認
    img = blendPreservingOutside(original, img, unionAllTouchedMasks(s));
  }
  return img;
}

/** 全操作で触れられた領域の和集合マスク（原本保持の最終保証用） */
import { unionMask, createMask } from './mask';
function unionAllTouchedMasks(s: EditSession): Mask {
  let acc = createMask(s.width, s.height);
  for (const op of s.ops) {
    const m = s.masks[op.maskId];
    if (m) acc = unionMask(acc, m);
  }
  return acc;
}

/** 保存用にセッションをシリアライズ（マスクは圧縮せず配列化。プロジェクトJSONに埋め込む） */
export function serializeSession(s: EditSession) {
  const masks: Record<string, { width: number; height: number; data: number[] }> = {};
  for (const [id, m] of Object.entries(s.masks)) {
    masks[id] = { width: m.width, height: m.height, data: Array.from(m.data) };
  }
  return {
    width: s.width, height: s.height, masks,
    ops: s.ops.map((op) =>
      op.kind === 'warp'
        ? { ...op, field: { width: op.field.width, height: op.field.height, vec: Array.from(op.field.vec) } }
        : op,
    ),
  };
}

export function deserializeSession(raw: ReturnType<typeof serializeSession>): EditSession {
  const masks: Record<string, Mask> = {};
  for (const [id, m] of Object.entries(raw.masks)) {
    masks[id] = { width: m.width, height: m.height, data: new Uint8Array(m.data) };
  }
  return {
    width: raw.width, height: raw.height, masks,
    ops: raw.ops.map((op) =>
      op.kind === 'warp'
        ? { ...op, field: { width: op.field.width, height: op.field.height, vec: new Float32Array(op.field.vec) } }
        : op,
    ) as EditOp[],
    redoOps: [],
  };
}
