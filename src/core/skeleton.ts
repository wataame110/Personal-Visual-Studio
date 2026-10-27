// 2D関節骨格システム
// 全身の関節をツリー構造で管理し、角度から各関節の2D位置を計算する。

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

  // 体幹（直立時、正規化座標：x=0.5が中心、y=0が頭頂、y=1が足裏）
  const pelvis: Joint = {
    id: JOINT_IDS.PELVIS, label: '骨盤', basePos: { x: 0.5, y: 0.55 }, pos: { x: 0.5, y: 0.55 },
    angle: 0, baseAngle: 0, length: 0,
  };
  joints.set(pelvis.id, pelvis);

  const spine: Joint = {
    id: JOINT_IDS.SPINE, label: '脊椎', parent: JOINT_IDS.PELVIS,
    basePos: { x: 0.5, y: 0.45 }, pos: { x: 0.5, y: 0.45 },
    angle: 0, baseAngle: -90, length: 0.10, // 骨盤から上へ
  };
  joints.set(spine.id, spine);

  const chest: Joint = {
    id: JOINT_IDS.CHEST, label: '胸部', parent: JOINT_IDS.SPINE,
    basePos: { x: 0.5, y: 0.35 }, pos: { x: 0.5, y: 0.35 },
    angle: 0, baseAngle: -90, length: 0.10,
  };
  joints.set(chest.id, chest);

  const neck: Joint = {
    id: JOINT_IDS.NECK, label: '首', parent: JOINT_IDS.CHEST,
    basePos: { x: 0.5, y: 0.28 }, pos: { x: 0.5, y: 0.28 },
    angle: 0, baseAngle: -90, length: 0.07,
  };
  joints.set(neck.id, neck);

  const head: Joint = {
    id: JOINT_IDS.HEAD, label: '頭', parent: JOINT_IDS.NECK,
    basePos: { x: 0.5, y: 0.15 }, pos: { x: 0.5, y: 0.15 },
    angle: 0, baseAngle: -90, length: 0.13,
  };
  joints.set(head.id, head);

  // 左腕
  const shoulderL: Joint = {
    id: JOINT_IDS.SHOULDER_L, label: '左肩', parent: JOINT_IDS.CHEST,
    basePos: { x: 0.38, y: 0.32 }, pos: { x: 0.38, y: 0.32 },
    angle: 0, baseAngle: 160, length: 0.12, // 胸から左下へ
  };
  joints.set(shoulderL.id, shoulderL);

  const elbowL: Joint = {
    id: JOINT_IDS.ELBOW_L, label: '左肘', parent: JOINT_IDS.SHOULDER_L,
    basePos: { x: 0.30, y: 0.45 }, pos: { x: 0.30, y: 0.45 },
    angle: 0, baseAngle: 100, length: 0.14, // 肩から下へ
  };
  joints.set(elbowL.id, elbowL);

  const wristL: Joint = {
    id: JOINT_IDS.WRIST_L, label: '左手首', parent: JOINT_IDS.ELBOW_L,
    basePos: { x: 0.28, y: 0.58 }, pos: { x: 0.28, y: 0.58 },
    angle: 0, baseAngle: 90, length: 0.13,
  };
  joints.set(wristL.id, wristL);

  const handL: Joint = {
    id: JOINT_IDS.HAND_L, label: '左手', parent: JOINT_IDS.WRIST_L,
    basePos: { x: 0.27, y: 0.63 }, pos: { x: 0.27, y: 0.63 },
    angle: 0, baseAngle: 90, length: 0.05,
  };
  joints.set(handL.id, handL);

  // 右腕
  const shoulderR: Joint = {
    id: JOINT_IDS.SHOULDER_R, label: '右肩', parent: JOINT_IDS.CHEST,
    basePos: { x: 0.62, y: 0.32 }, pos: { x: 0.62, y: 0.32 },
    angle: 0, baseAngle: 20, length: 0.12,
  };
  joints.set(shoulderR.id, shoulderR);

  const elbowR: Joint = {
    id: JOINT_IDS.ELBOW_R, label: '右肘', parent: JOINT_IDS.SHOULDER_R,
    basePos: { x: 0.70, y: 0.45 }, pos: { x: 0.70, y: 0.45 },
    angle: 0, baseAngle: 80, length: 0.14,
  };
  joints.set(elbowR.id, elbowR);

  const wristR: Joint = {
    id: JOINT_IDS.WRIST_R, label: '右手首', parent: JOINT_IDS.ELBOW_R,
    basePos: { x: 0.72, y: 0.58 }, pos: { x: 0.72, y: 0.58 },
    angle: 0, baseAngle: 90, length: 0.13,
  };
  joints.set(wristR.id, wristR);

  const handR: Joint = {
    id: JOINT_IDS.HAND_R, label: '右手', parent: JOINT_IDS.WRIST_R,
    basePos: { x: 0.73, y: 0.63 }, pos: { x: 0.73, y: 0.63 },
    angle: 0, baseAngle: 90, length: 0.05,
  };
  joints.set(handR.id, handR);

  // 左脚
  const hipL: Joint = {
    id: JOINT_IDS.HIP_L, label: '左股関節', parent: JOINT_IDS.PELVIS,
    basePos: { x: 0.44, y: 0.56 }, pos: { x: 0.44, y: 0.56 },
    angle: 0, baseAngle: 100, length: 0.06,
  };
  joints.set(hipL.id, hipL);

  const kneeL: Joint = {
    id: JOINT_IDS.KNEE_L, label: '左膝', parent: JOINT_IDS.HIP_L,
    basePos: { x: 0.42, y: 0.78 }, pos: { x: 0.42, y: 0.78 },
    angle: 0, baseAngle: 90, length: 0.22,
  };
  joints.set(kneeL.id, kneeL);

  const ankleL: Joint = {
    id: JOINT_IDS.ANKLE_L, label: '左足首', parent: JOINT_IDS.KNEE_L,
    basePos: { x: 0.41, y: 0.95 }, pos: { x: 0.41, y: 0.95 },
    angle: 0, baseAngle: 90, length: 0.17,
  };
  joints.set(ankleL.id, ankleL);

  const footL: Joint = {
    id: JOINT_IDS.FOOT_L, label: '左足', parent: JOINT_IDS.ANKLE_L,
    basePos: { x: 0.38, y: 0.98 }, pos: { x: 0.38, y: 0.98 },
    angle: 0, baseAngle: 75, length: 0.06,
  };
  joints.set(footL.id, footL);

  // 右脚
  const hipR: Joint = {
    id: JOINT_IDS.HIP_R, label: '右股関節', parent: JOINT_IDS.PELVIS,
    basePos: { x: 0.56, y: 0.56 }, pos: { x: 0.56, y: 0.56 },
    angle: 0, baseAngle: 80, length: 0.06,
  };
  joints.set(hipR.id, hipR);

  const kneeR: Joint = {
    id: JOINT_IDS.KNEE_R, label: '右膝', parent: JOINT_IDS.HIP_R,
    basePos: { x: 0.58, y: 0.78 }, pos: { x: 0.58, y: 0.78 },
    angle: 0, baseAngle: 90, length: 0.22,
  };
  joints.set(kneeR.id, kneeR);

  const ankleR: Joint = {
    id: JOINT_IDS.ANKLE_R, label: '右足首', parent: JOINT_IDS.KNEE_R,
    basePos: { x: 0.59, y: 0.95 }, pos: { x: 0.59, y: 0.95 },
    angle: 0, baseAngle: 90, length: 0.17,
  };
  joints.set(ankleR.id, ankleR);

  const footR: Joint = {
    id: JOINT_IDS.FOOT_R, label: '右足', parent: JOINT_IDS.ANKLE_R,
    basePos: { x: 0.62, y: 0.98 }, pos: { x: 0.62, y: 0.98 },
    angle: 0, baseAngle: 105, length: 0.06,
  };
  joints.set(footR.id, footR);

  return joints;
}

/** 角度（度）をラジアンに変換 */
function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** 親の位置と角度から子の位置を計算 */
function computeChildPos(parent: Joint, childLength: number, childAngle: number): Vec2 {
  const rad = toRad(childAngle);
  return {
    x: parent.pos.x + Math.cos(rad) * childLength,
    y: parent.pos.y + Math.sin(rad) * childLength,
  };
}

/** 骨格全体の位置を再計算（角度変更後） */
export function updateSkeleton(joints: Map<string, Joint>, customAngles: Record<string, number>): void {
  // 深さ優先で親から順に計算
  const order: string[] = [
    JOINT_IDS.PELVIS,
    JOINT_IDS.SPINE, JOINT_IDS.CHEST, JOINT_IDS.NECK, JOINT_IDS.HEAD,
    JOINT_IDS.SHOULDER_L, JOINT_IDS.ELBOW_L, JOINT_IDS.WRIST_L, JOINT_IDS.HAND_L,
    JOINT_IDS.SHOULDER_R, JOINT_IDS.ELBOW_R, JOINT_IDS.WRIST_R, JOINT_IDS.HAND_R,
    JOINT_IDS.HIP_L, JOINT_IDS.KNEE_L, JOINT_IDS.ANKLE_L, JOINT_IDS.FOOT_L,
    JOINT_IDS.HIP_R, JOINT_IDS.KNEE_R, JOINT_IDS.ANKLE_R, JOINT_IDS.FOOT_R,
  ];

  for (const id of order) {
    const joint = joints.get(id);
    if (!joint) continue;

    // カスタム角度があれば適用
    const angle = customAngles[id] ?? joint.baseAngle;
    joint.angle = angle;

    if (!joint.parent) {
      // ルート（骨盤）は基準位置のまま
      joint.pos = { ...joint.basePos };
      continue;
    }

    const parent = joints.get(joint.parent);
    if (!parent) continue;

    // 親の角度に子の角度を加算（相対角度）
    const absoluteAngle = parent.angle + (angle - joint.baseAngle);
    joint.pos = computeChildPos(parent, joint.length, absoluteAngle);
  }
}

/** ポーズを骨格に適用 */
export function applyPose(joints: Map<string, Joint>, pose: Pose): void {
  const angles: Record<string, number> = {};
  for (const [jointId, angle] of Object.entries(pose.jointAngles)) {
    angles[jointId] = angle;
  }
  updateSkeleton(joints, angles);
}

/** カメラ視点による2D投影変換 */
export function projectToCamera(pos: Vec2, camera: CameraView, canvasW: number, canvasH: number): Vec2 {
  // 簡易的な斜投影（正面からの回転を模倣）
  const azimuthRad = toRad(camera.azimuth);
  const elevationRad = toRad(camera.elevation);

  // 正規化座標をピクセル座標に変換
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
export function drawSkeleton(ctx: CanvasRenderingContext2D, joints: Map<string, Joint>, camera: CameraView, w: number, h: number): void {
  const order: string[] = [
    JOINT_IDS.PELVIS,
    JOINT_IDS.SPINE, JOINT_IDS.CHEST, JOINT_IDS.NECK, JOINT_IDS.HEAD,
    JOINT_IDS.SHOULDER_L, JOINT_IDS.ELBOW_L, JOINT_IDS.WRIST_L, JOINT_IDS.HAND_L,
    JOINT_IDS.SHOULDER_R, JOINT_IDS.ELBOW_R, JOINT_IDS.WRIST_R, JOINT_IDS.HAND_R,
    JOINT_IDS.HIP_L, JOINT_IDS.KNEE_L, JOINT_IDS.ANKLE_L, JOINT_IDS.FOOT_L,
    JOINT_IDS.HIP_R, JOINT_IDS.KNEE_R, JOINT_IDS.ANKLE_R, JOINT_IDS.FOOT_R,
  ];

  // 線を描画
  ctx.strokeStyle = 'rgba(255,0,0,0.6)';
  ctx.lineWidth = 2;
  for (const id of order) {
    const joint = joints.get(id);
    if (!joint || !joint.parent) continue;
    const parent = joints.get(joint.parent);
    if (!parent) continue;
    const p1 = projectToCamera(parent.pos, camera, w, h);
    const p2 = projectToCamera(joint.pos, camera, w, h);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  // 関節点を描画
  ctx.fillStyle = 'rgba(0,255,0,0.8)';
  for (const id of order) {
    const joint = joints.get(id);
    if (!joint) continue;
    const p = projectToCamera(joint.pos, camera, w, h);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}
