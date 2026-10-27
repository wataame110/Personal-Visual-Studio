// 頭部・顔のパラメトリックメッシュ（輪郭・目・眉・鼻・口・耳）
import * as THREE from 'three';
import { loftSections, ellipsoid, tubeAlongPath, type Section } from '../geometry';
import type { BodyRig } from '../rig';
import type { PartState } from '../../core/types';
import { skinMaterial } from '../materials';

/** 頭蓋・顔の輪郭：顎→頭頂の連続ロフト */
export function buildHead(rig: BodyRig, part: PartState, quality: 'high' | 'low'): THREE.Group {
  const group = new THREE.Group();
  const radial = quality === 'high' ? 40 : 20;
  const m = part.morph;
  const rx = rig.headRadiusX;
  const rz = rig.headRadiusZ;
  const h = rig.headHeight;
  const chin = rig.chinY;

  // 輪郭プロファイル（顎0 → 頭頂1）
  const jaw = m.jawWidth ?? 1;
  const cheek = m.cheek ?? 1;
  const temple = m.temple ?? 1;
  const forehead = m.forehead ?? 1;
  const cranium = m.cranium ?? 1;
  const chinLen = m.chinLength ?? 1;

  const profile: { t: number; w: number; d: number; fwd: number }[] = [
    { t: 0.0, w: 0.32 * jaw, d: 0.35, fwd: 0.02 * chinLen }, // 顎先
    { t: 0.12, w: 0.55 * jaw, d: 0.52, fwd: 0.008 },
    { t: 0.28, w: 0.78 * cheek, d: 0.72, fwd: 0.0 }, // 頬
    { t: 0.45, w: 0.92 * cheek, d: 0.85, fwd: -0.004 },
    { t: 0.6, w: 0.98 * temple, d: 0.95, fwd: -0.006 }, // こめかみ
    { t: 0.72, w: 0.95 * forehead, d: 0.98, fwd: -0.002 }, // 額
    { t: 0.85, w: 0.9 * cranium, d: 1.0, fwd: -0.01 },
    { t: 0.95, w: 0.68 * cranium, d: 0.78, fwd: -0.015 },
    { t: 1.0, w: 0.05, d: 0.05, fwd: -0.01 },
  ];
  const sections: Section[] = profile.map((p) => ({
    center: new THREE.Vector3(0, chin + h * p.t, p.fwd),
    rx: rx * p.w,
    rz: rz * p.d,
  }));
  const head = new THREE.Mesh(loftSections(sections, radial), skinMaterial(part.color, part.roughness));
  head.userData.partId = 'head';
  head.name = 'head';
  group.add(head);

  // 部位オフセット等
  applyTransform(group, part);
  return group;
}

/** 頭表面のZ座標（顔のパーツ配置用の近似） */
function faceZ(rig: BodyRig, part: PartState, yFrac: number): number {
  const m = part.morph;
  const h = rig.headHeight;
  const t = Math.max(0, Math.min(1, yFrac));
  // 輪郭プロファイルの奥行きを線形補間で近似
  const rz = rig.headRadiusZ;
  return rz * (0.4 + 0.6 * Math.sin(Math.PI * Math.min(1, t * 1.15))) * 0.92 + (m.width ? 0 : 0) + h * 0.0;
}

export function buildEye(rig: BodyRig, head: PartState, part: PartState, side: 1 | -1): THREE.Group {
  const group = new THREE.Group();
  const m = part.morph;
  const size = (m.size ?? 1) * 0.011 * rig.height;
  const w = size * (m.width ?? 1);
  const hgt = size * 0.5 * (m.height ?? 1);

  const x = side * (rig.headRadiusX * 0.42 + (m.posX ?? 0));
  const y = rig.eyeY + (m.posY ?? 0);
  const z = faceZ(rig, head, 0.55) - 0.002;

  // 眼球（白目＋虹彩）
  const ball = new THREE.Mesh(ellipsoid(w, hgt, size * 0.45, 20, 14), new THREE.MeshStandardMaterial({ color: '#f5f2ee', roughness: 0.3 }));
  ball.position.set(x, y, z);
  ball.rotation.z = THREE.MathUtils.degToRad(-side * (m.tilt ?? 0));
  const partId = side === 1 ? 'eyeL' : 'eyeR';
  ball.userData.partId = partId;
  group.add(ball);

  const iris = new THREE.Mesh(
    new THREE.CircleGeometry(size * 0.32, 16),
    new THREE.MeshStandardMaterial({ color: '#3a2a1a', roughness: 0.25 }),
  );
  iris.position.set(x, y, z + size * 0.42);
  iris.userData.partId = partId;
  group.add(iris);

  // 二重まぶた線（fold に応じたアーチ）
  const fold = m.fold ?? 0.4;
  if (fold > 0.03) {
    const foldH = size * (0.25 + fold * 0.5);
    const shape = m.foldShape ?? 0.5;
    const pts = [
      new THREE.Vector3(x - w * (0.9 - shape * 0.2), y + hgt * 0.6 + foldH * (1 - shape) * 0.4, z + size * 0.4),
      new THREE.Vector3(x, y + hgt * 0.8 + foldH, z + size * 0.42),
      new THREE.Vector3(x + w * 0.9, y + hgt * 0.6 + foldH * 0.4, z + size * 0.4),
    ];
    const lid = new THREE.Mesh(
      tubeAlongPath(pts, () => ({ rx: 0.0006, rz: 0.0006 }), 12, 6, false, false),
      skinMaterial('#a5785c', 0.8),
    );
    lid.userData.partId = partId;
    group.add(lid);
  }
  applyTransform(group, part);
  return group;
}

export function buildBrow(rig: BodyRig, head: PartState, part: PartState, side: 1 | -1): THREE.Group {
  const group = new THREE.Group();
  const m = part.morph;
  const len = 0.024 * rig.height * 0.5 * (m.length ?? 1);
  const thick = 0.0022 * rig.height * (m.thickness ?? 1);
  const arch = (m.arch ?? 0.2) * 0.006;
  const x0 = side * rig.headRadiusX * 0.42;
  const y = rig.browY + (m.posY ?? 0);
  const z = faceZ(rig, head, 0.66) + 0.001;

  const pts = [
    new THREE.Vector3(x0 - side * len * 0.5, y, z),
    new THREE.Vector3(x0, y + arch, z + 0.001),
    new THREE.Vector3(x0 + side * len * 0.6, y + arch * 0.4 - len * 0.12, z - 0.002),
  ];
  const brow = new THREE.Mesh(
    tubeAlongPath(pts, (t) => ({ rx: thick * (1 - t * 0.4), rz: thick * 0.6 }), 14, 8, true, true),
    new THREE.MeshStandardMaterial({ color: part.color === '#e8b89a' ? '#3a2a1a' : part.color, roughness: 0.8 }),
  );
  brow.userData.partId = side === 1 ? 'browL' : 'browR';
  group.add(brow);
  applyTransform(group, part);
  return group;
}

export function buildNose(rig: BodyRig, head: PartState, part: PartState): THREE.Group {
  const group = new THREE.Group();
  const m = part.morph;
  const bridgeH = 0.008 * rig.height * (m.bridgeHeight ?? 1);
  const bridgeW = 0.0055 * rig.height * (m.bridgeWidth ?? 1);
  const tipR = 0.006 * rig.height * (m.tipSize ?? 1);
  const alaeW = (m.alaeWidth ?? 1);
  const len = (m.length ?? 1);

  const rootY = rig.eyeY + 0.004;
  const tipY = rig.noseTipY - (len - 1) * 0.01 * rig.height;
  const zBase = faceZ(rig, head, 0.5);

  // 鼻筋ロフト（鼻根→鼻先）
  const sections: Section[] = [
    { center: new THREE.Vector3(0, rootY, zBase - 0.002), rx: bridgeW * 0.9, rz: bridgeH * 0.5 * (m.rootHeight ?? 1) },
    { center: new THREE.Vector3(0, (rootY + tipY) / 2, zBase + bridgeH * 0.5), rx: bridgeW * 0.8, rz: bridgeH * 0.8 },
    { center: new THREE.Vector3(0, tipY, zBase + bridgeH + tipR * 0.4), rx: tipR, rz: tipR * 0.9 },
  ];
  const bridge = new THREE.Mesh(loftSections(sections, 16), skinMaterial(part.color, part.roughness));
  bridge.userData.partId = 'nose';
  group.add(bridge);

  // 鼻先
  const tip = new THREE.Mesh(ellipsoid(tipR, tipR * 0.8, tipR * (1 + (m.tipHeight ?? 0) * 0.3), 16, 12), skinMaterial(part.color, part.roughness));
  tip.position.set(0, tipY + (m.tipHeight ?? 0) * 0.004, zBase + bridgeH + tipR * 0.5);
  tip.userData.partId = 'nose';
  group.add(tip);

  // 鼻翼
  for (const side of [-1, 1]) {
    const ala = new THREE.Mesh(ellipsoid(tipR * 0.55 * alaeW, tipR * 0.45, tipR * 0.5, 12, 10), skinMaterial(part.color, part.roughness));
    ala.position.set(side * tipR * 0.95 * alaeW, tipY - tipR * 0.15, zBase + bridgeH * 0.9);
    ala.userData.partId = 'nose';
    group.add(ala);
  }
  applyTransform(group, part);
  return group;
}

export function buildMouth(rig: BodyRig, head: PartState, part: PartState): THREE.Group {
  const group = new THREE.Group();
  const m = part.morph;
  const width = 0.022 * rig.height * (m.width ?? 1);
  const y = rig.mouthY + (m.posY ?? 0);
  const z = faceZ(rig, head, 0.2) + 0.001 + ((m.protrusion ?? 1) - 1) * 0.006;
  const lift = (m.cornerLift ?? 0) * 0.0035;
  const lipColor = '#c07a6a';

  // 上唇・下唇：口裂けに沿ったチューブ
  const lipPath = () => [
    new THREE.Vector3(-width / 2, y + lift, z),
    new THREE.Vector3(0, y, z + 0.0012),
    new THREE.Vector3(width / 2, y + lift, z),
  ];
  const upper = new THREE.Mesh(
    tubeAlongPath(lipPath().map((p) => p.clone().setY(p.y + 0.0018)), () => ({ rx: 0.0016 * (m.upperLip ?? 1) * rig.height * 0.6, rz: 0.0012 * (m.upperLip ?? 1) * rig.height * 0.6 }), 14, 8),
    new THREE.MeshStandardMaterial({ color: lipColor, roughness: 0.5 }),
  );
  upper.userData.partId = 'mouth';
  group.add(upper);
  const lower = new THREE.Mesh(
    tubeAlongPath(lipPath().map((p) => p.clone().setY(p.y - 0.0016)), () => ({ rx: 0.0018 * (m.lowerLip ?? 1) * rig.height * 0.6, rz: 0.0014 * (m.lowerLip ?? 1) * rig.height * 0.6 }), 14, 8),
    new THREE.MeshStandardMaterial({ color: lipColor, roughness: 0.5 }),
  );
  lower.userData.partId = 'mouth';
  group.add(lower);
  // 口裂けライン
  const slit = new THREE.Mesh(
    tubeAlongPath(lipPath(), () => ({ rx: 0.0005, rz: 0.0005 }), 14, 6),
    new THREE.MeshStandardMaterial({ color: '#7a4638', roughness: 0.9 }),
  );
  slit.userData.partId = 'mouth';
  group.add(slit);
  applyTransform(group, part);
  return group;
}

export function buildEar(rig: BodyRig, head: PartState, part: PartState, side: 1 | -1): THREE.Group {
  const group = new THREE.Group();
  const m = part.morph;
  const s = 0.017 * rig.height * (m.size ?? 1);
  const x = side * (rig.headRadiusX * 0.98);
  const y = rig.eyeY - 0.005 + (m.posY ?? 0);
  const z = 0;

  const ear = new THREE.Mesh(ellipsoid(s * 0.45, s * 0.7, s * 0.3, 14, 10), skinMaterial(part.color, part.roughness));
  ear.position.set(x, y, z);
  ear.rotation.y = THREE.MathUtils.degToRad(side * (m.angle ?? 12));
  ear.userData.partId = side === 1 ? 'earL' : 'earR';
  group.add(ear);
  applyTransform(group, part);
  return group;
}

function applyTransform(group: THREE.Group, part: PartState): void {
  group.position.set(part.offset.x, part.offset.y, part.offset.z);
  group.rotation.set(
    THREE.MathUtils.degToRad(part.rotation.x),
    THREE.MathUtils.degToRad(part.rotation.y),
    THREE.MathUtils.degToRad(part.rotation.z),
  );
  group.scale.set(part.scale.x, part.scale.y, part.scale.z);
}
