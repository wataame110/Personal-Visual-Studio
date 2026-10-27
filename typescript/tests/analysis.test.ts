// 写真解析（本人再現エンジン）の単体テスト
import { describe, it, expect } from 'vitest';
import {
  landmarksToGuideParams,
  averagePixels,
  filterSkinPixels,
  type PhotoAnalysisResult,
  type Landmark2D,
} from '../photo/analysis';

/** 合成ランドマーク：標準的な顔比率を持つ478点の顔を生成 */
function makeFaceLandmarks(overrides: Record<number, { x: number; y: number }> = {}): Landmark2D[] {
  const pts: Landmark2D[] = [];
  for (let i = 0; i < 478; i++) pts.push({ x: 0.5, y: 0.3, label: `face-${i}` });
  const set = (i: number, x: number, y: number) => { pts[i] = { x, y, label: `face-${i}` }; };
  // 標準比を持つ基準配置（顔幅0.20・顔長0.27・目離隔0.124・顎幅0.156）
  set(234, 0.40, 0.30); // faceLeft
  set(454, 0.60, 0.30); // faceRight
  set(10, 0.50, 0.165); // foreheadTop
  set(152, 0.50, 0.435); // chinBottom
  set(172, 0.422, 0.40); // jawLeft
  set(397, 0.578, 0.40); // jawRight
  set(33, 0.438, 0.28); // rightEyeOuter
  set(263, 0.562, 0.28); // leftEyeOuter
  set(159, 0.555, 0.275); // leftEyeTop
  set(145, 0.555, 0.2872); // leftEyeBottom
  set(386, 0.445, 0.275); // rightEyeTop
  set(374, 0.445, 0.2872); // rightEyeBottom
  set(61, 0.462, 0.40); // mouthLeft
  set(291, 0.538, 0.40); // mouthRight
  set(0, 0.50, 0.3987); // mouthTop
  set(17, 0.50, 0.412); // mouthBottom
  set(1, 0.50, 0.351); // noseTip
  set(105, 0.45, 0.2601); // browLeftTop
  set(334, 0.55, 0.2601); // browRightTop
  set(116, 0.43, 0.34); // cheekLeft
  set(345, 0.57, 0.34); // cheekRight
  set(151, 0.50, 0.18); // hairline
  for (const [k, v] of Object.entries(overrides)) set(Number(k), v.x, v.y);
  return pts;
}

/** 合成姿勢ランドマーク：33点（肩幅0.16・骨盤幅0.1312） */
function makePoseLandmarks(shoulderW = 0.16, hipRatio = 0.82): Landmark2D[] {
  const pts: Landmark2D[] = [];
  for (let i = 0; i < 33; i++) pts.push({ x: 0.5, y: 0.6, label: `pose-${i}` });
  const set = (i: number, x: number, y: number) => { pts[i] = { x, y, label: `pose-${i}` }; };
  set(11, 0.5 - shoulderW / 2, 0.5); // leftShoulder
  set(12, 0.5 + shoulderW / 2, 0.5); // rightShoulder
  const hipW = shoulderW * hipRatio;
  set(23, 0.5 - hipW / 2, 0.7); // leftHip
  set(24, 0.5 + hipW / 2, 0.7); // rightHip
  return pts;
}

const makeResult = (face: Landmark2D[], pose: Landmark2D[]): PhotoAnalysisResult => ({
  faceLandmarks: face,
  poseLandmarks: pose,
  imageWidth: 1000,
  imageHeight: 1000,
});

describe('ランドマークからのガイドパラメータ推定', () => {
  it('標準比の顔・身体では概ね1.0のパラメータになる', () => {
    const guide = landmarksToGuideParams(makeResult(makeFaceLandmarks(), makePoseLandmarks()), 1);
    expect(guide.head?.length).toBeCloseTo(1.0, 1);
    expect(guide.head?.jawWidth).toBeCloseTo(1.0, 1);
    expect(guide.mouth?.width).toBeCloseTo(1.0, 1);
    expect(guide.pelvis?.width).toBeCloseTo(1.0, 1);
    expect(guide.nose?.length).toBeCloseTo(1.0, 1);
  });

  it('顎が広い顔ではjawWidthが大きくなる（顔の輪郭の個人差）', () => {
    const wide = makeFaceLandmarks({ 172: { x: 0.40, y: 0.40 }, 397: { x: 0.60, y: 0.40 } });
    const guide = landmarksToGuideParams(makeResult(wide, []), 1);
    expect(guide.head!.jawWidth!).toBeGreaterThan(1.2);
  });

  it('顔と肩の比率から頭の幅を推定する', () => {
    // 顔幅0.20・肩幅0.4762 → 比率0.42（標準）
    const guide = landmarksToGuideParams(makeResult(makeFaceLandmarks(), makePoseLandmarks(0.4762)), 1);
    expect(guide.head?.width).toBeCloseTo(1.0, 1);
    expect(guide.detectedItems).toContain('頭身比（頭の幅）');
  });

  it('顔が検出できない場合は顔パラメータを推定しない', () => {
    const guide = landmarksToGuideParams(makeResult([], makePoseLandmarks()), 1);
    expect(guide.head).toBeUndefined();
    expect(guide.pelvis?.width).toBeDefined();
  });

  it('推定値は範囲にクランプされる（極端な誤検出への耐性）', () => {
    const extreme = makeFaceLandmarks({ 152: { x: 0.5, y: 0.9 } }); // 異常に長い顔
    const guide = landmarksToGuideParams(makeResult(extreme, []), 1);
    expect(guide.head!.length!).toBeLessThanOrEqual(1.25);
    expect(guide.head!.length!).toBeGreaterThanOrEqual(0.8);
  });
});

describe('色情報の抽出（純粋関数）', () => {
  it('averagePixels はRGBA配列の平均色を返す', () => {
    expect(averagePixels([200, 150, 100, 255, 100, 50, 0, 255])).toBe('#966432');
    expect(averagePixels([])).toBe('#000000');
  });

  it('filterSkinPixels は無彩色・極端な明暗を除外する', () => {
    const pixels = new Uint8ClampedArray([
      200, 160, 130, 255, // 肌色 → 採用
      128, 128, 128, 255, // 無彩色 → 除外
      10, 10, 10, 255,    // 暗黒 → 除外
      250, 250, 250, 255, // 白飛び → 除外
      30, 200, 30, 255,   // 緑（非肌色）→ 除外
    ]);
    const out = filterSkinPixels(pixels);
    expect(out.length).toBe(4);
    expect(out.slice(0, 3)).toEqual([200, 160, 130]);
  });
});
