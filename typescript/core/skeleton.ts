// 2D関節骨格システム
// 全身の関節をツリー構造で管理し、角度から各関節の2D位置を計算する。
//
// 角度の規約（絶対角度・度）:
//   画面座標（y下向き正）で 0=右, 90=下, ±180=左, -90=上。
//   関節Jの角度は「親関節 → J への骨の向き」を表す絶対角度。
//   したがって joint.pos = parent.pos + (cos(angle), sin(angle)) * length。
//   ポーズプリセットやカスタム角度はこの絶対角度で指定する。

import type { Joint, Vec2, Pose, CameraView } from './types';

/** 関節ID定義 */
export const JOINT_IDS = {
  // 体幹
  PELVIS: 'pelvis',
  SPINE: 'spine',
  CHEST: 'chest',
  NECK: 'neck',
  HEAD: 'head',
  // 左腕
  SHOULDER_L: 'shoulderL',
  ELBOW_L: 'elbowL',
  WRIST_L: 'wristL',
  HAND_L: 'handL',
  // 右腕
  SHOULDER_R: 'shoulderR',
  ELBOW_R: 'elbowR',
  WRIST_R: 'wristR',
  HAND_R: 'handR',
  // 左脚
  HIP_L: 'hipL',
  KNEE_L: 'kneeL',
  ANKLE_L: 'ankleL',
  FOOT_L: 'footL',
  // 右脚
  HIP_R: 'hipR',
  KNEE_R: 'kneeR',
  ANKLE_R: 'ankleR',
  FOOT_R: 'footR',
} as const;

export type JointId = typeof JOINT_IDS[keyof typeof JOINT_IDS];

/** 関節ツリーの構築（直立時の基準） */
export function buildSkeleton(): Map<string, Joint> {
  const joints = new Map<string, Joint>();
  const add = (j: Joint) => joints.set(j.id, j);

  // 体幹（直立時、正規化座標：x=0.5が中心、y=0が頭頂、y=1が足裏）
  add({ id: JOINT_IDS.PELVIS, label: '骨盤', basePos: { x: 0.5, y: 0.55 }, pos: { x: 0.5, y: 0.55 }, angle: 0, baseAngle: 0, length: 0 });
  add({ id: JOINT_IDS.SPINE, label: '脊椎', parent: JOINT_IDS.PELVIS, basePos: { x: 0.5, y: 0.45 }, pos: { x: 0.5, y: 0.45 }, angle: -90, baseAngle: -90, length: 0.10 });
  add({ id: JOINT_IDS.CHEST, label: '胸部', parent: JOINT_IDS.SPINE, basePos: { x: 0.5, y: 0.35 }, pos: { x: 0.5, y: 0.35 }, angle: -90, baseAngle: -90, length: 0.10 });
  add({ id: JOINT_IDS.NECK, label: '首', parent: JOINT_IDS.CHEST, basePos: { x: 0.5, y: 0.28 }, pos: { x: 0.5, y: 0.28 }, angle: -90, baseAngle: -90, length: 0.07 });
  add({ id: JOINT_IDS.HEAD, label: '頭', parent: JOINT_IDS.NECK, basePos: { x: 0.5, y: 0.15 }, pos: { x: 0.5, y: 0.15 }, angle: -90, baseAngle: -90, length: 0.13 });

  // 左腕（胸→肩はほぼ真横、そこから腕は真下）
  add({ id: JOINT_IDS.SHOULDER_L, label: '左肩', parent: JOINT_IDS.CHEST, basePos: { x: 0.345, y: 0.36 }, pos: { x: 0.345, y: 0.36 }, angle: 175, baseAngle: 175, length: 0.155 });
  add({ id: JOINT_IDS.ELBOW_L, label: '左肘', parent: JOINT_IDS.SHOULDER_L, basePos: { x: 0.37, y: 0.50 }, pos: { x: 0.37, y: 0.50 }, angle: 95, baseAngle: 95, length: 0.14 });
  add({ id: JOINT_IDS.WRIST_L, label: '左手首', parent: JOINT_IDS.ELBOW_L, basePos: { x: 0.36, y: 0.63 }, pos: { x: 0.36, y: 0.63 }, angle: 92, baseAngle: 92, length: 0.13 });
  add({ id: JOINT_IDS.HAND_L, label: '左手', parent: JOINT_IDS.WRIST_L, basePos: { x: 0.36, y: 0.68 }, pos: { x: 0.36, y: 0.68 }, angle: 90, baseAngle: 90, length: 0.05 });

  // 右腕
  add({ id: JOINT_IDS.SHOULDER_R, label: '右肩', parent: JOINT_IDS.CHEST, basePos: { x: 0.655, y: 0.36 }, pos: { x: 0.655, y: 0.36 }, angle: 5, baseAngle: 5, length: 0.155 });
  add({ id: JOINT_IDS.ELBOW_R, label: '右肘', parent: JOINT_IDS.SHOULDER_R, basePos: { x: 0.63, y: 0.50 }, pos: { x: 0.63, y: 0.50 }, angle: 85, baseAngle: 85, length: 0.14 });
  add({ id: JOINT_IDS.WRIST_R, label: '右手首', parent: JOINT_IDS.ELBOW_R, basePos: { x: 0.64, y: 0.63 }, pos: { x: 0.64, y: 0.63 }, angle: 88, baseAngle: 88, length: 0.13 });
  add({ id: JOINT_IDS.HAND_R, label: '右手', parent: JOINT_IDS.WRIST_R, basePos: { x: 0.64, y: 0.68 }, pos: { x: 0.64, y: 0.68 }, angle: 90, baseAngle: 90, length: 0.05 });

  // 左脚（骨盤→股関節はほぼ真横、そこから脚は真下）
  add({ id: JOINT_IDS.HIP_L, label: '左股関節', parent: JOINT_IDS.PELVIS, basePos: { x: 0.44, y: 0.56 }, pos: { x: 0.44, y: 0.56 }, angle: 175, baseAngle: 175, length: 0.06 });
  add({ id: JOINT_IDS.KNEE_L, label: '左膝', parent: JOINT_IDS.HIP_L, basePos: { x: 0.43, y: 0.78 }, pos: { x: 0.43, y: 0.78 }, angle: 92, baseAngle: 92, length: 0.22 });
  add({ id: JOINT_IDS.ANKLE_L, label: '左足首', parent: JOINT_IDS.KNEE_L, basePos: { x: 0.43, y: 0.95 }, pos: { x: 0.43, y: 0.95 }, angle: 90, baseAngle: 90, length: 0.17 });
  add({ id: JOINT_IDS.FOOT_L, label: '左足', parent: JOINT_IDS.ANKLE_L, basePos: { x: 0.45, y: 1.0 }, pos: { x: 0.45, y: 1.0 }, angle: 70, baseAngle: 70, length: 0.06 });

  // 右脚
  add({ id: JOINT_IDS.HIP_R, label: '右股関節', parent: JOINT_IDS.PELVIS, basePos: { x: 0.56, y: 0.56 }, pos: { x: 0.56, y: 0.56 }, angle: 5, baseAngle: 5, length: 0.06 });
  add({ id: JOINT_IDS.KNEE_R, label: '右膝', parent: JOINT_IDS.HIP_R, basePos: { x: 0.57, y: 0.78 }, pos: { x: 0.57, y: 0.78 }, angle: 88, baseAngle: 88, length: 0.22 });
  add({ id: JOINT_IDS.ANKLE_R, label: '右足首', parent: JOINT_IDS.KNEE_R, basePos: { x: 0.57, y: 0.95 }, pos: { x: 0.57, y: 0.95 }, angle: 90, baseAngle: 90, length: 0.17 });
  add({ id: JOINT_IDS.FOOT_R, label: '右足', parent: JOINT_IDS.ANKLE_R, basePos: { x: 0.55, y: 1.0 }, pos: { x: 0.55, y: 1.0 }, angle: 110, baseAngle: 110, length: 0.06 });

  return joints;
}

/** 角度（度）をラジアンに変換 */
function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** 関節の絶対角度から位置を計算 */
function computePos(parent: Joint, length: number, angle: number): Vec2 {
  const rad = toRad(angle);
  return {
    x: parent.pos.x + Math.cos(rad) * length,
    y: parent.pos.y + Math.sin(rad) * length,
  };
}

/** 骨格の計算順（親が必ず先） */
const COMPUTE_ORDER: string[] = [
  JOINT_IDS.PELVIS,
  JOINT_IDS.SPINE, JOINT_IDS.CHEST, JOINT_IDS.NECK, JOINT_IDS.HEAD,
  JOINT_IDS.SHOULDER_L, JOINT_IDS.ELBOW_L, JOINT_IDS.WRIST_L, JOINT_IDS.HAND_L,
  JOINT_IDS.SHOULDER_R, JOINT_IDS.ELBOW_R, JOINT_IDS.WRIST_R, JOINT_IDS.HAND_R,
  JOINT_IDS.HIP_L, JOINT_IDS.KNEE_L, JOINT_IDS.ANKLE_L, JOINT_IDS.FOOT_L,
  JOINT_IDS.HIP_R, JOINT_IDS.KNEE_R, JOINT_IDS.ANKLE_R, JOINT_IDS.FOOT_R,
];

/** 骨格全体の位置を再計算（絶対角度方式） */
export function updateSkeleton(joints: Map<string, Joint>, angles: Record<string, number>): void {
  for (const id of COMPUTE_ORDER) {
    const joint = joints.get(id);
    if (!joint) continue;

    const angle = angles[id] ?? joint.baseAngle;
    joint.angle = angle;

    if (!joint.parent) {
      joint.pos = { ...joint.basePos };
      continue;
    }
    const parent = joints.get(joint.parent);
    if (!parent) continue;
    joint.pos = computePos(parent, joint.length, angle);
  }
}

/** ポーズを骨格に適用（プリセット角度＋カスタム角度をマージ） */
export function applyPose(joints: Map<string, Joint>, pose: Pose, customAngles: Record<string, number> = {}): void {
  updateSkeleton(joints, { ...pose.jointAngles, ...customAngles });
}

/** カメラ視点による2D投影変換（正規化座標→ピクセル） */
export function projectToCamera(pos: Vec2, camera: CameraView, canvasW: number, canvasH: number): Vec2 {
  const azimuthRad = toRad(camera.azimuth);
  const elevationRad = toRad(camera.elevation);

  let x = pos.x * canvasW;
  let y = pos.y * canvasH;

  // 方位角による水平方向の圧縮（側面視で幅が狭くなる）
  const cosAz = Math.cos(azimuthRad);
  const centerX = canvasW / 2;
  x = centerX + (x - centerX) * cosAz;

  // 仰角による垂直方向の圧縮（上から見ると縦が縮む）
  const cosEl = Math.cos(elevationRad);
  const centerY = canvasH / 2;
  y = centerY + (y - centerY) * cosEl;

  // 距離によるスケーリング
  const scale = 1 / camera.distance;
  x = centerX + (x - centerX) * scale;
  y = centerY + (y - centerY) * scale;

  return { x, y };
}

/** 骨格の可視化（デバッグ用） */
export function drawSkeleton(ctx: CanvasRenderingContext2D, joints: Map<string, Joint>, project: (p: Vec2) => Vec2): void {
  ctx.strokeStyle = 'rgba(255,0,0,0.6)';
  ctx.lineWidth = 2;
  for (const id of COMPUTE_ORDER) {
    const joint = joints.get(id);
    if (!joint || !joint.parent) continue;
    const parent = joints.get(joint.parent);
    if (!parent) continue;
    const p1 = project(parent.pos);
    const p2 = project(joint.pos);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0,255,0,0.8)';
  for (const id of COMPUTE_ORDER) {
    const joint = joints.get(id);
    if (!joint) continue;
    const p = project(joint.pos);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}
