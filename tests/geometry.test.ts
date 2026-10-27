// ジオメトリユーティリティのテスト
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { loftSections, tubeAlongPath, warpVertices, validateGeometry, clampParam } from '../src/engine/geometry';

describe('loftSections', () => {
  it('連続した有効なメッシュを生成する', () => {
    const geo = loftSections(
      [
        { center: new THREE.Vector3(0, 0, 0), rx: 0.1, rz: 0.1 },
        { center: new THREE.Vector3(0, 0.5, 0), rx: 0.08, rz: 0.08 },
        { center: new THREE.Vector3(0, 1, 0), rx: 0.05, rz: 0.05 },
      ],
      16,
    );
    expect(validateGeometry(geo)).toBe(true);
    const pos = geo.getAttribute('position');
    expect(pos.count).toBeGreaterThan(0);
    // 法線が計算されている
    expect(geo.getAttribute('normal')).toBeTruthy();
  });

  it('2断面未満では例外', () => {
    expect(() => loftSections([{ center: new THREE.Vector3(), rx: 1, rz: 1 }])).toThrow();
  });
});

describe('tubeAlongPath', () => {
  it('曲線に沿ったチューブを生成する', () => {
    const geo = tubeAlongPath(
      [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.1, 0.1, 0), new THREE.Vector3(0.2, 0, 0.1)],
      () => ({ rx: 0.01, rz: 0.01 }),
    );
    expect(validateGeometry(geo)).toBe(true);
  });
});

describe('warpVertices', () => {
  it('指定範囲内の頂点のみ変形する', () => {
    const geo = new THREE.SphereGeometry(1, 8, 6);
    const before = (geo.getAttribute('position') as THREE.BufferAttribute).getY(0);
    warpVertices(geo, new THREE.Vector3(0, 1, 0), 0.5, new THREE.Vector3(0, 0.2, 0));
    const after = (geo.getAttribute('position') as THREE.BufferAttribute).getY(0);
    expect(after).not.toBe(before);
    expect(validateGeometry(geo)).toBe(true);
  });
});

describe('clampParam', () => {
  it('範囲内に制限する', () => {
    expect(clampParam(5, 0, 1)).toBe(1);
    expect(clampParam(-5, 0, 1)).toBe(0);
    expect(clampParam(0.5, 0, 1)).toBe(0.5);
    expect(clampParam(NaN, 0, 1)).toBe(0);
  });
});
