// 基本型定義：2Dモンタージュ写真生成のパラメータ構造

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** 2D平面上の点 */
export interface Vec2 {
  x: number;
  y: number;
}

/** 関節の定義 */
export interface Joint {
  id: string;
  label: string;
  parent?: string;
  /** 基準位置（直立時、正規化座標 0..1） */
  basePos: Vec2;
  /** 現在の位置（正規化座標 0..1） */
  pos: Vec2;
  /** 親からの相対回転角度（度） */
  angle: number;
  /** 基準の角度（直立時） */
  baseAngle: number;
  /** 長さ（親からの距離、正規化） */
  length: number;
}

/** ポーズ定義 */
export interface Pose {
  id: string;
  label: string;
  category: PoseCategory;
  /** 医療モードでのみ表示 */
  medicalOnly?: boolean;
  /** 性的な内容を含む */
  adultOnly?: boolean;
  /** 関節角度の上書き（関節ID→角度） */
  jointAngles: Record<string, number>;
  /** カメラ視点 */
  camera: CameraView;
}

export type PoseCategory =
  | 'standing'      // 立ち
  | 'sitting'       // 座り
  | 'walking'       // 歩き
  | 'running'       // 走り
  | 'lying'         // 横になる
  | 'gesture'       // 手のジェスチャー
  | 'sports'        // スポーツ
  | 'dance'         // ダンス
  | 'yoga'          // ヨガ・柔軟
  | 'medical'       // 医療体位
  | 'sexual'        // 性的体位
  | 'custom';       // カスタム

/** カメラ視点 */
export interface CameraView {
  /** 正面からの回転角度（度）0=正面, 90=右側面, 180=背面, 270=左側面 */
  azimuth: number;
  /** 仰角（度）0=水平, 正=上から, 負=下から */
  elevation: number;
  /** 距離（倍率）1=標準 */
  distance: number;
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

/** 現在のポーズ状態 */
export interface PoseState {
  /** 選択中のポーズID */
  poseId: string;
  /** カスタム関節角度（プリセットからの変更分） */
  customJointAngles: Record<string, number>;
  /** カメラ視点 */
  camera: CameraView;
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
  pose: PoseState;
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
  pose: PoseState;
  scenarios: { id: string; name: string; createdAt: number }[];
  scenarioData: Record<string, { parts: PartStateMap; globals: BodyGlobals; hair: HairConfig; clothing: ClothingState; pose: PoseState }>;
  annotations: Annotation[];
  measurements: Measurement[];
  hairRemoval: HairRemovalDesign[];
  camera: { position: Vec3; target: Vec3 };
  /** 元画像（任意、dataURL） */
  sourcePhoto?: string;
  photoLandmarks?: { x: number; y: number; label: string }[];
  checkpoints: { label: string; parts: PartStateMap; globals: BodyGlobals }[];
}

export const PROJECT_VERSION = 2;
