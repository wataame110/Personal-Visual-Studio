// アプリケーション状態管理（zustand）＋ Undo/Redo 履歴
import { create } from 'zustand';
import type {
  PartStateMap,
  BodyGlobals,
  HairConfig,
  ClothingState,
  Garment,
  Annotation,
  Measurement,
  HairRemovalDesign,
  Scenario,
  Vec3,
  Provenance,
} from './types';
import { createDefaultParts } from './parts';

export type AppMode = 'general' | 'medical';
export type UiLevel = 'beginner' | 'expert';

export interface Snapshot {
  parts: PartStateMap;
  globals: BodyGlobals;
  hair: HairConfig;
  clothing: ClothingState;
}

const DEFAULT_GLOBALS: BodyGlobals = {
  height: 1.65,
  sex: 'female',
  bodyFat: 0.4,
  muscle: 0.25,
  posture: 0,
};

const DEFAULT_HAIR: HairConfig = {
  style: 'bob',
  length: 0.5,
  volume: 0.5,
  curl: 0.1,
  bangs: 0.5,
  parting: 0,
  color: '#2b2019',
  color2: '#6b4a2f',
  gradient: 0,
};

const DEFAULT_CLOTHING: ClothingState = {
  garments: [
    { id: 'g-tops', kind: 'tops', visible: true, color: '#88aacc', pattern: 'solid', offsetY: 0, useReferenceTexture: false },
    { id: 'g-outer', kind: 'outer', visible: false, color: '#445566', pattern: 'solid', offsetY: 0, useReferenceTexture: false },
    { id: 'g-pants', kind: 'pants', visible: true, color: '#33415c', pattern: 'solid', offsetY: 0, useReferenceTexture: false },
    { id: 'g-skirt', kind: 'skirt', visible: false, color: '#aa5577', pattern: 'solid', offsetY: 0, useReferenceTexture: false },
    { id: 'g-dress', kind: 'dress', visible: false, color: '#9966aa', pattern: 'solid', offsetY: 0, useReferenceTexture: false },
    { id: 'g-shoes', kind: 'shoes', visible: false, color: '#333333', pattern: 'solid', offsetY: 0, useReferenceTexture: false },
    { id: 'g-hat', kind: 'hat', visible: false, color: '#cc8855', pattern: 'solid', offsetY: 0, useReferenceTexture: false },
  ],
  glasses: { visible: false, color: '#222222', shape: 'wellington' },
  accessories: [
    { id: 'a-earring', kind: 'earring', visible: false, color: '#d4af37' },
    { id: 'a-necklace', kind: 'necklace', visible: false, color: '#c0c0c0' },
  ],
};

/** 上半身を覆う衣服カテゴリ */
const UPPER_KINDS: Garment['kind'][] = ['tops', 'outer', 'dress'];
/** 下半身を覆う衣服カテゴリ */
const LOWER_KINDS: Garment['kind'][] = ['pants', 'skirt', 'dress'];

/**
 * 一般モードの常時着衣保証：上半身・下半身のいずれかの衣服が必ず着用された状態に補正する。
 * ・初期状態・保存・読込・Undo・Redo・シナリオ適用・モード切替のすべてで呼ばれる
 * ・衣服の生成に失敗した場合も状態上は着用済みとして扱われる
 */
function ensureClothed(clothing: ClothingState): ClothingState {
  const upperOn = clothing.garments.some((g) => g.visible && UPPER_KINDS.includes(g.kind));
  const lowerOn = clothing.garments.some((g) => g.visible && LOWER_KINDS.includes(g.kind));
  if (upperOn && lowerOn) return clothing;
  const garments = clothing.garments.map((g) => {
    if (!upperOn && g.kind === 'tops') return { ...g, visible: true };
    if (!lowerOn && g.kind === 'pants') return { ...g, visible: true };
    return g;
  });
  return { ...clothing, garments };
}

const HISTORY_LIMIT = 100;

interface EditorState {
  mode: AppMode;
  uiLevel: UiLevel;
  parts: PartStateMap;
  globals: BodyGlobals;
  hair: HairConfig;
  clothing: ClothingState;
  annotations: Annotation[];
  measurements: Measurement[];
  hairRemoval: HairRemovalDesign[];
  scenarios: Scenario[];
  selectedPart: string | null;
  /** 比較ビューで表示しているシナリオ（null=現在の編集中モデル） */
  compareScenarioId: string | null;
  cameraSync: boolean;
  cameraPresetRequest: string | null; // ビューポートへの視点変更要求
  focusPartRequest: string | null;
  quality: 'high' | 'low';
  webglFailed: boolean;

  past: Snapshot[];
  future: Snapshot[];

  setMode: (m: AppMode) => void;
  setUiLevel: (l: UiLevel) => void;
  selectPart: (id: string | null) => void;
  setMorph: (partId: string, key: string, value: number, provenance?: Provenance) => void;
  setPartField: (partId: string, field: 'offset' | 'rotation' | 'scale', axis: keyof Vec3, value: number) => void;
  setPartColor: (partId: string, color: string, sub?: boolean) => void;
  setPartRoughness: (partId: string, v: number) => void;
  togglePartVisible: (partId: string) => void;
  togglePartLocked: (partId: string) => void;
  setGlobals: (g: Partial<BodyGlobals>) => void;
  setHair: (h: Partial<HairConfig>) => void;
  setClothing: (c: Partial<ClothingState>) => void;
  addAnnotation: (a: Annotation) => void;
  removeAnnotation: (id: string) => void;
  addMeasurement: (m: Measurement) => void;
  removeMeasurement: (id: string) => void;
  setHairRemoval: (list: HairRemovalDesign[]) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  saveScenario: (name: string) => void;
  applyScenario: (id: string) => void;
  deleteScenario: (id: string) => void;
  duplicateScenario: (id: string) => void;
  setCompareScenario: (id: string | null) => void;
  setCameraSync: (v: boolean) => void;
  requestCameraPreset: (preset: string) => void;
  clearCameraPresetRequest: () => void;
  requestFocusPart: (partId: string) => void;
  clearFocusPartRequest: () => void;
  setQuality: (q: 'high' | 'low') => void;
  setWebglFailed: (v: boolean) => void;
  loadSnapshot: (s: Snapshot) => void;
  copyPartParams: (fromId: string, toId: string) => void;
  resetAll: () => void;
}

function takeSnapshot(s: EditorState): Snapshot {
  return structuredClone({ parts: s.parts, globals: s.globals, hair: s.hair, clothing: s.clothing });
}

/** 状態を変更するすべての操作で呼び出し、履歴に現在状態を積む */
function withHistory(s: EditorState, next: Partial<EditorState>): Partial<EditorState> {
  const past = [...s.past, takeSnapshot(s)];
  if (past.length > HISTORY_LIMIT) past.shift();
  return { ...next, past, future: [] };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  mode: 'general',
  uiLevel: 'beginner',
  parts: createDefaultParts(),
  globals: structuredClone(DEFAULT_GLOBALS),
  hair: structuredClone(DEFAULT_HAIR),
  clothing: structuredClone(DEFAULT_CLOTHING),
  annotations: [],
  measurements: [],
  hairRemoval: [],
  scenarios: [],
  selectedPart: null,
  compareScenarioId: null,
  cameraSync: true,
  cameraPresetRequest: null,
  focusPartRequest: null,
  quality: 'high',
  webglFailed: false,
  past: [],
  future: [],

  setMode: (m) =>
    set((s) => ({
      mode: m,
      // 医療モード（裸体可）から一般モードへ戻った際に着衣を保証
      clothing: m === 'general' ? ensureClothed(s.clothing) : s.clothing,
    })),
  setUiLevel: (l) => set({ uiLevel: l }),
  selectPart: (id) => set({ selectedPart: id }),

  setMorph: (partId, key, value, provenance) =>
    set((s) => {
      const part = s.parts[partId];
      if (!part || part.locked) return {};
      return withHistory(s, {
        parts: {
          ...s.parts,
          [partId]: {
            ...part,
            morph: { ...part.morph, [key]: value },
            provenance: { ...part.provenance, [key]: provenance ?? part.provenance[key] ?? 'manual' },
          },
        },
      });
    }),

  setPartField: (partId, field, axis, value) =>
    set((s) => {
      const part = s.parts[partId];
      if (!part || part.locked) return {};
      return withHistory(s, {
        parts: { ...s.parts, [partId]: { ...part, [field]: { ...part[field], [axis]: value } } },
      });
    }),

  setPartColor: (partId, color, sub) =>
    set((s) => {
      const part = s.parts[partId];
      if (!part || part.locked) return {};
      return withHistory(s, {
        parts: { ...s.parts, [partId]: { ...part, ...(sub ? { color2: color } : { color }) } },
      });
    }),

  setPartRoughness: (partId, v) =>
    set((s) => {
      const part = s.parts[partId];
      if (!part || part.locked) return {};
      return withHistory(s, { parts: { ...s.parts, [partId]: { ...part, roughness: v } } });
    }),

  togglePartVisible: (partId) =>
    set((s) => {
      const part = s.parts[partId];
      if (!part) return {};
      return { parts: { ...s.parts, [partId]: { ...part, visible: !part.visible } } };
    }),

  togglePartLocked: (partId) =>
    set((s) => {
      const part = s.parts[partId];
      if (!part) return {};
      return { parts: { ...s.parts, [partId]: { ...part, locked: !part.locked } } };
    }),

  setGlobals: (g) => set((s) => withHistory(s, { globals: { ...s.globals, ...g } })),
  setHair: (h) => set((s) => withHistory(s, { hair: { ...s.hair, ...h } })),
  setClothing: (c) =>
    set((s) => {
      const merged = { ...s.clothing, ...c };
      return withHistory(s, { clothing: s.mode === 'general' ? ensureClothed(merged) : merged });
    }),

  addAnnotation: (a) => set((s) => ({ annotations: [...s.annotations, a] })),
  removeAnnotation: (id) => set((s) => ({ annotations: s.annotations.filter((x) => x.id !== id) })),
  addMeasurement: (m) => set((s) => ({ measurements: [...s.measurements, m] })),
  removeMeasurement: (id) => set((s) => ({ measurements: s.measurements.filter((x) => x.id !== id) })),
  setHairRemoval: (list) => set({ hairRemoval: list }),

  undo: () =>
    set((s) => {
      if (s.past.length === 0) return {};
      const prev = s.past[s.past.length - 1];
      return {
        past: s.past.slice(0, -1),
        future: [...s.future, takeSnapshot(s)],
        parts: prev.parts,
        globals: prev.globals,
        hair: prev.hair,
        clothing: s.mode === 'general' ? ensureClothed(prev.clothing) : prev.clothing,
      };
    }),

  redo: () =>
    set((s) => {
      if (s.future.length === 0) return {};
      const next = s.future[s.future.length - 1];
      return {
        future: s.future.slice(0, -1),
        past: [...s.past, takeSnapshot(s)],
        parts: next.parts,
        globals: next.globals,
        hair: next.hair,
        clothing: s.mode === 'general' ? ensureClothed(next.clothing) : next.clothing,
      };
    }),

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  saveScenario: (name) =>
    set((s) => {
      const snap = takeSnapshot(s);
      const sc: Scenario = {
        id: `sc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        createdAt: Date.now(),
        parts: snap.parts,
        globals: snap.globals,
        hair: snap.hair,
        clothing: snap.clothing,
        annotations: structuredClone(s.annotations),
      };
      return { scenarios: [...s.scenarios, sc] };
    }),

  applyScenario: (id) =>
    set((s) => {
      const sc = s.scenarios.find((x) => x.id === id);
      if (!sc) return {};
      return withHistory(s, {
        parts: structuredClone(sc.parts),
        globals: structuredClone(sc.globals),
        hair: structuredClone(sc.hair),
        clothing: s.mode === 'general' ? ensureClothed(structuredClone(sc.clothing)) : structuredClone(sc.clothing),
      });
    }),

  deleteScenario: (id) =>
    set((s) => ({
      scenarios: s.scenarios.filter((x) => x.id !== id),
      compareScenarioId: s.compareScenarioId === id ? null : s.compareScenarioId,
    })),

  duplicateScenario: (id) =>
    set((s) => {
      const sc = s.scenarios.find((x) => x.id === id);
      if (!sc) return {};
      const copy: Scenario = {
        ...structuredClone(sc),
        id: `sc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: `${sc.name}（複製）`,
        createdAt: Date.now(),
      };
      return { scenarios: [...s.scenarios, copy] };
    }),

  setCompareScenario: (id) => set({ compareScenarioId: id }),
  setCameraSync: (v) => set({ cameraSync: v }),
  requestCameraPreset: (preset) => set({ cameraPresetRequest: preset }),
  clearCameraPresetRequest: () => set({ cameraPresetRequest: null }),
  requestFocusPart: (partId) => set({ focusPartRequest: partId }),
  clearFocusPartRequest: () => set({ focusPartRequest: null }),
  setQuality: (q) => set({ quality: q }),
  setWebglFailed: (v) => set({ webglFailed: v }),

  loadSnapshot: (snap) =>
    set((s) =>
      withHistory(s, {
        parts: structuredClone(snap.parts),
        globals: structuredClone(snap.globals),
        hair: structuredClone(snap.hair),
        clothing: s.mode === 'general' ? ensureClothed(structuredClone(snap.clothing)) : structuredClone(snap.clothing),
      }),
    ),

  copyPartParams: (fromId, toId) =>
    set((s) => {
      const from = s.parts[fromId];
      const to = s.parts[toId];
      if (!from || !to) return {};
      const morph = { ...to.morph };
      for (const k of Object.keys(morph)) if (from.morph[k] !== undefined) morph[k] = from.morph[k];
      return withHistory(s, { parts: { ...s.parts, [toId]: { ...to, morph } } });
    }),

  resetAll: () =>
    set((s) =>
      withHistory(s, {
        parts: createDefaultParts(),
        globals: structuredClone(DEFAULT_GLOBALS),
        hair: structuredClone(DEFAULT_HAIR),
        clothing: structuredClone(DEFAULT_CLOTHING),
      }),
    ),
}));

export const DEFAULTS = { globals: DEFAULT_GLOBALS, hair: DEFAULT_HAIR, clothing: DEFAULT_CLOTHING };
