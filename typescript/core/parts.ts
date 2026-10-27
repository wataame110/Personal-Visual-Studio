// 人体部位ツリーと部位固有パラメータの定義（anatomy モジュール）
import type { PartDef, PartState, PartStateMap, Vec3, Provenance } from './types';

const v0 = (): Vec3 => ({ x: 0, y: 0, z: 0 });
const v1 = (): Vec3 => ({ x: 1, y: 1, z: 1 });

/** 部位定義一覧。id は3Dシーン上のノード名と一致させる。 */
export const PART_DEFS: PartDef[] = [
  // ---- 頭部・顔 ----
  {
    id: 'head',
    label: '頭部・顔全体',
    params: [
      { key: 'width', label: '顔の幅', min: 0.7, max: 1.3, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'length', label: '顔の長さ', min: 0.8, max: 1.25, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'jawWidth', label: '顎・下顎の幅', min: 0.6, max: 1.4, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'chinLength', label: '顎の長さ・突出', min: 0.7, max: 1.5, step: 0.01, defaultValue: 1, level: 'advanced' },
      { key: 'cheek', label: '頬の膨らみ', min: 0.6, max: 1.5, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'temple', label: 'こめかみの幅', min: 0.8, max: 1.2, step: 0.01, defaultValue: 1, level: 'advanced' },
      { key: 'forehead', label: '額の高さ・突出', min: 0.8, max: 1.3, step: 0.01, defaultValue: 1, level: 'advanced' },
      { key: 'cranium', label: '頭蓋の大きさ', min: 0.85, max: 1.2, step: 0.01, defaultValue: 1, level: 'advanced' },
    ],
  },
  {
    id: 'eyeL',
    label: '左目',
    parent: 'head',
    params: [
      { key: 'size', label: '目の大きさ', min: 0.6, max: 1.6, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'width', label: '目の幅', min: 0.7, max: 1.5, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'height', label: '目の開き', min: 0.5, max: 1.6, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'posX', label: '位置（左右）', min: -0.015, max: 0.015, step: 0.0005, defaultValue: 0, level: 'advanced', unit: 'm' },
      { key: 'posY', label: '位置（上下）', min: -0.015, max: 0.015, step: 0.0005, defaultValue: 0, level: 'advanced', unit: 'm' },
      { key: 'tilt', label: '目尻の傾き', min: -15, max: 15, step: 0.5, defaultValue: 0, level: 'basic', unit: '°' },
      { key: 'fold', label: '二重幅', min: 0, max: 1, step: 0.01, defaultValue: 0.4, level: 'basic' },
      { key: 'foldShape', label: 'まぶた形状（並行/末広）', min: 0, max: 1, step: 0.01, defaultValue: 0.5, level: 'advanced' },
    ],
  },
  {
    id: 'eyeR',
    label: '右目',
    parent: 'head',
    params: [
      { key: 'size', label: '目の大きさ', min: 0.6, max: 1.6, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'width', label: '目の幅', min: 0.7, max: 1.5, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'height', label: '目の開き', min: 0.5, max: 1.6, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'posX', label: '位置（左右）', min: -0.015, max: 0.015, step: 0.0005, defaultValue: 0, level: 'advanced', unit: 'm' },
      { key: 'posY', label: '位置（上下）', min: -0.015, max: 0.015, step: 0.0005, defaultValue: 0, level: 'advanced', unit: 'm' },
      { key: 'tilt', label: '目尻の傾き', min: -15, max: 15, step: 0.5, defaultValue: 0, level: 'basic', unit: '°' },
      { key: 'fold', label: '二重幅', min: 0, max: 1, step: 0.01, defaultValue: 0.4, level: 'basic' },
      { key: 'foldShape', label: 'まぶた形状（並行/末広）', min: 0, max: 1, step: 0.01, defaultValue: 0.5, level: 'advanced' },
    ],
  },
  {
    id: 'browL',
    label: '左眉',
    parent: 'head',
    params: [
      { key: 'thickness', label: '眉の太さ', min: 0.4, max: 2, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'length', label: '眉の長さ', min: 0.7, max: 1.4, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'arch', label: '眉のアーチ', min: -1, max: 1, step: 0.01, defaultValue: 0.2, level: 'basic' },
      { key: 'posY', label: '位置（上下）', min: -0.01, max: 0.01, step: 0.0005, defaultValue: 0, level: 'advanced', unit: 'm' },
    ],
  },
  {
    id: 'browR',
    label: '右眉',
    parent: 'head',
    params: [
      { key: 'thickness', label: '眉の太さ', min: 0.4, max: 2, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'length', label: '眉の長さ', min: 0.7, max: 1.4, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'arch', label: '眉のアーチ', min: -1, max: 1, step: 0.01, defaultValue: 0.2, level: 'basic' },
      { key: 'posY', label: '位置（上下）', min: -0.01, max: 0.01, step: 0.0005, defaultValue: 0, level: 'advanced', unit: 'm' },
    ],
  },
  {
    id: 'nose',
    label: '鼻',
    parent: 'head',
    params: [
      { key: 'bridgeHeight', label: '鼻筋の高さ', min: 0.5, max: 1.8, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'bridgeWidth', label: '鼻筋の幅', min: 0.6, max: 1.6, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'rootHeight', label: '鼻根の高さ', min: 0.5, max: 1.8, step: 0.01, defaultValue: 1, level: 'advanced' },
      { key: 'tipSize', label: '鼻先の大きさ', min: 0.6, max: 1.8, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'tipHeight', label: '鼻先の高さ・向き', min: -1, max: 1, step: 0.01, defaultValue: 0, level: 'basic' },
      { key: 'alaeWidth', label: '鼻翼の幅', min: 0.6, max: 1.6, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'length', label: '鼻の長さ', min: 0.8, max: 1.3, step: 0.01, defaultValue: 1, level: 'advanced' },
    ],
  },
  {
    id: 'mouth',
    label: '口・唇',
    parent: 'head',
    params: [
      { key: 'width', label: '口の幅', min: 0.7, max: 1.4, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'upperLip', label: '上唇の厚み', min: 0.4, max: 2, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'lowerLip', label: '下唇の厚み', min: 0.4, max: 2, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'cornerLift', label: '口角の上がり', min: -1, max: 1, step: 0.01, defaultValue: 0, level: 'basic' },
      { key: 'protrusion', label: '口元の突出', min: 0.7, max: 1.5, step: 0.01, defaultValue: 1, level: 'advanced' },
      { key: 'posY', label: '位置（上下）', min: -0.01, max: 0.01, step: 0.0005, defaultValue: 0, level: 'advanced', unit: 'm' },
    ],
  },
  {
    id: 'earL',
    label: '左耳',
    parent: 'head',
    params: [
      { key: 'size', label: '耳の大きさ', min: 0.6, max: 1.6, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'angle', label: '耳の開き角度', min: 0, max: 45, step: 1, defaultValue: 12, level: 'advanced', unit: '°' },
      { key: 'posY', label: '位置（上下）', min: -0.015, max: 0.015, step: 0.0005, defaultValue: 0, level: 'advanced', unit: 'm' },
    ],
  },
  {
    id: 'earR',
    label: '右耳',
    parent: 'head',
    params: [
      { key: 'size', label: '耳の大きさ', min: 0.6, max: 1.6, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'angle', label: '耳の開き角度', min: 0, max: 45, step: 1, defaultValue: 12, level: 'advanced', unit: '°' },
      { key: 'posY', label: '位置（上下）', min: -0.015, max: 0.015, step: 0.0005, defaultValue: 0, level: 'advanced', unit: 'm' },
    ],
  },
  {
    id: 'neck',
    label: '首',
    params: [
      { key: 'length', label: '首の長さ', min: 0.7, max: 1.5, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'thickness', label: '首の太さ', min: 0.7, max: 1.5, step: 0.01, defaultValue: 1, level: 'basic' },
    ],
  },
  // ---- 胴体 ----
  {
    id: 'chest',
    label: '胸郭・胸部',
    params: [
      { key: 'width', label: '胸郭の幅', min: 0.75, max: 1.3, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'depth', label: '胸郭の厚み', min: 0.75, max: 1.35, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'shoulderWidth', label: '肩幅', min: 0.8, max: 1.25, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'shoulderSlope', label: '肩のなで肩度', min: -1, max: 1, step: 0.01, defaultValue: 0, level: 'advanced' },
    ],
  },
  {
    id: 'breastL',
    label: '左乳房',
    parent: 'chest',
    params: [
      { key: 'size', label: '大きさ', min: 0, max: 2.2, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'width', label: '幅', min: 0.7, max: 1.5, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'height', label: '上下の長さ', min: 0.7, max: 1.5, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'projection', label: '突出度', min: 0.5, max: 2, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'sag', label: '下垂', min: 0, max: 1, step: 0.01, defaultValue: 0.2, level: 'basic' },
      { key: 'posX', label: '位置（左右・離隔）', min: -0.03, max: 0.03, step: 0.0005, defaultValue: 0, level: 'advanced', unit: 'm' },
      { key: 'posY', label: '位置（上下）', min: -0.04, max: 0.04, step: 0.0005, defaultValue: 0, level: 'basic', unit: 'm' },
      { key: 'nippleSize', label: '乳頭の大きさ', min: 0.5, max: 2, step: 0.01, defaultValue: 1, level: 'advanced' },
      { key: 'nippleProjection', label: '乳頭の突出', min: 0.3, max: 2, step: 0.01, defaultValue: 1, level: 'advanced' },
      { key: 'nipplePosY', label: '乳頭の位置', min: -0.02, max: 0.02, step: 0.0005, defaultValue: 0, level: 'advanced', unit: 'm' },
      { key: 'areolaSize', label: '乳輪の大きさ', min: 0.5, max: 2.2, step: 0.01, defaultValue: 1, level: 'advanced' },
    ],
  },
  {
    id: 'breastR',
    label: '右乳房',
    parent: 'chest',
    params: [
      { key: 'size', label: '大きさ', min: 0, max: 2.2, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'width', label: '幅', min: 0.7, max: 1.5, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'height', label: '上下の長さ', min: 0.7, max: 1.5, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'projection', label: '突出度', min: 0.5, max: 2, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'sag', label: '下垂', min: 0, max: 1, step: 0.01, defaultValue: 0.2, level: 'basic' },
      { key: 'posX', label: '位置（左右・離隔）', min: -0.03, max: 0.03, step: 0.0005, defaultValue: 0, level: 'advanced', unit: 'm' },
      { key: 'posY', label: '位置（上下）', min: -0.04, max: 0.04, step: 0.0005, defaultValue: 0, level: 'basic', unit: 'm' },
      { key: 'nippleSize', label: '乳頭の大きさ', min: 0.5, max: 2, step: 0.01, defaultValue: 1, level: 'advanced' },
      { key: 'nippleProjection', label: '乳頭の突出', min: 0.3, max: 2, step: 0.01, defaultValue: 1, level: 'advanced' },
      { key: 'nipplePosY', label: '乳頭の位置', min: -0.02, max: 0.02, step: 0.0005, defaultValue: 0, level: 'advanced', unit: 'm' },
      { key: 'areolaSize', label: '乳輪の大きさ', min: 0.5, max: 2.2, step: 0.01, defaultValue: 1, level: 'advanced' },
    ],
  },
  {
    id: 'abdomen',
    label: '腹部',
    params: [
      { key: 'thickness', label: '腹部の厚み', min: 0.7, max: 1.6, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'bulge', label: '腹部の膨らみ', min: 0.5, max: 1.8, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'tone', label: '腹筋の輪郭', min: 0, max: 1, step: 0.01, defaultValue: 0.2, level: 'advanced' },
    ],
  },
  {
    id: 'waist',
    label: '腰部',
    params: [
      { key: 'width', label: '腰の幅（くびれ）', min: 0.7, max: 1.35, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'depth', label: '腰の厚み', min: 0.7, max: 1.4, step: 0.01, defaultValue: 1, level: 'advanced' },
    ],
  },
  {
    id: 'pelvis',
    label: '骨盤・臀部',
    params: [
      { key: 'width', label: '骨盤・ヒップの幅', min: 0.75, max: 1.35, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'depth', label: 'ヒップの厚み', min: 0.75, max: 1.4, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'buttProjection', label: '臀部の突出', min: 0.5, max: 1.8, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'buttLift', label: '臀部の位置（上下）', min: -1, max: 1, step: 0.01, defaultValue: 0, level: 'advanced' },
    ],
  },
  // ---- 腕（左右独立） ----
  {
    id: 'upperArmL',
    label: '左上腕',
    params: [
      { key: 'thickness', label: '太さ', min: 0.6, max: 1.7, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'length', label: '長さ', min: 0.85, max: 1.2, step: 0.01, defaultValue: 1, level: 'advanced' },
      { key: 'muscle', label: '筋肉の輪郭', min: 0, max: 1, step: 0.01, defaultValue: 0.2, level: 'advanced' },
    ],
  },
  {
    id: 'upperArmR',
    label: '右上腕',
    params: [
      { key: 'thickness', label: '太さ', min: 0.6, max: 1.7, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'length', label: '長さ', min: 0.85, max: 1.2, step: 0.01, defaultValue: 1, level: 'advanced' },
      { key: 'muscle', label: '筋肉の輪郭', min: 0, max: 1, step: 0.01, defaultValue: 0.2, level: 'advanced' },
    ],
  },
  {
    id: 'forearmL',
    label: '左前腕',
    parent: 'upperArmL',
    params: [
      { key: 'thickness', label: '太さ', min: 0.6, max: 1.6, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'length', label: '長さ', min: 0.85, max: 1.2, step: 0.01, defaultValue: 1, level: 'advanced' },
    ],
  },
  {
    id: 'forearmR',
    label: '右前腕',
    parent: 'upperArmR',
    params: [
      { key: 'thickness', label: '太さ', min: 0.6, max: 1.6, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'length', label: '長さ', min: 0.85, max: 1.2, step: 0.01, defaultValue: 1, level: 'advanced' },
    ],
  },
  {
    id: 'handL',
    label: '左手',
    parent: 'forearmL',
    params: [{ key: 'size', label: '手の大きさ', min: 0.7, max: 1.5, step: 0.01, defaultValue: 1, level: 'basic' }],
  },
  {
    id: 'handR',
    label: '右手',
    parent: 'forearmR',
    params: [{ key: 'size', label: '手の大きさ', min: 0.7, max: 1.5, step: 0.01, defaultValue: 1, level: 'basic' }],
  },
  // ---- 脚（左右独立） ----
  {
    id: 'thighL',
    label: '左大腿',
    params: [
      { key: 'thickness', label: '太さ', min: 0.6, max: 1.8, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'length', label: '長さ', min: 0.85, max: 1.2, step: 0.01, defaultValue: 1, level: 'advanced' },
      { key: 'muscle', label: '筋肉の輪郭', min: 0, max: 1, step: 0.01, defaultValue: 0.2, level: 'advanced' },
    ],
  },
  {
    id: 'thighR',
    label: '右大腿',
    params: [
      { key: 'thickness', label: '太さ', min: 0.6, max: 1.8, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'length', label: '長さ', min: 0.85, max: 1.2, step: 0.01, defaultValue: 1, level: 'advanced' },
      { key: 'muscle', label: '筋肉の輪郭', min: 0, max: 1, step: 0.01, defaultValue: 0.2, level: 'advanced' },
    ],
  },
  {
    id: 'calfL',
    label: '左下腿',
    parent: 'thighL',
    params: [
      { key: 'thickness', label: '太さ', min: 0.6, max: 1.7, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'length', label: '長さ', min: 0.85, max: 1.2, step: 0.01, defaultValue: 1, level: 'advanced' },
    ],
  },
  {
    id: 'calfR',
    label: '右下腿',
    parent: 'thighR',
    params: [
      { key: 'thickness', label: '太さ', min: 0.6, max: 1.7, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'length', label: '長さ', min: 0.85, max: 1.2, step: 0.01, defaultValue: 1, level: 'advanced' },
    ],
  },
  {
    id: 'footL',
    label: '左足',
    parent: 'calfL',
    params: [{ key: 'size', label: '足の大きさ', min: 0.7, max: 1.5, step: 0.01, defaultValue: 1, level: 'basic' }],
  },
  {
    id: 'footR',
    label: '右足',
    parent: 'calfR',
    params: [{ key: 'size', label: '足の大きさ', min: 0.7, max: 1.5, step: 0.01, defaultValue: 1, level: 'basic' }],
  },
  // ---- 医療モード：女性外性器 ----
  {
    id: 'monsPubis',
    label: '恥丘',
    medicalOnly: true,
    params: [
      { key: 'size', label: '大きさ', min: 0.6, max: 1.8, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'height', label: '膨らみ・突出', min: 0.5, max: 1.8, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'width', label: '幅', min: 0.7, max: 1.4, step: 0.01, defaultValue: 1, level: 'advanced' },
      { key: 'posY', label: '位置（上下）', min: -0.02, max: 0.02, step: 0.0005, defaultValue: 0, level: 'advanced', unit: 'm' },
    ],
  },
  {
    id: 'clitoralGlans',
    label: '陰核亀頭',
    medicalOnly: true,
    params: [
      { key: 'size', label: '大きさ', min: 0.5, max: 2.5, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'protrusion', label: '突出度', min: 0.3, max: 2, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'posY', label: '位置（上下）', min: -0.01, max: 0.01, step: 0.0005, defaultValue: 0, level: 'advanced', unit: 'm' },
    ],
  },
  {
    id: 'clitoralHood',
    label: '陰核包皮',
    medicalOnly: true,
    params: [
      { key: 'coverage', label: '被覆度', min: 0, max: 1.5, step: 0.01, defaultValue: 0.8, level: 'basic' },
      { key: 'thickness', label: '厚み', min: 0.5, max: 2, step: 0.01, defaultValue: 1, level: 'advanced' },
    ],
  },
  {
    id: 'labiaMajoraL',
    label: '左大陰唇',
    medicalOnly: true,
    params: [
      { key: 'length', label: '長さ', min: 0.7, max: 1.4, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'width', label: '幅', min: 0.6, max: 1.6, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'fullness', label: '膨らみ・厚み', min: 0.4, max: 2, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'posX', label: '位置（左右）', min: -0.015, max: 0.015, step: 0.0005, defaultValue: 0, level: 'advanced', unit: 'm' },
      { key: 'tilt', label: '傾斜', min: -20, max: 20, step: 0.5, defaultValue: 0, level: 'advanced', unit: '°' },
    ],
  },
  {
    id: 'labiaMajoraR',
    label: '右大陰唇',
    medicalOnly: true,
    params: [
      { key: 'length', label: '長さ', min: 0.7, max: 1.4, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'width', label: '幅', min: 0.6, max: 1.6, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'fullness', label: '膨らみ・厚み', min: 0.4, max: 2, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'posX', label: '位置（左右）', min: -0.015, max: 0.015, step: 0.0005, defaultValue: 0, level: 'advanced', unit: 'm' },
      { key: 'tilt', label: '傾斜', min: -20, max: 20, step: 0.5, defaultValue: 0, level: 'advanced', unit: '°' },
    ],
  },
  {
    id: 'labiaMinoraL',
    label: '左小陰唇',
    medicalOnly: true,
    params: [
      { key: 'length', label: '長さ', min: 0.5, max: 1.8, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'width', label: '幅（はみ出し）', min: 0, max: 2, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'protrusion', label: '突出度', min: 0, max: 2, step: 0.01, defaultValue: 0.6, level: 'basic' },
      { key: 'edgeCurve', label: '縁の曲線', min: 0, max: 1, step: 0.01, defaultValue: 0.5, level: 'advanced' },
      { key: 'folds', label: 'ひだの強さ', min: 0, max: 1, step: 0.01, defaultValue: 0.3, level: 'advanced' },
      { key: 'posX', label: '位置（左右）', min: -0.01, max: 0.01, step: 0.0005, defaultValue: 0, level: 'advanced', unit: 'm' },
    ],
  },
  {
    id: 'labiaMinoraR',
    label: '右小陰唇',
    medicalOnly: true,
    params: [
      { key: 'length', label: '長さ', min: 0.5, max: 1.8, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'width', label: '幅（はみ出し）', min: 0, max: 2, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'protrusion', label: '突出度', min: 0, max: 2, step: 0.01, defaultValue: 0.6, level: 'basic' },
      { key: 'edgeCurve', label: '縁の曲線', min: 0, max: 1, step: 0.01, defaultValue: 0.5, level: 'advanced' },
      { key: 'folds', label: 'ひだの強さ', min: 0, max: 1, step: 0.01, defaultValue: 0.3, level: 'advanced' },
      { key: 'posX', label: '位置（左右）', min: -0.01, max: 0.01, step: 0.0005, defaultValue: 0, level: 'advanced', unit: 'm' },
    ],
  },
  {
    id: 'vestibule',
    label: '外陰前庭・尿道口・膣口',
    medicalOnly: true,
    params: [
      { key: 'urethraPosY', label: '尿道口の位置', min: -0.008, max: 0.008, step: 0.0002, defaultValue: 0, level: 'advanced', unit: 'm' },
      { key: 'vaginalOpening', label: '膣口の大きさ', min: 0.5, max: 1.8, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'vaginalPosY', label: '膣口の位置', min: -0.008, max: 0.008, step: 0.0002, defaultValue: 0, level: 'advanced', unit: 'm' },
      { key: 'perineumLength', label: '会陰の長さ', min: 0.7, max: 1.5, step: 0.01, defaultValue: 1, level: 'advanced' },
      { key: 'colorUnevenness', label: '色むら', min: 0, max: 1, step: 0.01, defaultValue: 0.3, level: 'advanced' },
    ],
  },
  // ---- 医療モード：男性外性器 ----
  {
    id: 'penisShaft',
    label: '陰茎体',
    medicalOnly: true,
    params: [
      { key: 'length', label: '長さ', min: 0.6, max: 1.8, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'girthBase', label: '基部の太さ', min: 0.6, max: 1.8, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'girthMid', label: '中央部の太さ', min: 0.6, max: 1.8, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'girthTip', label: '先端側の太さ', min: 0.6, max: 1.8, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'curveLR', label: '湾曲（左右）', min: -45, max: 45, step: 0.5, defaultValue: 0, level: 'basic', unit: '°' },
      { key: 'curveUD', label: '湾曲（上下）', min: -45, max: 45, step: 0.5, defaultValue: 0, level: 'basic', unit: '°' },
      { key: 'curveStart', label: '湾曲開始位置', min: 0, max: 1, step: 0.01, defaultValue: 0.3, level: 'advanced' },
      { key: 'curveRange', label: '湾曲範囲', min: 0.1, max: 1, step: 0.01, defaultValue: 0.7, level: 'advanced' },
      { key: 'bend', label: '局所的な屈曲', min: -30, max: 30, step: 0.5, defaultValue: 0, level: 'advanced', unit: '°' },
      { key: 'angle', label: '全体の角度（参考）', min: -45, max: 90, step: 1, defaultValue: 0, level: 'basic', unit: '°' },
      { key: 'skinWrinkle', label: '皮膚のしわ', min: 0, max: 1, step: 0.01, defaultValue: 0.3, level: 'advanced' },
    ],
  },
  {
    id: 'glans',
    label: '亀頭・冠状縁',
    medicalOnly: true,
    params: [
      { key: 'size', label: '亀頭の大きさ', min: 0.6, max: 1.8, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'length', label: '亀頭の長さ', min: 0.7, max: 1.5, step: 0.01, defaultValue: 1, level: 'advanced' },
      { key: 'coronaFlare', label: '冠状縁の張り出し', min: 0.5, max: 1.8, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'coronaGroove', label: '冠状溝の深さ', min: 0, max: 1, step: 0.01, defaultValue: 0.4, level: 'advanced' },
      { key: 'meatusSize', label: '尿道口の大きさ', min: 0.5, max: 1.8, step: 0.01, defaultValue: 1, level: 'advanced' },
    ],
  },
  {
    id: 'foreskin',
    label: '包皮・包皮小帯',
    medicalOnly: true,
    params: [
      { key: 'coverage', label: '包皮の被覆度', min: 0, max: 1.5, step: 0.01, defaultValue: 0.5, level: 'basic' },
      { key: 'frenulum', label: '包皮小帯の張り', min: 0, max: 1, step: 0.01, defaultValue: 0.5, level: 'advanced' },
    ],
  },
  {
    id: 'scrotum',
    label: '陰嚢',
    medicalOnly: true,
    params: [
      { key: 'size', label: '大きさ', min: 0.6, max: 1.8, step: 0.01, defaultValue: 1, level: 'basic' },
      { key: 'sag', label: '下垂度', min: 0, max: 1.5, step: 0.01, defaultValue: 0.5, level: 'basic' },
      { key: 'asymmetry', label: '左右差', min: -1, max: 1, step: 0.01, defaultValue: 0, level: 'advanced' },
      { key: 'wrinkle', label: '皮膚のしわ', min: 0, max: 1, step: 0.01, defaultValue: 0.4, level: 'advanced' },
    ],
  },
];

export const PART_DEF_MAP: Record<string, PartDef> = Object.fromEntries(PART_DEFS.map((d) => [d.id, d]));

const SKIN_DEFAULT = '#e8b89a';
const MUCOSA_DEFAULT = '#c97b7b';

/** 部位の初期状態を生成する */
export function createDefaultPartState(def: PartDef): PartState {
  const morph: Record<string, number> = {};
  const provenance: Record<string, Provenance> = {};
  for (const p of def.params) {
    morph[p.key] = p.defaultValue;
    provenance[p.key] = 'estimated';
  }
  const isMucosa =
    ['clitoralGlans', 'labiaMinoraL', 'labiaMinoraR', 'vestibule', 'glans'].includes(def.id);
  return {
    visible: true,
    locked: false,
    offset: v0(),
    rotation: v0(),
    scale: v1(),
    morph,
    color: isMucosa ? MUCOSA_DEFAULT : SKIN_DEFAULT,
    color2: '#b0715a', // 乳輪・陰唇等のサブ色
    roughness: 0.75,
    provenance,
  };
}

export function createDefaultParts(): PartStateMap {
  const map: PartStateMap = {};
  for (const def of PART_DEFS) map[def.id] = createDefaultPartState(def);
  return map;
}

/** ツリー表示用の並び順（定義順を維持） */
export const PART_ORDER = PART_DEFS.map((d) => d.id);
