// 医療モード：外性器の解剖学的パラメトリックメッシュ
// 注意: 本モジュールの形状は医学的監修を受けたものではなく、視覚的説明支援のための近似モデル。
import * as THREE from 'three';
import { loftSections, ellipsoid, tubeAlongPath, type Section } from '../geometry';
import type { BodyRig } from '../rig';
import type { PartState } from '../../core/types';
import { skinMaterial, mucosaMaterial } from '../materials';

function applyTransform(group: THREE.Group, part: PartState): void {
  group.position.set(part.offset.x, part.offset.y, part.offset.z);
  group.rotation.set(
    THREE.MathUtils.degToRad(part.rotation.x),
    THREE.MathUtils.degToRad(part.rotation.y),
    THREE.MathUtils.degToRad(part.rotation.z),
  );
  group.scale.set(part.scale.x, part.scale.y, part.scale.z);
}

// 外陰部の基準平面（前方・やや下方を向く）
function vulvaOrigin(rig: BodyRig): THREE.Vector3 {
  return new THREE.Vector3(0, rig.crotchY - 0.012, rig.hipHalfD * 0.42);
}

export function buildMonsPubis(rig: BodyRig, part: PartState): THREE.Group {
  const group = new THREE.Group();
  const m = part.morph;
  const o = vulvaOrigin(rig);
  const w = 0.045 * rig.height * (m.size ?? 1) * (m.width ?? 1);
  const h = 0.03 * rig.height * (m.size ?? 1) * (m.height ?? 1);
  const mesh = new THREE.Mesh(ellipsoid(w, h, h * 0.8, 20, 14), skinMaterial(part.color, part.roughness));
  mesh.position.set(o.x, o.y + h * 1.1 + (m.posY ?? 0), o.z + h * 0.3);
  mesh.rotation.x = -0.35;
  mesh.userData.partId = 'monsPubis';
  group.add(mesh);
  applyTransform(group, part);
  return group;
}

export function buildClitoris(rig: BodyRig, glans: PartState, hood: PartState): THREE.Group {
  const group = new THREE.Group();
  const o = vulvaOrigin(rig);
  const gm = glans.morph;
  const gR = 0.0028 * rig.height * (gm.size ?? 1);
  const glansMesh = new THREE.Mesh(
    ellipsoid(gR, gR * 1.15, gR * (gm.protrusion ?? 1), 12, 10),
    mucosaMaterial(glans.color, 0.4),
  );
  const gy = o.y + 0.006 + (gm.posY ?? 0);
  glansMesh.position.set(o.x, gy, o.z + 0.004 + gR * (gm.protrusion ?? 1) * 0.5);
  glansMesh.rotation.x = -0.5;
  glansMesh.userData.partId = 'clitoralGlans';
  group.add(glansMesh);

  // 陰核包皮：亀頭を覆うフード状チューブ
  const hm = hood.morph;
  const cov = hm.coverage ?? 0.8;
  const hoodThick = 0.0018 * rig.height * (hm.thickness ?? 1);
  const pts = [
    new THREE.Vector3(o.x, gy + gR * 2.2, o.z + 0.002),
    new THREE.Vector3(o.x, gy + gR * 0.6, o.z + 0.004 + gR * 0.8),
    new THREE.Vector3(o.x, gy - gR * (1.4 - cov), o.z + 0.004 + gR * 0.6 * cov),
  ];
  const hoodMesh = new THREE.Mesh(
    tubeAlongPath(pts, (t) => ({ rx: hoodThick * (1 + cov * 0.4), rz: hoodThick * 0.8 }), 10, 8),
    skinMaterial(hood.color, hood.roughness),
  );
  hoodMesh.userData.partId = 'clitoralHood';
  group.add(hoodMesh);
  return group;
}

/** 大陰唇（左右） */
export function buildLabiaMajora(rig: BodyRig, part: PartState, side: 1 | -1): THREE.Group {
  const group = new THREE.Group();
  const m = part.morph;
  const o = vulvaOrigin(rig);
  const len = 0.05 * rig.height * (m.length ?? 1);
  const w = 0.0085 * rig.height * (m.width ?? 1);
  const full = m.fullness ?? 1;
  const px = o.x + side * (0.011 * rig.height + (m.posX ?? 0));
  const tilt = THREE.MathUtils.degToRad(m.tilt ?? 0);

  // 上方（恥丘側）から下方（会陰側）への緩やかな湾曲ロフト
  const pts = [
    new THREE.Vector3(px, o.y + 0.008, o.z + 0.002),
    new THREE.Vector3(px + side * w * 0.35, o.y - len * 0.35, o.z + 0.004 + w * full * 0.3),
    new THREE.Vector3(px + side * w * 0.15, o.y - len * 0.75, o.z + 0.002),
    new THREE.Vector3(px - side * w * 0.3, o.y - len, o.z - 0.003),
  ];
  const mesh = new THREE.Mesh(
    tubeAlongPath(pts, (t) => {
      const bulge = Math.sin(Math.PI * Math.min(1, t * 1.2));
      return { rx: w * (0.4 + bulge * 0.6) * full, rz: w * (0.35 + bulge * 0.65) * full * 0.9 };
    }, 18, 12),
    skinMaterial(part.color, part.roughness),
  );
  mesh.userData.partId = side === 1 ? 'labiaMajoraL' : 'labiaMajoraR';
  mesh.rotation.z = tilt * side;
  group.add(mesh);
  applyTransform(group, part);
  return group;
}

/** 小陰唇（左右）：薄いひだ状。縁の曲線・ひだ・突出を反映 */
export function buildLabiaMinora(rig: BodyRig, part: PartState, side: 1 | -1): THREE.Group {
  const group = new THREE.Group();
  const m = part.morph;
  const o = vulvaOrigin(rig);
  const len = 0.032 * rig.height * (m.length ?? 1);
  const w = 0.006 * rig.height * (m.width ?? 1);
  const protr = m.protrusion ?? 0.6;
  const edge = m.edgeCurve ?? 0.5;
  const folds = m.folds ?? 0.3;
  const px = o.x + side * (0.0045 * rig.height + (m.posX ?? 0));

  const pts = [
    new THREE.Vector3(px, o.y + 0.006, o.z + 0.004),
    new THREE.Vector3(px + side * w * 0.5, o.y - len * 0.4, o.z + 0.005 + w * protr * 0.4),
    new THREE.Vector3(px + side * w * 0.3, o.y - len * (0.7 + protr * 0.2), o.z + 0.003),
  ];
  const geo = tubeAlongPath(pts, (t) => {
    const thin = 0.0011 * rig.height;
    const wav = 1 + Math.sin(t * Math.PI * 3) * folds * 0.35;
    return { rx: w * Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.1)) * 0.6 * wav * (0.5 + edge * 0.5), rz: thin * wav };
  }, 16, 10);
  const mesh = new THREE.Mesh(geo, mucosaMaterial(part.color2 !== '#b0715a' ? part.color2 : part.color, 0.5));
  mesh.userData.partId = side === 1 ? 'labiaMinoraL' : 'labiaMinoraR';
  group.add(mesh);
  applyTransform(group, part);
  return group;
}

/** 外陰前庭・尿道口・膣口・会陰の目安表示 */
export function buildVestibule(rig: BodyRig, part: PartState): THREE.Group {
  const group = new THREE.Group();
  const m = part.morph;
  const o = vulvaOrigin(rig);

  // 前庭面（粘膜色の浅い楕円面）
  const vest = new THREE.Mesh(
    ellipsoid(0.005 * rig.height, 0.016 * rig.height, 0.0012 * rig.height, 16, 12),
    mucosaMaterial(part.color, 0.45),
  );
  vest.position.set(o.x, o.y - 0.012 * rig.height, o.z + 0.0025);
  vest.rotation.x = -0.35;
  vest.userData.partId = 'vestibule';
  group.add(vest);

  // 尿道口（小さな点）
  const urethra = new THREE.Mesh(
    ellipsoid(0.0009 * rig.height, 0.0009 * rig.height, 0.0006 * rig.height, 8, 6),
    mucosaMaterial('#8a4a4a', 0.4),
  );
  urethra.position.set(o.x, o.y - 0.006 * rig.height + (m.urethraPosY ?? 0), o.z + 0.004);
  urethra.userData.partId = 'vestibule';
  group.add(urethra);

  // 膣口（くぼみの表現）
  const vagR = 0.0032 * rig.height * (m.vaginalOpening ?? 1);
  const vag = new THREE.Mesh(
    ellipsoid(vagR, vagR * 1.4, vagR * 0.3, 12, 10),
    mucosaMaterial('#7a3d3d', 0.5),
  );
  vag.position.set(o.x, o.y - 0.017 * rig.height + (m.vaginalPosY ?? 0), o.z + 0.0032);
  vag.userData.partId = 'vestibule';
  group.add(vag);

  // 会陰（膣口〜肛門方向の帯）
  const perLen = 0.012 * rig.height * (m.perineumLength ?? 1);
  const per = new THREE.Mesh(
    tubeAlongPath(
      [
        new THREE.Vector3(o.x, o.y - 0.017 * rig.height - vagR, o.z + 0.002),
        new THREE.Vector3(o.x, o.y - 0.017 * rig.height - vagR - perLen, o.z - 0.006),
      ],
      () => ({ rx: 0.0035 * rig.height, rz: 0.0018 * rig.height }),
      6,
      8,
    ),
    skinMaterial(part.color, part.roughness),
  );
  per.userData.partId = 'vestibule';
  group.add(per);
  applyTransform(group, part);
  return group;
}

// ---------- 男性外性器 ----------

function maleOrigin(rig: BodyRig): THREE.Vector3 {
  return new THREE.Vector3(0, rig.crotchY + 0.008, rig.hipHalfD * 0.55);
}

/** 陰茎体：基部→先端のロフト。湾曲は経路変形として表現（回転ではない）。 */
export function buildPenisShaft(rig: BodyRig, part: PartState, quality: 'high' | 'low'): THREE.Group {
  const group = new THREE.Group();
  const m = part.morph;
  const o = maleOrigin(rig);
  const len = 0.085 * rig.height * (m.length ?? 1);
  const gB = 0.011 * rig.height * (m.girthBase ?? 1);
  const gM = 0.0115 * rig.height * (m.girthMid ?? 1);
  const gT = 0.0105 * rig.height * (m.girthTip ?? 1);

  const curveLR = THREE.MathUtils.degToRad(m.curveLR ?? 0);
  const curveUD = THREE.MathUtils.degToRad(m.curveUD ?? 0);
  const curveStart = m.curveStart ?? 0.3;
  const curveRange = m.curveRange ?? 0.7;
  const bend = THREE.MathUtils.degToRad(m.bend ?? 0);
  const angle = THREE.MathUtils.degToRad(m.angle ?? 0);

  // 経路生成：湾曲パラメータを弧として経路に反映
  const steps = quality === 'high' ? 20 : 10;
  const pts: THREE.Vector3[] = [];
  const radii: { rx: number; rz: number }[] = [];
  let px = o.x;
  let py = o.y;
  let pz = o.z;
  let dx = 0;
  let dy = -Math.sin(angle) * 0.8;
  let dz = Math.cos(angle);
  const seg = len / steps;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push(new THREE.Vector3(px, py, pz));
    // 半径プロファイル（基部・中央・先端を補間）
    const g = t < 0.5 ? gB + (gM - gB) * (t * 2) : gM + (gT - gM) * ((t - 0.5) * 2);
    radii.push({ rx: g, rz: g * 0.92 });
    // 湾曲：curveStart〜curveStart+curveRange の区間で方向を曲げる
    const inCurve = t > curveStart && t < Math.min(1, curveStart + curveRange);
    if (inCurve) {
      const local = (t - curveStart) / curveRange;
      dx += Math.sin(curveLR) * 0.12 * local;
      dy += Math.sin(curveUD) * 0.12 * local - Math.sin(bend) * 0.06;
    }
    const norm = Math.hypot(dx, dy, dz) || 1;
    px += (dx / norm) * seg;
    py += (dy / norm) * seg;
    pz += (dz / norm) * seg;
  }

  const sections: Section[] = pts.map((p, i) => ({ center: p, rx: radii[i].rx, rz: radii[i].rz }));
  const shaft = new THREE.Mesh(loftSections(sections, quality === 'high' ? 20 : 10), skinMaterial(part.color, part.roughness + (m.skinWrinkle ?? 0) * 0.1));
  shaft.userData.partId = 'penisShaft';
  group.add(shaft);

  // 先端位置・方向を glans 配置用に記録
  const tipDir = pts[pts.length - 1].clone().sub(pts[pts.length - 2]).normalize();
  group.userData.tipPosition = pts[pts.length - 1];
  group.userData.tipDirection = tipDir;
  applyTransform(group, part);
  return group;
}

/** 亀頭・冠状縁・尿道口 */
export function buildGlans(rig: BodyRig, part: PartState, shaft: PartState, quality: 'high' | 'low'): THREE.Group {
  const group = new THREE.Group();
  const m = part.morph;
  const sm = shaft.morph;
  const o = maleOrigin(rig);
  const len = 0.085 * rig.height * (sm.length ?? 1);
  const gT = 0.0105 * rig.height * (sm.girthTip ?? 1);
  const size = m.size ?? 1;
  const glansLen = 0.02 * rig.height * (m.length ?? 1) * size;
  const flare = m.coronaFlare ?? 1;
  const angle = THREE.MathUtils.degToRad(sm.angle ?? 0);

  // 亀頭基部は陰茎先端（近似：湾曲を含む先端位置を再計算せず、先端方向へ延長）
  const base = new THREE.Vector3(o.x, o.y - Math.sin(angle) * 0.8 * len, o.z + Math.cos(angle) * len);
  const dir = new THREE.Vector3(0, -Math.sin(angle) * 0.8, Math.cos(angle)).normalize();

  const sections: Section[] = [];
  const groove = m.coronaGroove ?? 0.4;
  const nSeg = quality === 'high' ? 12 : 6;
  for (let i = 0; i <= nSeg; i++) {
    const t = i / nSeg;
    // 冠状縁で張り出し、先端で窄む鐘形
    const bell = Math.sin(Math.PI * Math.min(1, 0.15 + t * 0.85));
    const r = gT * (1 + bell * 0.35 * flare) * size * (t > 0.9 ? 1 - (t - 0.9) * groove : 1);
    sections.push({ center: base.clone().add(dir.clone().multiplyScalar(t * glansLen)), rx: r, rz: r * 0.94 });
  }
  const mesh = new THREE.Mesh(loftSections(sections, quality === 'high' ? 20 : 10), mucosaMaterial(part.color, 0.45));
  mesh.userData.partId = 'glans';
  group.add(mesh);

  // 尿道口
  const meatus = new THREE.Mesh(
    ellipsoid(0.0016 * rig.height * (m.meatusSize ?? 1), 0.0024 * rig.height * (m.meatusSize ?? 1), 0.0008 * rig.height, 8, 6),
    mucosaMaterial('#7a3d3d', 0.4),
  );
  meatus.position.copy(base.clone().add(dir.clone().multiplyScalar(glansLen + 0.0005)));
  meatus.userData.partId = 'glans';
  group.add(meatus);
  applyTransform(group, part);
  return group;
}

/** 包皮：被覆度に応じて亀頭基部を覆う筒状メッシュ */
export function buildForeskin(rig: BodyRig, part: PartState, shaft: PartState): THREE.Group {
  const group = new THREE.Group();
  const m = part.morph;
  const sm = shaft.morph;
  const cov = m.coverage ?? 0.5;
  if (cov <= 0.02) return group;
  const o = maleOrigin(rig);
  const len = 0.085 * rig.height * (sm.length ?? 1);
  const gT = 0.0105 * rig.height * (sm.girthTip ?? 1);
  const angle = THREE.MathUtils.degToRad(sm.angle ?? 0);
  const base = new THREE.Vector3(o.x, o.y - Math.sin(angle) * 0.8 * len, o.z + Math.cos(angle) * len);
  const dir = new THREE.Vector3(0, -Math.sin(angle) * 0.8, Math.cos(angle)).normalize();

  const coverLen = 0.02 * rig.height * Math.min(1.2, cov);
  const sections: Section[] = [
    { center: base.clone().add(dir.clone().multiplyScalar(-0.004)), rx: gT * 1.08, rz: gT },
    { center: base.clone().add(dir.clone().multiplyScalar(coverLen)), rx: gT * (1.05 - cov * 0.3), rz: gT * (0.98 - cov * 0.25) },
  ];
  const mesh = new THREE.Mesh(loftSections(sections, 14), skinMaterial(part.color, part.roughness));
  mesh.userData.partId = 'foreskin';
  group.add(mesh);
  applyTransform(group, part);
  return group;
}

/** 陰嚢：左右2ローブ、下垂・左右差・しわ */
export function buildScrotum(rig: BodyRig, part: PartState): THREE.Group {
  const group = new THREE.Group();
  const m = part.morph;
  const o = maleOrigin(rig);
  const size = 0.02 * rig.height * (m.size ?? 1);
  const sag = m.sag ?? 0.5;
  const asym = m.asymmetry ?? 0;
  const wrinkle = m.wrinkle ?? 0.4;

  for (const side of [-1, 1]) {
    const drop = sag * 0.012 * rig.height * (side === 1 ? 1 + asym * 0.3 : 1 - asym * 0.3);
    const lobe = new THREE.Mesh(
      ellipsoid(size * 0.55, size * (0.6 + sag * 0.25), size * 0.5, 14, 12),
      skinMaterial(part.color, part.roughness + wrinkle * 0.15),
    );
    lobe.position.set(o.x + side * size * 0.42, o.y - 0.02 * rig.height - drop, o.z + size * 0.15);
    lobe.userData.partId = 'scrotum';
    group.add(lobe);
  }
  applyTransform(group, part);
  return group;
}
