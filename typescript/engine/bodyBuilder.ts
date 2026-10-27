// 全身モデルの組み立て（すべての部位ビルダーを統合）
import * as THREE from 'three';
import { computeRig, type BodyRig } from './rig';
import { buildTorso, buildBreast } from './parts/torso';
import { buildHead, buildEye, buildBrow, buildNose, buildMouth, buildEar } from './parts/head';
import { buildArm, buildLeg } from './parts/limbs';
import {
  buildMonsPubis,
  buildClitoris,
  buildLabiaMajora,
  buildLabiaMinora,
  buildVestibule,
  buildPenisShaft,
  buildGlans,
  buildForeskin,
  buildScrotum,
} from './parts/genitals';
import { buildHair } from './parts/hair';
import { buildGarment, buildFallbackGarment, buildGlasses, buildAccessory } from './parts/clothing';
import { ellipsoid } from './geometry';
import type { PartStateMap, BodyGlobals, HairConfig, ClothingState, HairRemovalDesign } from '../core/types';

export interface BuildOptions {
  parts: PartStateMap;
  globals: BodyGlobals;
  hair: HairConfig;
  clothing: ClothingState;
  medicalMode: boolean;
  quality: 'high' | 'low';
  hairRemoval?: HairRemovalDesign[];
}

/** パラメータから全身の3Dモデルを生成する。 */
export function buildBody(opts: BuildOptions): THREE.Group {
  const { parts, globals, hair, clothing, medicalMode, quality } = opts;
  const root = new THREE.Group();
  root.name = 'bodyRoot';
  const rig = computeRig(globals, parts);

  const visible = (id: string) => parts[id]?.visible !== false;

  // 胴体（胸部・腹部・腰部・骨盤・首を含む）
  root.add(buildTorso(rig, parts, quality));

  // 乳房（左右独立・医療モードまたは非着衣時に表示）
  if (medicalMode || !clothing.garments.some((g) => g.visible && (g.kind === 'tops' || g.kind === 'dress' || g.kind === 'outer'))) {
    if (visible('breastL')) root.add(buildBreast(rig, parts.breastL, 1, quality));
    if (visible('breastR')) root.add(buildBreast(rig, parts.breastR, -1, quality));
  }

  // 頭部・顔
  root.add(buildHead(rig, parts.head, quality));
  if (visible('eyeL')) root.add(buildEye(rig, parts.head, parts.eyeL, 1));
  if (visible('eyeR')) root.add(buildEye(rig, parts.head, parts.eyeR, -1));
  if (visible('browL')) root.add(buildBrow(rig, parts.head, parts.browL, 1));
  if (visible('browR')) root.add(buildBrow(rig, parts.head, parts.browR, -1));
  root.add(buildNose(rig, parts.head, parts.nose));
  root.add(buildMouth(rig, parts.head, parts.mouth));
  if (visible('earL')) root.add(buildEar(rig, parts.head, parts.earL, 1));
  if (visible('earR')) root.add(buildEar(rig, parts.head, parts.earR, -1));

  // 四肢（左右独立）
  root.add(buildArm(rig, parts.upperArmL, parts.forearmL, parts.handL, 1, quality));
  root.add(buildArm(rig, parts.upperArmR, parts.forearmR, parts.handR, -1, quality));
  root.add(buildLeg(rig, parts.thighL, parts.calfL, parts.footL, 1, quality));
  root.add(buildLeg(rig, parts.thighR, parts.calfR, parts.footR, -1, quality));

  // 医療モードの外性器（着衣時は衣服に隠れる）
  if (medicalMode) {
    const sex = globals.sex;
    if (sex === 'female' || sex === 'custom') {
      if (visible('monsPubis')) root.add(buildMonsPubis(rig, parts.monsPubis));
      root.add(buildClitoris(rig, parts.clitoralGlans, parts.clitoralHood));
      if (visible('labiaMajoraL')) root.add(buildLabiaMajora(rig, parts.labiaMajoraL, 1));
      if (visible('labiaMajoraR')) root.add(buildLabiaMajora(rig, parts.labiaMajoraR, -1));
      if (visible('labiaMinoraL')) root.add(buildLabiaMinora(rig, parts.labiaMinoraL, 1));
      if (visible('labiaMinoraR')) root.add(buildLabiaMinora(rig, parts.labiaMinoraR, -1));
      root.add(buildVestibule(rig, parts.vestibule));
    }
    if (sex === 'male' || sex === 'custom') {
      if (visible('penisShaft')) root.add(buildPenisShaft(rig, parts.penisShaft, quality));
      root.add(buildGlans(rig, parts.glans, parts.penisShaft, quality));
      root.add(buildForeskin(rig, parts.foreskin, parts.penisShaft));
      if (visible('scrotum')) root.add(buildScrotum(rig, parts.scrotum));
    }
  }

  // 体毛・脱毛デザイン（領域ごとの簡易オーバーレイ）
  if (medicalMode && opts.hairRemoval) {
    for (const hd of opts.hairRemoval) {
      if (hd.density <= 0.02) continue;
      const patch = buildHairPatch(rig, hd);
      if (patch) root.add(patch);
    }
  }

  // 髪
  root.add(buildHair(rig, hair, quality));

  // 衣服（生成失敗時は無地のフォールバック衣服で再試行し、一般モードで裸体にならないようにする）
  for (const g of clothing.garments) {
    try {
      root.add(buildGarment(rig, g, quality));
    } catch {
      if (g.visible) {
        try {
          root.add(buildFallbackGarment(rig, g, quality));
        } catch {
          // フォールバックも失敗した場合は当該衣服のみスキップ（以降の部位生成は継続）
        }
      }
    }
  }
  root.add(buildGlasses(rig, clothing.glasses));
  for (const a of clothing.accessories) root.add(buildAccessory(rig, a.kind, a.visible, a.color));

  return root;
}

/** 体毛領域の簡易表現：密度に応じた半透明パッチ（毛1本1本の描画ではない） */
function buildHairPatch(rig: BodyRig, hd: HairRemovalDesign): THREE.Mesh | null {
  if (hd.region === 'pubic') {
    const w = 0.05 * rig.height * Math.max(0.05, hd.keepRight - hd.keepLeft);
    const h = 0.045 * rig.height * Math.max(0.05, hd.keepTop - hd.keepBottom);
    if (w <= 0.001 || h <= 0.001) return null;
    const cx = ((hd.keepLeft + hd.keepRight) / 2 - 0.5) * 0.06 * rig.height;
    const cy = rig.crotchY + 0.03 + ((hd.keepTop + hd.keepBottom) / 2 - 0.5) * 0.05 * rig.height;
    const geo = ellipsoid(w, h, 0.006 * rig.height * hd.length + 0.002, 16, 12);
    const mat = new THREE.MeshStandardMaterial({
      color: hd.color,
      roughness: 1,
      transparent: true,
      opacity: Math.min(0.95, hd.density),
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cx, cy, rig.hipHalfD * 0.5);
    mesh.rotation.x = -0.3;
    mesh.userData.partId = 'hairPatch-pubic';
    mesh.name = 'hairPatch-pubic';
    return mesh;
  }
  return null;
}
