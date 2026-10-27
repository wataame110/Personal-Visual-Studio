// 身体の基準骨格・寸法の計算（身長・体型パラメータから解剖学的アンカーを導出）
import type { BodyGlobals, PartStateMap } from '../core/types';

export interface BodyRig {
  height: number;
  headHeight: number;
  crownY: number;
  chinY: number;
  eyeY: number;
  browY: number;
  noseTipY: number;
  mouthY: number;
  headRadiusX: number;
  headRadiusZ: number;
  neckBaseY: number;
  neckTopY: number;
  neckRadius: number;
  shoulderY: number;
  shoulderHalf: number;
  bustY: number;
  waistY: number;
  hipY: number;
  crotchY: number;
  kneeY: number;
  ankleY: number;
  bustHalfW: number;
  bustHalfD: number;
  waistHalfW: number;
  waistHalfD: number;
  hipHalfW: number;
  hipHalfD: number;
  upperArmLen: number;
  forearmLen: number;
  thighLen: number;
  calfLen: number;
  fatFactor: number;
  globals: BodyGlobals;
}

export function computeRig(globals: BodyGlobals, parts: PartStateMap): BodyRig {
  const H = globals.height;
  const headLen = parts.head?.morph.length ?? 1;
  const headHeight = 0.132 * H * headLen;
  const crownY = H;
  const chinY = H - headHeight;
  const neckLen = 0.055 * H * (parts.neck?.morph.length ?? 1);
  const neckTopY = chinY + headHeight * 0.18;
  const neckBaseY = neckTopY - neckLen;
  const shoulderY = neckBaseY - 0.012 * H;
  const bustY = shoulderY - 0.085 * H;
  const waistY = shoulderY - 0.175 * H;
  const hipY = shoulderY - 0.275 * H;
  const crotchY = hipY - 0.035 * H;
  const kneeY = crotchY * 0.52;
  const ankleY = 0.055 * H;

  const fat = 1 + (globals.bodyFat - 0.4) * 0.55;
  const muscle = globals.muscle;

  const headW = parts.head?.morph.width ?? 1;
  const chestW = parts.chest?.morph.width ?? 1;
  const chestD = parts.chest?.morph.depth ?? 1;
  const waistW = parts.waist?.morph.width ?? 1;
  const waistD = parts.waist?.morph.depth ?? 1;
  const pelvisW = parts.pelvis?.morph.width ?? 1;
  const pelvisD = parts.pelvis?.morph.depth ?? 1;
  const shoulderW = parts.chest?.morph.shoulderWidth ?? 1;
  const abdomenT = parts.abdomen?.morph.thickness ?? 1;

  return {
    height: H,
    headHeight,
    crownY,
    chinY,
    eyeY: chinY + headHeight * 0.55,
    browY: chinY + headHeight * 0.66,
    noseTipY: chinY + headHeight * 0.38,
    mouthY: chinY + headHeight * 0.2,
    headRadiusX: 0.048 * H * headW,
    headRadiusZ: 0.055 * H,
    neckBaseY,
    neckTopY,
    neckRadius: 0.028 * H * (parts.neck?.morph.thickness ?? 1),
    shoulderY,
    shoulderHalf: 0.118 * H * shoulderW,
    bustY,
    waistY,
    hipY,
    crotchY,
    kneeY,
    ankleY,
    bustHalfW: 0.082 * H * chestW * (0.85 + fat * 0.15),
    bustHalfD: 0.055 * H * chestD * fat,
    waistHalfW: 0.068 * H * waistW * (0.8 + fat * 0.2),
    waistHalfD: 0.05 * H * waistD * fat * abdomenT,
    hipHalfW: 0.092 * H * pelvisW * (0.85 + fat * 0.15),
    hipHalfD: 0.06 * H * pelvisD * fat,
    upperArmLen: (shoulderY - 0.03 * H - (shoulderY - 0.19 * H)) * (parts.upperArmL?.morph.length ?? 1) + 0.16 * H,
    forearmLen: 0.155 * H,
    thighLen: crotchY - kneeY,
    calfLen: kneeY - ankleY,
    fatFactor: fat,
    globals,
  };
}
