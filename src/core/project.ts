// プロジェクトファイル (.pvsproj) の保存・復元・バージョン管理
import {
  PROJECT_VERSION,
  type ProjectFile,
  type PartStateMap,
  type BodyGlobals,
  type HairConfig,
  type ClothingState,
  type Annotation,
  type Measurement,
  type HairRemovalDesign,
  type PoseState,
} from './types';
import { createDefaultParts } from './parts';
import { DEFAULTS } from './store';

export interface ProjectBuildInput {
  globals: BodyGlobals;
  parts: PartStateMap;
  hair: HairConfig;
  clothing: ClothingState;
  pose: PoseState;
  scenarios: { id: string; name: string; createdAt: number }[];
  scenarioData: ProjectFile['scenarioData'];
  annotations: Annotation[];
  measurements: Measurement[];
  hairRemoval: HairRemovalDesign[];
  camera: { position: { x: number; y: number; z: number }; target: { x: number; y: number; z: number } };
  sourcePhoto?: string;
  photoLandmarks?: { x: number; y: number; label: string }[];
}

export function buildProjectFile(input: ProjectBuildInput): ProjectFile {
  return {
    format: 'pvsproj',
    version: PROJECT_VERSION,
    savedAt: Date.now(),
    globals: structuredClone(input.globals),
    parts: structuredClone(input.parts),
    hair: structuredClone(input.hair),
    clothing: structuredClone(input.clothing),
    pose: structuredClone(input.pose),
    scenarios: structuredClone(input.scenarios),
    scenarioData: structuredClone(input.scenarioData),
    annotations: structuredClone(input.annotations),
    measurements: structuredClone(input.measurements),
    hairRemoval: structuredClone(input.hairRemoval),
    camera: structuredClone(input.camera),
    sourcePhoto: input.sourcePhoto,
    photoLandmarks: input.photoLandmarks,
    checkpoints: [],
  };
}

export function serializeProject(p: ProjectFile): string {
  return JSON.stringify(p, null, 2);
}

export class ProjectParseError extends Error {}

/** ファイル内容を検証して復元する。破損・非対応バージョンは例外。 */
export function parseProject(json: string): ProjectFile {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new ProjectParseError('ファイルがJSONとして読み取れません。ファイルが破損している可能性があります。');
  }
  const p = data as Partial<ProjectFile>;
  if (p?.format !== 'pvsproj') {
    throw new ProjectParseError('このファイルは Personal Visual Studio のプロジェクトファイルではありません。');
  }
  if (typeof p.version !== 'number' || p.version > PROJECT_VERSION) {
    throw new ProjectParseError(`プロジェクト形式バージョン ${p.version} には対応していません（対応: ${PROJECT_VERSION} 以下）。`);
  }
  // 欠損フィールドを既定値で補完（将来バージョンとの後方互換）
  const mergedParts = mergeParts(p.parts ?? {});
  return {
    format: 'pvsproj',
    version: p.version,
    savedAt: p.savedAt ?? Date.now(),
    globals: { ...structuredClone(DEFAULTS.globals), ...(p.globals ?? {}) },
    parts: mergedParts,
    hair: { ...structuredClone(DEFAULTS.hair), ...(p.hair ?? {}) },
    clothing: { ...structuredClone(DEFAULTS.clothing), ...(p.clothing ?? {}) },
    scenarios: p.scenarios ?? [],
    scenarioData: p.scenarioData ?? {},
    annotations: p.annotations ?? [],
    measurements: p.measurements ?? [],
    hairRemoval: p.hairRemoval ?? [],
    camera: p.camera ?? { position: { x: 0, y: 1, z: 2.6 }, target: { x: 0, y: 0.95, z: 0 } },
    sourcePhoto: p.sourcePhoto,
    photoLandmarks: p.photoLandmarks,
    checkpoints: p.checkpoints ?? [],
  };
}

/** 保存ファイルに存在しない部位は既定値で補完し、余分なキーは既定のものだけ採用 */
export function mergeParts(saved: Partial<PartStateMap>): PartStateMap {
  const defaults = createDefaultParts();
  const out: PartStateMap = {};
  for (const id of Object.keys(defaults)) {
    const d = defaults[id];
    const s = saved[id];
    if (!s) {
      out[id] = d;
      continue;
    }
    const morph = { ...d.morph };
    for (const k of Object.keys(morph)) {
      if (typeof s.morph?.[k] === 'number') morph[k] = s.morph[k];
    }
    const provenance = { ...d.provenance };
    for (const k of Object.keys(provenance)) {
      if (s.provenance?.[k]) provenance[k] = s.provenance[k];
    }
    out[id] = {
      visible: s.visible ?? true,
      locked: s.locked ?? false,
      offset: { ...d.offset, ...(s.offset ?? {}) },
      rotation: { ...d.rotation, ...(s.rotation ?? {}) },
      scale: { ...d.scale, ...(s.scale ?? {}) },
      morph,
      color: s.color ?? d.color,
      color2: s.color2 ?? d.color2,
      roughness: typeof s.roughness === 'number' ? s.roughness : d.roughness,
      provenance,
    };
  }
  return out;
}

/** ブラウザでのファイル保存 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',');
  const mime = head.match(/data:(.*?);/)?.[1] ?? 'application/octet-stream';
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
