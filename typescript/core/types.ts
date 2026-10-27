// 基本型定義：3D人物モデルのパラメータ構造

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** 情報の由来区分（プライバシー・医療情報管理要件） */
export type Provenance =
  | 'photo' // 写真から確認
  | 'measured' // 実測・計測
  | 'manual' // 利用者が手動設定
  | 'estimated'; // システム推定

export const PROVENANCE_LABELS: Record<Provenance, string> = {
  photo: '写真から確認',
  measured: '実測・計測',
  manual: '手動設定',
  estimated: 'システム推定',
};

/** 部位固有パラメータ定義 */
export interface ParamDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  /** beginner=初心者モードでも表示, advanced=専門家モードのみ */
  level: 'basic' | 'advanced';
  unit?: string;
}

/** 部位定義（階層ツリー構造） */
export interface PartDef {
  id: string;
  label: string;
  parent?: string;
  /** 医療モードでのみ表示 */
  medicalOnly?: boolean;
  params: ParamDef[];
}

/** 部位の編集状態 */
export interface PartState {
  visible: boolean;
  locked: boolean;
  /** 位置オフセット (m) */
  offset: Vec3;
  /** 回転 (度) */
  rotation: Vec3;
  /** スケール倍率 */
  scale: Vec3;
  /** 部位固有パラメータ値 */
  morph: Record<string, number>;
  /** 基調色 (皮膚・衣服など) */
  color: string;
  /** サブカラー（髪のグラデーション等） */
  color2: string;
  roughness: number;
  /** パラメータ別の情報由来 */
  provenance: Record<string, Provenance>;
}

export type PartStateMap = Record<string, PartState>;

/** 体型グローバルパラメータ */
export interface BodyGlobals {
  height: number; // m
  sex: 'female' | 'male' | 'custom';
  bodyFat: number; // 0..1 皮下脂肪の外形への影響
  muscle: number; // 0..1 筋肉の輪郭
  posture: number; // -1..1 姿勢（前傾/後傾）
}

/** 比較案（シナリオ） */
export interface Scenario {
  id: string;
  name: string;
  createdAt: number;
  parts: PartStateMap;
  globals: BodyGlobals;
  hair: HairConfig;
  clothing: ClothingState;
  annotations: Annotation[];
}

/** 髪型設定 */
export interface HairConfig {
  style: 'none' | 'short' | 'bob' | 'medium' | 'long' | 'ponytail' | 'bun';
  length: number; // 0..1
  volume: number; // 0..1
  curl: number; // 0..1
  bangs: number; // 0..1 前髪
  parting: number; // -1..1 分け目（左..右）
  color: string;
  color2: string; // グラデーション先
  gradient: number; // 0..1
}

/** 衣服1枚分 */
export interface Garment {
  id: string;
  kind: 'tops' | 'outer' | 'pants' | 'skirt' | 'dress' | 'shoes' | 'hat';
  visible: boolean;
  color: string;
  pattern: 'solid' | 'stripe' | 'dot' | 'check';
  /** 着用位置の微調整 */
  offsetY: number;
  /** 2D商品写真をテクスチャ参照として読み込んだ場合の画像データURL */
  referenceImage?: string;
  useReferenceTexture: boolean;
}

export interface ClothingState {
  garments: Garment[];
  glasses: { visible: boolean; color: string; shape: 'round' | 'square' | 'wellington' };
  accessories: { id: string; kind: 'earring' | 'necklace'; visible: boolean; color: string }[];
}

/** 注釈 */
export interface Annotation {
  id: string;
  text: string;
  position: Vec3;
  createdAt: number;
}

/** 計測結果 */
export interface Measurement {
  id: string;
  kind: 'distance' | 'angle';
  points: Vec3[];
  /** 画面上の参考値。校正済み実測値ではない */
  referenceValue: number;
  unit: 'm' | 'deg';
  note: string;
}

/** 体毛・脱毛デザイン */
export interface HairRemovalDesign {
  region: string;
  density: number; // 0..1
  length: number; // 0..1
  color: string;
  /** 脱毛マスク（残す範囲の反転）簡易パラメータ */
  keepTop: number; // 0..1
  keepBottom: number;
  keepLeft: number;
  keepRight: number;
  scenarioNote: string;
}

/** プロジェクトファイル (.pvsproj) */
export interface ProjectFile {
  format: 'pvsproj';
  version: number;
  savedAt: number;
  globals: BodyGlobals;
  parts: PartStateMap;
  hair: HairConfig;
  clothing: ClothingState;
  scenarios: { id: string; name: string; createdAt: number }[];
  scenarioData: Record<string, { parts: PartStateMap; globals: BodyGlobals; hair: HairConfig; clothing: ClothingState }>;
  annotations: Annotation[];
  measurements: Measurement[];
  hairRemoval: HairRemovalDesign[];
  camera: { position: Vec3; target: Vec3 };
  /** 元画像（任意、dataURL） */
  sourcePhoto?: string;
  photoLandmarks?: { x: number; y: number; label: string }[];
  checkpoints: { label: string; parts: PartStateMap; globals: BodyGlobals }[];
}

export const PROJECT_VERSION = 1;
