// ポーズプリセットデータベース
// 一般的なポーズからスポーツ・ダンス・医療体位・性的体位まで網羅
//
// 角度は絶対角度（度）: 0=右, 90=下, ±180=左, -90=上（画面座標 y下向き正）。
// 関節の角度は「親関節からその関節への骨の向き」を表す。
// 例: KNEE_L=90 は大腿が真下、KNEE_L=0 は大腿が真右（水平）。

import type { Pose, PoseCategory } from './types';
import { JOINT_IDS } from './skeleton';

const FRONT = { azimuth: 0, elevation: 0, distance: 1 };
const SIDE = { azimuth: 90, elevation: 0, distance: 1 };
const BACK = { azimuth: 180, elevation: 0, distance: 1 };
const DIAG = { azimuth: 45, elevation: 0, distance: 1 };

export const POSES: Pose[] = [
  // ========== 立ちポーズ ==========
  {
    id: 'stand-front',
    label: '直立（正面）',
    category: 'standing',
    jointAngles: {},
    camera: FRONT,
  },
  {
    id: 'stand-side',
    label: '直立（側面）',
    category: 'standing',
    jointAngles: {},
    camera: SIDE,
  },
  {
    id: 'stand-back',
    label: '直立（背面）',
    category: 'standing',
    jointAngles: {},
    camera: BACK,
  },
  {
    id: 'stand-relaxed',
    label: 'リラックス立ち',
    category: 'standing',
    jointAngles: {
      [JOINT_IDS.SPINE]: -86,
      [JOINT_IDS.ELBOW_L]: 100,
      [JOINT_IDS.ELBOW_R]: 80,
      [JOINT_IDS.KNEE_L]: 94,
      [JOINT_IDS.KNEE_R]: 86,
    },
    camera: FRONT,
  },
  {
    id: 'stand-hips',
    label: '腰に手を当てる',
    category: 'standing',
    jointAngles: {
      [JOINT_IDS.ELBOW_L]: 140,
      [JOINT_IDS.ELBOW_R]: 40,
      [JOINT_IDS.WRIST_L]: 45,
      [JOINT_IDS.WRIST_R]: 135,
      [JOINT_IDS.HAND_L]: 45,
      [JOINT_IDS.HAND_R]: 135,
    },
    camera: FRONT,
  },
  {
    id: 'stand-crossed-arms',
    label: '腕組み',
    category: 'standing',
    jointAngles: {
      [JOINT_IDS.ELBOW_L]: 125,
      [JOINT_IDS.ELBOW_R]: 55,
      [JOINT_IDS.WRIST_L]: 15,
      [JOINT_IDS.WRIST_R]: 165,
      [JOINT_IDS.HAND_L]: 15,
      [JOINT_IDS.HAND_R]: 165,
    },
    camera: FRONT,
  },
  {
    id: 'stand-akimbo',
    label: '腰に手を当てて自信ありげ',
    category: 'standing',
    jointAngles: {
      [JOINT_IDS.SPINE]: -92,
      [JOINT_IDS.HEAD]: -95,
      [JOINT_IDS.ELBOW_L]: 145,
      [JOINT_IDS.ELBOW_R]: 35,
      [JOINT_IDS.WRIST_L]: 50,
      [JOINT_IDS.WRIST_R]: 130,
      [JOINT_IDS.HAND_L]: 50,
      [JOINT_IDS.HAND_R]: 130,
      [JOINT_IDS.KNEE_L]: 96,
      [JOINT_IDS.KNEE_R]: 84,
    },
    camera: FRONT,
  },

  // ========== ジェスチャー ==========
  {
    id: 'stand-wave',
    label: '手を振る',
    category: 'gesture',
    jointAngles: {
      [JOINT_IDS.ELBOW_R]: -70,
      [JOINT_IDS.WRIST_R]: -105,
      [JOINT_IDS.HAND_R]: -90,
    },
    camera: FRONT,
  },
  {
    id: 'stand-peace',
    label: 'ピースサイン',
    category: 'gesture',
    jointAngles: {
      [JOINT_IDS.ELBOW_R]: -55,
      [JOINT_IDS.WRIST_R]: -100,
      [JOINT_IDS.HAND_R]: -90,
      [JOINT_IDS.HEAD]: -85,
    },
    camera: FRONT,
  },
  {
    id: 'stand-thumbs-up',
    label: 'サムズアップ',
    category: 'gesture',
    jointAngles: {
      [JOINT_IDS.ELBOW_R]: -15,
      [JOINT_IDS.WRIST_R]: -80,
      [JOINT_IDS.HAND_R]: -80,
    },
    camera: FRONT,
  },
  {
    id: 'stand-point',
    label: '指を指す',
    category: 'gesture',
    jointAngles: {
      [JOINT_IDS.ELBOW_R]: -5,
      [JOINT_IDS.WRIST_R]: -5,
      [JOINT_IDS.HAND_R]: -5,
    },
    camera: FRONT,
  },

  // ========== 座りポーズ ==========
  {
    id: 'sit-chair',
    label: '椅子に座る',
    category: 'sitting',
    jointAngles: {
      // 大腿はやや外に開いて水平近く、下腿は真下
      [JOINT_IDS.KNEE_L]: 115,
      [JOINT_IDS.KNEE_R]: 65,
      [JOINT_IDS.ANKLE_L]: 92,
      [JOINT_IDS.ANKLE_R]: 88,
      [JOINT_IDS.FOOT_L]: 65,
      [JOINT_IDS.FOOT_R]: 115,
    },
    camera: FRONT,
  },
  {
    id: 'sit-cross-legged',
    label: 'あぐら',
    category: 'sitting',
    jointAngles: {
      // 膝を大きく開いて水平、下腿を内側に折る
      [JOINT_IDS.KNEE_L]: 155,
      [JOINT_IDS.KNEE_R]: 25,
      [JOINT_IDS.ANKLE_L]: 35,
      [JOINT_IDS.ANKLE_R]: 145,
      [JOINT_IDS.FOOT_L]: 20,
      [JOINT_IDS.FOOT_R]: 160,
    },
    camera: FRONT,
  },
  {
    id: 'sit-seiza',
    label: '正座',
    category: 'sitting',
    jointAngles: {
      // 太腿は真下、下腿は後ろに折り畳む（正面からは足先が覗く）
      [JOINT_IDS.KNEE_L]: 93,
      [JOINT_IDS.KNEE_R]: 87,
      [JOINT_IDS.ANKLE_L]: 175,
      [JOINT_IDS.ANKLE_R]: 5,
      [JOINT_IDS.FOOT_L]: 175,
      [JOINT_IDS.FOOT_R]: 5,
    },
    camera: FRONT,
  },
  {
    id: 'sit-side',
    label: '横座り',
    category: 'sitting',
    jointAngles: {
      [JOINT_IDS.KNEE_L]: 135,
      [JOINT_IDS.KNEE_R]: 100,
      [JOINT_IDS.ANKLE_L]: 150,
      [JOINT_IDS.ANKLE_R]: 120,
      [JOINT_IDS.SPINE]: -84,
      [JOINT_IDS.HEAD]: -88,
    },
    camera: DIAG,
  },
  {
    id: 'sit-relaxed',
    label: 'リラックス座り',
    category: 'sitting',
    jointAngles: {
      [JOINT_IDS.KNEE_L]: 110,
      [JOINT_IDS.KNEE_R]: 70,
      [JOINT_IDS.ANKLE_L]: 95,
      [JOINT_IDS.ANKLE_R]: 85,
      [JOINT_IDS.SPINE]: -78,
      [JOINT_IDS.NECK]: -82,
      [JOINT_IDS.HEAD]: -80,
    },
    camera: FRONT,
  },

  // ========== 歩き・走り ==========
  {
    id: 'walk-front',
    label: '歩行（正面）',
    category: 'walking',
    jointAngles: {
      [JOINT_IDS.KNEE_L]: 75,
      [JOINT_IDS.KNEE_R]: 105,
      [JOINT_IDS.ANKLE_L]: 85,
      [JOINT_IDS.ANKLE_R]: 100,
      [JOINT_IDS.ELBOW_L]: 80,
      [JOINT_IDS.ELBOW_R]: 100,
      [JOINT_IDS.WRIST_L]: 85,
      [JOINT_IDS.WRIST_R]: 95,
    },
    camera: FRONT,
  },
  {
    id: 'walk-side',
    label: '歩行（側面）',
    category: 'walking',
    jointAngles: {
      [JOINT_IDS.KNEE_L]: 60,
      [JOINT_IDS.KNEE_R]: 118,
      [JOINT_IDS.ANKLE_L]: 80,
      [JOINT_IDS.ANKLE_R]: 100,
      [JOINT_IDS.ELBOW_L]: 72,
      [JOINT_IDS.ELBOW_R]: 108,
      [JOINT_IDS.SPINE]: -87,
    },
    camera: SIDE,
  },
  {
    id: 'run-front',
    label: '走行（正面）',
    category: 'running',
    jointAngles: {
      // 前脚を伸ばし、後脚は蹴り上げ。腕は大きく振る
      [JOINT_IDS.KNEE_L]: 55,
      [JOINT_IDS.ANKLE_L]: 90,
      [JOINT_IDS.KNEE_R]: 125,
      [JOINT_IDS.ANKLE_R]: 55,
      [JOINT_IDS.FOOT_R]: 30,
      [JOINT_IDS.ELBOW_L]: 65,
      [JOINT_IDS.WRIST_L]: 115,
      [JOINT_IDS.ELBOW_R]: 115,
      [JOINT_IDS.WRIST_R]: 65,
      [JOINT_IDS.SPINE]: -82,
    },
    camera: FRONT,
  },
  {
    id: 'run-side',
    label: '走行（側面）',
    category: 'running',
    jointAngles: {
      [JOINT_IDS.KNEE_L]: 45,
      [JOINT_IDS.ANKLE_L]: 95,
      [JOINT_IDS.KNEE_R]: 130,
      [JOINT_IDS.ANKLE_R]: 50,
      [JOINT_IDS.ELBOW_L]: 60,
      [JOINT_IDS.WRIST_L]: 115,
      [JOINT_IDS.ELBOW_R]: 120,
      [JOINT_IDS.WRIST_R]: 60,
      [JOINT_IDS.SPINE]: -78,
      [JOINT_IDS.HEAD]: -85,
    },
    camera: SIDE,
  },

  // ========== 横になる ==========
  // 体幹を水平（頭が左・足が右）にし、腕は体に沿わせる
  {
    id: 'lie-back',
    label: '仰向け',
    category: 'lying',
    jointAngles: {
      [JOINT_IDS.SPINE]: 180,
      [JOINT_IDS.CHEST]: 180,
      [JOINT_IDS.NECK]: 180,
      [JOINT_IDS.HEAD]: 180,
      [JOINT_IDS.SHOULDER_L]: 95,
      [JOINT_IDS.SHOULDER_R]: -95,
      [JOINT_IDS.ELBOW_L]: 5,
      [JOINT_IDS.ELBOW_R]: 5,
      [JOINT_IDS.WRIST_L]: 5,
      [JOINT_IDS.WRIST_R]: 5,
      [JOINT_IDS.HAND_L]: 5,
      [JOINT_IDS.HAND_R]: 5,
      [JOINT_IDS.HIP_L]: 95,
      [JOINT_IDS.HIP_R]: -85,
      [JOINT_IDS.KNEE_L]: 2,
      [JOINT_IDS.KNEE_R]: -2,
      [JOINT_IDS.ANKLE_L]: 0,
      [JOINT_IDS.ANKLE_R]: 0,
      [JOINT_IDS.FOOT_L]: -75,
      [JOINT_IDS.FOOT_R]: -75,
    },
    camera: FRONT,
  },
  {
    id: 'lie-side',
    label: '横向き寝',
    category: 'lying',
    jointAngles: {
      [JOINT_IDS.SPINE]: 180,
      [JOINT_IDS.CHEST]: 180,
      [JOINT_IDS.NECK]: 175,
      [JOINT_IDS.HEAD]: 170,
      [JOINT_IDS.SHOULDER_L]: 60,
      [JOINT_IDS.SHOULDER_R]: -60,
      [JOINT_IDS.ELBOW_L]: 165,
      [JOINT_IDS.WRIST_L]: 150,
      [JOINT_IDS.ELBOW_R]: 25,
      [JOINT_IDS.WRIST_R]: 45,
      [JOINT_IDS.HIP_L]: 95,
      [JOINT_IDS.HIP_R]: -85,
      [JOINT_IDS.KNEE_L]: 18,
      [JOINT_IDS.KNEE_R]: -8,
      [JOINT_IDS.ANKLE_L]: 25,
      [JOINT_IDS.ANKLE_R]: 0,
      [JOINT_IDS.FOOT_L]: -60,
      [JOINT_IDS.FOOT_R]: -70,
    },
    camera: FRONT,
  },
  {
    id: 'lie-prone',
    label: 'うつ伏せ',
    category: 'lying',
    jointAngles: {
      [JOINT_IDS.SPINE]: 180,
      [JOINT_IDS.CHEST]: 180,
      [JOINT_IDS.NECK]: 180,
      [JOINT_IDS.HEAD]: 185,
      [JOINT_IDS.SHOULDER_L]: 95,
      [JOINT_IDS.SHOULDER_R]: -95,
      [JOINT_IDS.ELBOW_L]: 10,
      [JOINT_IDS.ELBOW_R]: -10,
      [JOINT_IDS.WRIST_L]: 15,
      [JOINT_IDS.WRIST_R]: -15,
      [JOINT_IDS.HIP_L]: 95,
      [JOINT_IDS.HIP_R]: -85,
      [JOINT_IDS.KNEE_L]: 3,
      [JOINT_IDS.KNEE_R]: -3,
      [JOINT_IDS.ANKLE_L]: 0,
      [JOINT_IDS.ANKLE_R]: 0,
      [JOINT_IDS.FOOT_L]: 70,
      [JOINT_IDS.FOOT_R]: 70,
    },
    camera: FRONT,
  },

  // ========== ヨガ ==========
  {
    id: 'sport-yoga-tree',
    label: 'ヨガ：木のポーズ',
    category: 'yoga',
    jointAngles: {
      // 片脚立ち、右脚を折って左太腿に付ける。両腕は頭上で合掌
      [JOINT_IDS.KNEE_R]: 15,
      [JOINT_IDS.ANKLE_R]: 150,
      [JOINT_IDS.FOOT_R]: 170,
      [JOINT_IDS.ELBOW_L]: -140,
      [JOINT_IDS.ELBOW_R]: -40,
      [JOINT_IDS.WRIST_L]: -55,
      [JOINT_IDS.WRIST_R]: -125,
      [JOINT_IDS.HAND_L]: -90,
      [JOINT_IDS.HAND_R]: -90,
    },
    camera: FRONT,
  },
  {
    id: 'sport-yoga-warrior',
    label: 'ヨガ：戦士のポーズ',
    category: 'yoga',
    jointAngles: {
      // 前脚の膝を曲げ、後脚を伸ばす。両腕は水平に
      [JOINT_IDS.KNEE_L]: 150,
      [JOINT_IDS.ANKLE_L]: 160,
      [JOINT_IDS.KNEE_R]: 40,
      [JOINT_IDS.ANKLE_R]: 90,
      [JOINT_IDS.ELBOW_L]: 175,
      [JOINT_IDS.WRIST_L]: 175,
      [JOINT_IDS.HAND_L]: 175,
      [JOINT_IDS.ELBOW_R]: 5,
      [JOINT_IDS.WRIST_R]: 5,
      [JOINT_IDS.HAND_R]: 5,
      [JOINT_IDS.SPINE]: -88,
    },
    camera: FRONT,
  },
  {
    id: 'sport-yoga-downward',
    label: 'ヨガ：下向きの犬',
    category: 'yoga',
    jointAngles: {
      // 逆V字（側面）：骨盤を頂点に体幹は左下がり、腕は床へ
      [JOINT_IDS.SPINE]: -150,
      [JOINT_IDS.CHEST]: -150,
      [JOINT_IDS.NECK]: -140,
      [JOINT_IDS.HEAD]: -130,
      [JOINT_IDS.SHOULDER_L]: -150,
      [JOINT_IDS.SHOULDER_R]: -150,
      [JOINT_IDS.ELBOW_L]: 100,
      [JOINT_IDS.ELBOW_R]: 100,
      [JOINT_IDS.WRIST_L]: 95,
      [JOINT_IDS.WRIST_R]: 95,
      [JOINT_IDS.KNEE_L]: 96,
      [JOINT_IDS.KNEE_R]: 90,
      [JOINT_IDS.ANKLE_L]: 90,
      [JOINT_IDS.ANKLE_R]: 88,
    },
    camera: SIDE,
  },

  // ========== ダンス ==========
  {
    id: 'sport-dance-ballet',
    label: 'バレエ：アラベスク',
    category: 'dance',
    jointAngles: {
      // 片脚立ち、もう片脚を後ろ高く上げる
      [JOINT_IDS.KNEE_R]: -30,
      [JOINT_IDS.ANKLE_R]: -25,
      [JOINT_IDS.FOOT_R]: -20,
      [JOINT_IDS.ELBOW_L]: 170,
      [JOINT_IDS.WRIST_L]: 165,
      [JOINT_IDS.ELBOW_R]: -15,
      [JOINT_IDS.WRIST_R]: -20,
      [JOINT_IDS.SPINE]: -95,
      [JOINT_IDS.HEAD]: -100,
    },
    camera: FRONT,
  },
  {
    id: 'sport-dance-hiphop',
    label: 'ヒップホップ',
    category: 'dance',
    jointAngles: {
      [JOINT_IDS.KNEE_L]: 100,
      [JOINT_IDS.KNEE_R]: 80,
      [JOINT_IDS.ANKLE_L]: 95,
      [JOINT_IDS.ANKLE_R]: 85,
      [JOINT_IDS.ELBOW_L]: 115,
      [JOINT_IDS.WRIST_L]: 130,
      [JOINT_IDS.ELBOW_R]: -55,
      [JOINT_IDS.WRIST_R]: -25,
      [JOINT_IDS.HAND_R]: -25,
      [JOINT_IDS.SPINE]: -82,
      [JOINT_IDS.HEAD]: -78,
    },
    camera: FRONT,
  },

  // ========== スポーツ ==========
  {
    id: 'sport-basketball',
    label: 'バスケットボール：シュート',
    category: 'sports',
    jointAngles: {
      // 両腕を頭上に伸ばしてシュート、つま先立ち
      [JOINT_IDS.ELBOW_L]: -115,
      [JOINT_IDS.ELBOW_R]: -65,
      [JOINT_IDS.WRIST_L]: -95,
      [JOINT_IDS.WRIST_R]: -85,
      [JOINT_IDS.HAND_L]: -90,
      [JOINT_IDS.HAND_R]: -90,
      [JOINT_IDS.KNEE_L]: 88,
      [JOINT_IDS.KNEE_R]: 92,
      [JOINT_IDS.ANKLE_L]: 88,
      [JOINT_IDS.ANKLE_R]: 92,
      [JOINT_IDS.FOOT_L]: 100,
      [JOINT_IDS.FOOT_R]: 80,
      [JOINT_IDS.SPINE]: -92,
      [JOINT_IDS.HEAD]: -100,
    },
    camera: FRONT,
  },
  {
    id: 'sport-soccer',
    label: 'サッカー：キック',
    category: 'sports',
    jointAngles: {
      // 右脚でキック、左脚は軸足、腕はバランス
      [JOINT_IDS.KNEE_R]: 35,
      [JOINT_IDS.ANKLE_R]: 75,
      [JOINT_IDS.FOOT_R]: 60,
      [JOINT_IDS.KNEE_L]: 95,
      [JOINT_IDS.ANKLE_L]: 92,
      [JOINT_IDS.ELBOW_L]: 145,
      [JOINT_IDS.WRIST_L]: 120,
      [JOINT_IDS.ELBOW_R]: 25,
      [JOINT_IDS.WRIST_R]: 40,
      [JOINT_IDS.SPINE]: -84,
    },
    camera: FRONT,
  },

  // ========== 医療体位 ==========
  // いずれも臥位が基本（体幹は水平）
  {
    id: 'medical-lithotomy',
    label: '砕石位（産婦人科）',
    category: 'medical',
    medicalOnly: true,
    jointAngles: {
      // 仰臥位で両脚を開き膝を立てる
      [JOINT_IDS.SPINE]: 180,
      [JOINT_IDS.CHEST]: 180,
      [JOINT_IDS.NECK]: 180,
      [JOINT_IDS.HEAD]: 180,
      [JOINT_IDS.SHOULDER_L]: 95,
      [JOINT_IDS.SHOULDER_R]: -95,
      [JOINT_IDS.ELBOW_L]: 5,
      [JOINT_IDS.ELBOW_R]: 5,
      [JOINT_IDS.HIP_L]: 120,
      [JOINT_IDS.HIP_R]: -60,
      [JOINT_IDS.KNEE_L]: -35,
      [JOINT_IDS.KNEE_R]: -50,
      [JOINT_IDS.ANKLE_L]: 30,
      [JOINT_IDS.ANKLE_R]: 10,
      [JOINT_IDS.FOOT_L]: 20,
      [JOINT_IDS.FOOT_R]: 0,
    },
    camera: FRONT,
  },
  {
    id: 'medical-sims',
    label: 'シムス位（側臥位）',
    category: 'medical',
    medicalOnly: true,
    jointAngles: {
      // 左側臥位、上側の脚を前方に強く曲げる
      [JOINT_IDS.SPINE]: 180,
      [JOINT_IDS.CHEST]: 180,
      [JOINT_IDS.NECK]: 175,
      [JOINT_IDS.HEAD]: 170,
      [JOINT_IDS.SHOULDER_L]: 70,
      [JOINT_IDS.SHOULDER_R]: -70,
      [JOINT_IDS.ELBOW_L]: 30,
      [JOINT_IDS.WRIST_L]: 40,
      [JOINT_IDS.ELBOW_R]: 160,
      [JOINT_IDS.WRIST_R]: 140,
      [JOINT_IDS.HIP_L]: 95,
      [JOINT_IDS.HIP_R]: -85,
      [JOINT_IDS.KNEE_L]: 25,
      [JOINT_IDS.ANKLE_L]: 30,
      [JOINT_IDS.KNEE_R]: -55,
      [JOINT_IDS.ANKLE_R]: -10,
      [JOINT_IDS.FOOT_L]: -50,
      [JOINT_IDS.FOOT_R]: -60,
    },
    camera: FRONT,
  },
  {
    id: 'medical-knee-chest',
    label: '膝胸位',
    category: 'medical',
    medicalOnly: true,
    jointAngles: {
      // うつ伏せで膝を胸の下に引きつけ、臀部を高く上げる
      [JOINT_IDS.SPINE]: 155,
      [JOINT_IDS.CHEST]: 160,
      [JOINT_IDS.NECK]: 175,
      [JOINT_IDS.HEAD]: 180,
      [JOINT_IDS.SHOULDER_L]: 110,
      [JOINT_IDS.SHOULDER_R]: -70,
      [JOINT_IDS.ELBOW_L]: 150,
      [JOINT_IDS.WRIST_L]: 165,
      [JOINT_IDS.ELBOW_R]: 175,
      [JOINT_IDS.HIP_L]: 90,
      [JOINT_IDS.HIP_R]: -90,
      [JOINT_IDS.KNEE_L]: 85,
      [JOINT_IDS.KNEE_R]: -85,
      [JOINT_IDS.ANKLE_L]: 175,
      [JOINT_IDS.ANKLE_R]: 175,
      [JOINT_IDS.FOOT_L]: 150,
      [JOINT_IDS.FOOT_R]: 150,
    },
    camera: FRONT,
  },
  {
    id: 'medical-trendelenburg',
    label: 'トレンデレンブルグ位（頭低足高位）',
    category: 'medical',
    medicalOnly: true,
    jointAngles: {
      // 仰臥位で頭側を低く（体幹をやや右肩上がりに）
      [JOINT_IDS.SPINE]: 192,
      [JOINT_IDS.CHEST]: 192,
      [JOINT_IDS.NECK]: 192,
      [JOINT_IDS.HEAD]: 192,
      [JOINT_IDS.SHOULDER_L]: 100,
      [JOINT_IDS.SHOULDER_R]: -85,
      [JOINT_IDS.ELBOW_L]: 15,
      [JOINT_IDS.ELBOW_R]: 15,
      [JOINT_IDS.WRIST_L]: 15,
      [JOINT_IDS.WRIST_R]: 15,
      [JOINT_IDS.HIP_L]: 100,
      [JOINT_IDS.HIP_R]: -80,
      [JOINT_IDS.KNEE_L]: 12,
      [JOINT_IDS.KNEE_R]: 12,
      [JOINT_IDS.ANKLE_L]: 12,
      [JOINT_IDS.ANKLE_R]: 12,
      [JOINT_IDS.FOOT_L]: -65,
      [JOINT_IDS.FOOT_R]: -65,
    },
    camera: FRONT,
  },
  {
    id: 'medical-recovery',
    label: '回復体位',
    category: 'medical',
    medicalOnly: true,
    jointAngles: {
      // 側臥位、上側の腕と脚を曲げて安定させる
      [JOINT_IDS.SPINE]: 180,
      [JOINT_IDS.CHEST]: 180,
      [JOINT_IDS.NECK]: 172,
      [JOINT_IDS.HEAD]: 168,
      [JOINT_IDS.SHOULDER_L]: 80,
      [JOINT_IDS.SHOULDER_R]: -80,
      [JOINT_IDS.ELBOW_L]: 15,
      [JOINT_IDS.WRIST_L]: 20,
      [JOINT_IDS.ELBOW_R]: 120,
      [JOINT_IDS.WRIST_R]: 150,
      [JOINT_IDS.HIP_L]: 95,
      [JOINT_IDS.HIP_R]: -85,
      [JOINT_IDS.KNEE_L]: 20,
      [JOINT_IDS.ANKLE_L]: 25,
      [JOINT_IDS.KNEE_R]: -60,
      [JOINT_IDS.ANKLE_R]: -15,
      [JOINT_IDS.FOOT_L]: -55,
      [JOINT_IDS.FOOT_R]: -65,
    },
    camera: FRONT,
  },

  // ========== 性的体位 ==========
  {
    id: 'sexual-missionary',
    label: '正常位',
    category: 'sexual',
    adultOnly: true,
    jointAngles: {
      // 仰臥位で両脚を開き膝を立てる
      [JOINT_IDS.SPINE]: 180,
      [JOINT_IDS.CHEST]: 180,
      [JOINT_IDS.NECK]: 180,
      [JOINT_IDS.HEAD]: 175,
      [JOINT_IDS.SHOULDER_L]: 100,
      [JOINT_IDS.SHOULDER_R]: -100,
      [JOINT_IDS.ELBOW_L]: 20,
      [JOINT_IDS.ELBOW_R]: -20,
      [JOINT_IDS.HIP_L]: 115,
      [JOINT_IDS.HIP_R]: -65,
      [JOINT_IDS.KNEE_L]: -40,
      [JOINT_IDS.KNEE_R]: -55,
      [JOINT_IDS.ANKLE_L]: 25,
      [JOINT_IDS.ANKLE_R]: 5,
      [JOINT_IDS.FOOT_L]: 15,
      [JOINT_IDS.FOOT_R]: -5,
    },
    camera: FRONT,
  },
  {
    id: 'sexual-doggy',
    label: '後背位',
    category: 'sexual',
    adultOnly: true,
    jointAngles: {
      // 四つん這い：体幹は水平、肘と膝で支える
      [JOINT_IDS.SPINE]: 178,
      [JOINT_IDS.CHEST]: 178,
      [JOINT_IDS.NECK]: 170,
      [JOINT_IDS.HEAD]: 165,
      [JOINT_IDS.SHOULDER_L]: 85,
      [JOINT_IDS.SHOULDER_R]: -85,
      [JOINT_IDS.ELBOW_L]: 80,
      [JOINT_IDS.ELBOW_R]: -75,
      [JOINT_IDS.WRIST_L]: 85,
      [JOINT_IDS.WRIST_R]: -80,
      [JOINT_IDS.HIP_L]: 92,
      [JOINT_IDS.HIP_R]: -88,
      [JOINT_IDS.KNEE_L]: 88,
      [JOINT_IDS.KNEE_R]: -82,
      [JOINT_IDS.ANKLE_L]: 178,
      [JOINT_IDS.ANKLE_R]: 178,
      [JOINT_IDS.FOOT_L]: 150,
      [JOINT_IDS.FOOT_R]: 150,
    },
    camera: FRONT,
  },
  {
    id: 'sexual-cowgirl',
    label: '騎乗位',
    category: 'sexual',
    adultOnly: true,
    jointAngles: {
      // 膝立ちで上体は直立
      [JOINT_IDS.SPINE]: -85,
      [JOINT_IDS.CHEST]: -85,
      [JOINT_IDS.NECK]: -88,
      [JOINT_IDS.HEAD]: -90,
      [JOINT_IDS.KNEE_L]: 130,
      [JOINT_IDS.KNEE_R]: 50,
      [JOINT_IDS.ANKLE_L]: 160,
      [JOINT_IDS.ANKLE_R]: 20,
      [JOINT_IDS.FOOT_L]: 150,
      [JOINT_IDS.FOOT_R]: 30,
      [JOINT_IDS.ELBOW_L]: 110,
      [JOINT_IDS.ELBOW_R]: 70,
      [JOINT_IDS.WRIST_L]: 100,
      [JOINT_IDS.WRIST_R]: 80,
    },
    camera: FRONT,
  },
  {
    id: 'sexual-spooning',
    label: 'スプーニング',
    category: 'sexual',
    adultOnly: true,
    jointAngles: {
      // 横向き寝で軽く脚を曲げる
      [JOINT_IDS.SPINE]: 180,
      [JOINT_IDS.CHEST]: 180,
      [JOINT_IDS.NECK]: 175,
      [JOINT_IDS.HEAD]: 170,
      [JOINT_IDS.SHOULDER_L]: 75,
      [JOINT_IDS.SHOULDER_R]: -75,
      [JOINT_IDS.ELBOW_L]: 25,
      [JOINT_IDS.ELBOW_R]: -25,
      [JOINT_IDS.HIP_L]: 95,
      [JOINT_IDS.HIP_R]: -85,
      [JOINT_IDS.KNEE_L]: 20,
      [JOINT_IDS.KNEE_R]: -15,
      [JOINT_IDS.ANKLE_L]: 30,
      [JOINT_IDS.ANKLE_R]: -5,
      [JOINT_IDS.FOOT_L]: -55,
      [JOINT_IDS.FOOT_R]: -65,
    },
    camera: FRONT,
  },
  {
    id: 'sexual-standing',
    label: '立位',
    category: 'sexual',
    adultOnly: true,
    jointAngles: {
      // 立位で抱き合う姿勢（腕を前に回す）
      [JOINT_IDS.SPINE]: -86,
      [JOINT_IDS.KNEE_L]: 94,
      [JOINT_IDS.KNEE_R]: 86,
      [JOINT_IDS.ELBOW_L]: 55,
      [JOINT_IDS.WRIST_L]: 10,
      [JOINT_IDS.ELBOW_R]: 125,
      [JOINT_IDS.WRIST_R]: 170,
      [JOINT_IDS.HEAD]: -88,
    },
    camera: FRONT,
  },
];

/** カテゴリ別にポーズを取得 */
export function getPosesByCategory(category: string): Pose[] {
  return POSES.filter((p) => p.category === category);
}

/** ポーズIDから取得 */
export function getPoseById(id: string): Pose | undefined {
  return POSES.find((p) => p.id === id);
}

/** 一般モードで表示可能なポーズを取得 */
export function getGeneralPoses(): Pose[] {
  return POSES.filter((p) => !p.medicalOnly && !p.adultOnly);
}

/** 医療モードで表示可能なポーズを取得 */
export function getMedicalPoses(): Pose[] {
  return POSES.filter((p) => !p.adultOnly);
}

/** 全ポーズを取得（年齢確認済みの場合） */
export function getAllPoses(): Pose[] {
  return POSES;
}

/** カテゴリ一覧 */
export const POSE_CATEGORIES: { id: PoseCategory; label: string; medicalOnly?: boolean; adultOnly?: boolean }[] = [
  { id: 'standing', label: '立ち' },
  { id: 'sitting', label: '座り' },
  { id: 'walking', label: '歩き' },
  { id: 'running', label: '走り' },
  { id: 'lying', label: '横になる' },
  { id: 'gesture', label: 'ジェスチャー' },
  { id: 'sports', label: 'スポーツ' },
  { id: 'dance', label: 'ダンス' },
  { id: 'yoga', label: 'ヨガ' },
  { id: 'medical', label: '医療体位', medicalOnly: true },
  { id: 'sexual', label: '性的体位', adultOnly: true },
];
