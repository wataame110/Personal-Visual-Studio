// 四肢（腕・手・脚・足）のパラメトリックメッシュ。左右独立編集対応。
import * as THREE from 'three';
import { loftSections, ellipsoid, type Section } from '../geometry';
import type { BodyRig } from '../rig';
import type { PartState } from '../../core/types';
import { skinMaterial } from '../materials';

function applyTransform(group: THREE.Group, part: PartState): void {
  group.position.set(part.offset.x, part.offset.y, part.offset.z);
  group.rotation.set(
    THREE.MathUtils.degToRad(part.rotation.x),
    THREE.MathUtils.degToRad(part.rotation.y),
    THREE.MathUtils.degToRad(part.rotation.z),
  );
  group.scale.set(part.scale.x, part.scale.y, part.scale.z);
}

/** 上腕・前腕・手を一体で構築（左右別パーツとして登録） */
export function buildArm(
  rig: BodyRig,
  upper: PartState,
  fore: PartState,
  hand: PartState,
  side: 1 | -1,
  quality: 'high' | 'low',
): THREE.Group {
  const group = new THREE.Group();
  const radial = quality === 'high' ? 24 : 12;
  const sx = side * rig.shoulderHalf * 0.98;
  const shoulderTop = rig.shoulderY - 0.005;
  const elbowY = shoulderTop - rig.upperArmLen * (upper.morph.length ?? 1) * 0.62;
  const wristY = elbowY - rig.forearmLen * (fore.morph.length ?? 1);

  const upperT = (upper.morph.thickness ?? 1) * rig.fatFactor;
  const foreT = (fore.morph.thickness ?? 1) * (0.7 + rig.fatFactor * 0.3);
  const muscle = upper.morph.muscle ?? 0.2;

  const r0 = 0.024 * rig.height * upperT;
  const elbowR = 0.018 * rig.height * upperT;
  const sections: Section[] = [
    { center: new THREE.Vector3(sx, shoulderTop, 0), rx: r0 * 1.15, rz: r0 },
    { center: new THREE.Vector3(sx * 1.02, shoulderTop - (shoulderTop - elbowY) * 0.45, 0), rx: r0 * (1 + muscle * 0.25), rz: r0 * 0.9 * (1 + muscle * 0.2) },
    { center: new THREE.Vector3(sx * 1.05, elbowY, 0), rx: elbowR, rz: elbowR * 0.9 },
  ];
  const upperMesh = new THREE.Mesh(loftSections(sections, radial), skinMaterial(upper.color, upper.roughness));
  upperMesh.userData.partId = side === 1 ? 'upperArmL' : 'upperArmR';
  upperMesh.name = upperMesh.userData.partId;
  group.add(upperMesh);

  const wristR = 0.013 * rig.height * foreT;
  const foreSections: Section[] = [
    { center: new THREE.Vector3(sx * 1.05, elbowY, 0), rx: elbowR * 0.95, rz: elbowR * 0.9 },
    { center: new THREE.Vector3(sx * 1.08, (elbowY + wristY) / 2, 0), rx: elbowR * 0.82 * foreT, rz: elbowR * 0.78 * foreT },
    { center: new THREE.Vector3(sx * 1.1, wristY, 0), rx: wristR, rz: wristR * 0.85 },
  ];
  const foreMesh = new THREE.Mesh(loftSections(foreSections, radial), skinMaterial(fore.color, fore.roughness));
  foreMesh.userData.partId = side === 1 ? 'forearmL' : 'forearmR';
  foreMesh.name = foreMesh.userData.partId;
  group.add(foreMesh);

  // 手（簡易な平たい形状）
  const handS = 0.038 * rig.height * (hand.morph.size ?? 1);
  const handMesh = new THREE.Mesh(ellipsoid(handS * 0.42, handS * 0.62, handS * 0.18, 14, 10), skinMaterial(hand.color, hand.roughness));
  handMesh.position.set(sx * 1.1, wristY - handS * 0.5, 0);
  handMesh.userData.partId = side === 1 ? 'handL' : 'handR';
  handMesh.name = handMesh.userData.partId;
  group.add(handMesh);

  applyTransform(group, upper);
  return group;
}

/** 大腿・下腿・足を一体で構築 */
export function buildLeg(
  rig: BodyRig,
  thigh: PartState,
  calf: PartState,
  foot: PartState,
  side: 1 | -1,
  quality: 'high' | 'low',
): THREE.Group {
  const group = new THREE.Group();
  const radial = quality === 'high' ? 24 : 12;
  const hx = side * rig.hipHalfW * 0.45;
  const thighT = (thigh.morph.thickness ?? 1) * rig.fatFactor;
  const calfT = (calf.morph.thickness ?? 1) * (0.7 + rig.fatFactor * 0.3);
  const muscle = thigh.morph.muscle ?? 0.2;

  const r0 = 0.052 * rig.height * thighT;
  const kneeR = 0.028 * rig.height * thighT;
  const thighSections: Section[] = [
    { center: new THREE.Vector3(hx, rig.crotchY + 0.02, 0), rx: r0 * 1.1, rz: r0 },
    { center: new THREE.Vector3(hx, (rig.crotchY + rig.kneeY) / 2 + 0.04, 0.004), rx: r0 * (0.85 + muscle * 0.2), rz: r0 * 0.85 * (1 + muscle * 0.15) },
    { center: new THREE.Vector3(hx, rig.kneeY, 0), rx: kneeR, rz: kneeR },
  ];
  const thighMesh = new THREE.Mesh(loftSections(thighSections, radial), skinMaterial(thigh.color, thigh.roughness));
  thighMesh.userData.partId = side === 1 ? 'thighL' : 'thighR';
  thighMesh.name = thighMesh.userData.partId;
  group.add(thighMesh);

  const ankleR = 0.016 * rig.height * calfT;
  const calfSections: Section[] = [
    { center: new THREE.Vector3(hx, rig.kneeY, 0), rx: kneeR * 0.95, rz: kneeR * 0.95 },
    { center: new THREE.Vector3(hx, rig.kneeY - (rig.kneeY - rig.ankleY) * 0.3, -0.006 * calfT), rx: kneeR * 0.95 * calfT, rz: kneeR * calfT },
    { center: new THREE.Vector3(hx, rig.ankleY, 0), rx: ankleR, rz: ankleR },
  ];
  const calfMesh = new THREE.Mesh(loftSections(calfSections, radial), skinMaterial(calf.color, calf.roughness));
  calfMesh.userData.partId = side === 1 ? 'calfL' : 'calfR';
  calfMesh.name = calfMesh.userData.partId;
  group.add(calfMesh);

  // 足（前方向への扁平形状）
  const footS = 0.055 * rig.height * (foot.morph.size ?? 1);
  const footMesh = new THREE.Mesh(ellipsoid(footS * 0.36, footS * 0.2, footS * 0.62, 14, 10), skinMaterial(foot.color, foot.roughness));
  footMesh.position.set(hx, rig.ankleY - footS * 0.15, footS * 0.25);
  footMesh.userData.partId = side === 1 ? 'footL' : 'footR';
  footMesh.name = footMesh.userData.partId;
  group.add(footMesh);

  applyTransform(group, thigh);
  return group;
}
