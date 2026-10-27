// 胴体（胸郭・腹部・腰部・骨盤・臀部）と乳房のパラメトリックメッシュ
import * as THREE from 'three';
import { loftSections, ellipsoid, type Section } from '../geometry';
import type { BodyRig } from '../rig';
import type { PartState } from '../../core/types';
import { skinMaterial } from '../materials';

/** 胴体本体：crotch→肩までの連続ロフト。姿勢・皮下脂肪・筋肉を反映する。 */
export function buildTorso(rig: BodyRig, parts: Record<string, PartState>, quality: 'high' | 'low'): THREE.Group {
  const group = new THREE.Group();
  group.name = 'torsoGroup';
  const radial = quality === 'high' ? 40 : 20;

  const abdomenBulge = parts.abdomen.morph.bulge ?? 1;
  const buttProj = parts.pelvis.morph.buttProjection ?? 1;
  const buttLift = parts.pelvis.morph.buttLift ?? 0;
  const shoulderSlope = parts.chest.morph.shoulderSlope ?? 0;
  const posture = rig.globals.posture;

  // 断面列（下→上）
  const sections: Section[] = [
    { center: new THREE.Vector3(0, rig.crotchY, 0), rx: rig.hipHalfW * 0.72, rz: rig.hipHalfD * 0.68 },
    { center: new THREE.Vector3(0, rig.hipY, -0.012 * buttProj * rig.height * 0.06), rx: rig.hipHalfW, rz: rig.hipHalfD * (0.85 + buttProj * 0.3) },
    { center: new THREE.Vector3(0, (rig.hipY + rig.waistY) / 2, 0), rx: (rig.hipHalfW + rig.waistHalfW) / 2, rz: (rig.hipHalfD + rig.waistHalfD) / 2 },
    { center: new THREE.Vector3(0, rig.waistY, 0), rx: rig.waistHalfW, rz: rig.waistHalfD * abdomenBulge },
    { center: new THREE.Vector3(0, (rig.waistY + rig.bustY) / 2, posture * 0.01), rx: (rig.waistHalfW + rig.bustHalfW) / 2, rz: (rig.waistHalfD + rig.bustHalfD) / 2 },
    { center: new THREE.Vector3(0, rig.bustY, posture * 0.02), rx: rig.bustHalfW, rz: rig.bustHalfD },
    { center: new THREE.Vector3(0, (rig.bustY + rig.shoulderY) / 2, posture * 0.025), rx: rig.bustHalfW * 1.05, rz: rig.bustHalfD * 0.92 },
    { center: new THREE.Vector3(0, rig.shoulderY, posture * 0.03), rx: rig.shoulderHalf * 0.92, rz: rig.bustHalfD * 0.8, super: 1.4 },
  ];
  const torso = new THREE.Mesh(loftSections(sections, radial), skinMaterial(parts.chest.color, parts.chest.roughness));
  torso.name = 'torso';
  torso.userData.partId = 'chest';
  group.add(torso);

  // 臀部の膨らみ（左右のローブ）
  const buttR = rig.hipHalfD * 0.52 * buttProj;
  const buttGeo = ellipsoid(rig.hipHalfW * 0.42, buttR * 0.9, buttR);
  for (const side of [-1, 1]) {
    const lobe = new THREE.Mesh(buttGeo.clone(), skinMaterial(parts.pelvis.color, parts.pelvis.roughness));
    lobe.position.set(
      side * rig.hipHalfW * 0.42,
      rig.hipY - buttR * 0.35 + buttLift * 0.02,
      -rig.hipHalfD * 0.55,
    );
    lobe.userData.partId = 'pelvis';
    lobe.name = `buttock${side < 0 ? 'R' : 'L'}`;
    group.add(lobe);
  }

  // 腹筋の輪郭（医療・詳細：トーンに応じた浅い縦溝）
  const tone = parts.abdomen.morph.tone ?? 0;
  if (tone > 0.35) {
    const grooveMat = skinMaterial('#000000', 1);
    const groove = new THREE.Mesh(
      new THREE.BoxGeometry(0.002, (rig.bustY - rig.waistY) * 0.9, 0.001),
      grooveMat,
    );
    groove.position.set(0, (rig.bustY + rig.waistY) / 2, rig.waistHalfD * 0.98);
    groove.material.transparent = true;
    groove.material.opacity = (tone - 0.35) * 0.25;
    groove.name = 'abdomenTone';
    groove.userData.partId = 'abdomen';
    group.add(groove);
  }

  // 首
  const neckGeo = loftSections(
    [
      { center: new THREE.Vector3(0, rig.neckBaseY, posture * 0.03), rx: rig.neckRadius * 1.35, rz: rig.neckRadius * 1.3 },
      { center: new THREE.Vector3(0, rig.neckTopY, posture * 0.02), rx: rig.neckRadius, rz: rig.neckRadius * 0.95 },
    ],
    radial,
  );
  const neck = new THREE.Mesh(neckGeo, skinMaterial(parts.neck.color, parts.neck.roughness));
  neck.name = 'neck';
  neck.userData.partId = 'neck';
  group.add(neck);

  return group;
}

/** 乳房1つ分。基部から乳頭までの連続ロフト＋乳輪・乳頭。 */
export function buildBreast(
  rig: BodyRig,
  part: PartState,
  side: 1 | -1,
  quality: 'high' | 'low',
): THREE.Group {
  const group = new THREE.Group();
  const m = part.morph;
  const size = m.size ?? 1;
  if (size <= 0.02) return group;

  const radial = quality === 'high' ? 28 : 14;
  const baseR = 0.048 * rig.height * size * (m.width ?? 1);
  const heightLen = 0.05 * rig.height * size * (m.height ?? 1);
  const proj = 0.045 * rig.height * size * (m.projection ?? 1);
  const sag = m.sag ?? 0.2;

  // 胸壁上の基部位置
  const baseX = side * (rig.bustHalfW * 0.48 + (m.posX ?? 0));
  const baseY = rig.bustY - 0.02 * rig.height + (m.posY ?? 0);
  const baseZ = rig.bustHalfD * 0.82;

  // ロフト経路：基部→頂点。下垂は先端ほど下がる。
  const steps = 6;
  const sections: Section[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = baseR * Math.sin(Math.PI * Math.min(1, 0.25 + t * 0.95)) * (1 - t * 0.15);
    const droop = sag * t * t * proj * 1.1;
    sections.push({
      center: new THREE.Vector3(baseX + side * t * 0.008, baseY + heightLen * 0.4 * (1 - t) - droop, baseZ + t * proj),
      rx: Math.max(0.003, r),
      rz: Math.max(0.003, r * 0.92),
    });
  }
  const breast = new THREE.Mesh(loftSections(sections, radial), skinMaterial(part.color, part.roughness));
  breast.userData.partId = side === 1 ? 'breastL' : 'breastR';
  breast.name = breast.userData.partId;
  group.add(breast);

  // 乳輪・乳頭
  const tipT = sections[sections.length - 1].center;
  const areolaR = baseR * 0.34 * (m.areolaSize ?? 1);
  const areola = new THREE.Mesh(
    ellipsoid(areolaR, areolaR * 0.85, areolaR * 0.25, radial, Math.max(8, radial / 2)),
    skinMaterial(part.color2, part.roughness + 0.05),
  );
  areola.position.copy(tipT);
  areola.position.z += 0.0015;
  areola.userData.partId = breast.userData.partId;
  group.add(areola);

  const nipR = areolaR * 0.32 * (m.nippleSize ?? 1);
  const nip = new THREE.Mesh(
    ellipsoid(nipR, nipR, nipR * (1 + (m.nippleProjection ?? 1)), 12, 10),
    skinMaterial(part.color2, part.roughness),
  );
  nip.position.copy(tipT);
  nip.position.y += m.nipplePosY ?? 0;
  nip.position.z += areolaR * 0.25 + nipR * (m.nippleProjection ?? 1) * 0.5;
  nip.userData.partId = breast.userData.partId;
  group.add(nip);

  // 部位全体のオフセット・回転・スケールを適用
  group.position.set(part.offset.x, part.offset.y, part.offset.z);
  group.rotation.set(
    THREE.MathUtils.degToRad(part.rotation.x),
    THREE.MathUtils.degToRad(part.rotation.y),
    THREE.MathUtils.degToRad(part.rotation.z),
  );
  group.scale.set(part.scale.x, part.scale.y, part.scale.z);
  return group;
}
