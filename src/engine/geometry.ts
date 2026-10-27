// パラメトリックメッシュ生成ユーティリティ
// 連続曲面を持つ人体モデルのため、ロフト（断面積層）と曲線チューブを基礎とする。
import * as THREE from 'three';

/** 断面定義：中心位置・楕円半径・回転・超楕円指数 */
export interface Section {
  center: THREE.Vector3;
  rx: number;
  rz: number;
  /** 断面の回転（進行方向まわり、ラジアン） */
  roll?: number;
  /** 超楕円指数。1=楕円、大きいほど角張る。通常1 */
  super?: number;
}

/**
 * 任意経路に沿ったロフトメッシュを生成する。
 * 各断面は平行輸送フレームで配置され、滑らかな連続曲面となる。
 */
export function loftSections(
  sections: Section[],
  radialSegments = 24,
  capStart = true,
  capEnd = true,
  /** 断面円周の開始角・弧長（ラジアン）。既定は全周。部分殻（髪など）に使用 */
  thetaStart = 0,
  thetaLength = Math.PI * 2,
): THREE.BufferGeometry {
  const n = sections.length;
  if (n < 2) throw new Error('loftSections: 2つ以上の断面が必要です');

  // 各断面のフレーム（接線・法線・従法線）を平行輸送で求める
  const tangents: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const prev = sections[Math.max(0, i - 1)].center;
    const next = sections[Math.min(n - 1, i + 1)].center;
    tangents.push(new THREE.Vector3().subVectors(next, prev).normalize());
  }
  const normals: THREE.Vector3[] = [];
  const binormals: THREE.Vector3[] = [];
  // 初期従法線：接線に垂直で、垂直経路では X 軸方向になるよう選ぶ。
  // θ=0 が rx（X=幅方向）、θ=π/2 が rz（Z=奥行方向）に対応する。
  const t0 = tangents[0];
  const arbitrary = Math.abs(t0.z) < 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
  let binormal = new THREE.Vector3().crossVectors(t0, arbitrary).normalize();
  for (let i = 0; i < n; i++) {
    const t = tangents[i];
    // 平行輸送：前の従法線を現在の接線平面へ射影
    binormal = binormal.clone().sub(t.clone().multiplyScalar(binormal.dot(t))).normalize();
    const normal = new THREE.Vector3().crossVectors(binormal, t).normalize();
    normals.push(normal.clone());
    binormals.push(binormal.clone());
  }

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const ringVerts = radialSegments + 1;

  for (let i = 0; i < n; i++) {
    const s = sections[i];
    const superExp = s.super ?? 1;
    const roll = s.roll ?? 0;
    const cosR = Math.cos(roll);
    const sinR = Math.sin(roll);
    for (let j = 0; j <= radialSegments; j++) {
      const theta = thetaStart + (j / radialSegments) * thetaLength;
      let c = Math.cos(theta);
      let si = Math.sin(theta);
      // 超楕円変形
      if (superExp !== 1) {
        const e = 2 / superExp;
        c = Math.sign(c) * Math.pow(Math.abs(c), e);
        si = Math.sign(si) * Math.pow(Math.abs(si), e);
      }
      // ロール回転
      const lx = c * cosR - si * sinR;
      const lz = c * sinR + si * cosR;
      const offset = binormals[i]
        .clone()
        .multiplyScalar(lx * s.rx)
        .add(normals[i].clone().multiplyScalar(lz * s.rz));
      const p = s.center.clone().add(offset);
      positions.push(p.x, p.y, p.z);
      uvs.push(j / radialSegments, i / (n - 1));
    }
  }

  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * ringVerts + j;
      const b = a + 1;
      const c2 = a + ringVerts;
      const d = c2 + 1;
      indices.push(a, c2, b, b, c2, d);
    }
  }

  // 端面キャップ
  let vertOffset = positions.length / 3;
  const cap = (sectionIndex: number, flip: boolean) => {
    const s = sections[sectionIndex];
    const t = tangents[sectionIndex].clone().multiplyScalar(flip ? -1 : 1);
    const centerIdx = vertOffset;
    positions.push(s.center.x, s.center.y, s.center.z);
    uvs.push(0.5, flip ? 0 : 1);
    vertOffset++;
    const base = sectionIndex * ringVerts;
    for (let j = 0; j < radialSegments; j++) {
      const a = base + j;
      const b = base + j + 1;
      if (flip) indices.push(centerIdx, b, a);
      else indices.push(centerIdx, a, b);
    }
    void t;
  };
  if (capStart) cap(0, true);
  if (capEnd) cap(n - 1, false);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Catmull-Rom 曲線に沿ったチューブ。半径は経路上の t(0..1) の関数。
 */
export function tubeAlongPath(
  points: THREE.Vector3[],
  radius: (t: number) => { rx: number; rz: number },
  pathSegments = 24,
  radialSegments = 16,
  capStart = true,
  capEnd = true,
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points);
  const sections: Section[] = [];
  for (let i = 0; i <= pathSegments; i++) {
    const t = i / pathSegments;
    const r = radius(t);
    sections.push({ center: curve.getPoint(t), rx: r.rx, rz: r.rz });
  }
  return loftSections(sections, radialSegments, capStart, capEnd);
}

/** 球状の変形プリミティブ（部位の基礎形）。各軸スケール付き。 */
export function ellipsoid(rx: number, ry: number, rz: number, widthSeg = 24, heightSeg = 18): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, widthSeg, heightSeg);
  geo.scale(rx, ry, rz);
  return geo;
}

/**
 * 頂点ワープ：領域マスクに基づく局所変形。
 * center から radius 内の頂点をガウス減衰で offset 方向へ移動する。
 */
export function warpVertices(
  geo: THREE.BufferGeometry,
  center: THREE.Vector3,
  radius: number,
  offset: THREE.Vector3,
): void {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const d = v.distanceTo(center) / radius;
    if (d < 1) {
      const w = Math.exp(-d * d * 3);
      pos.setXYZ(i, v.x + offset.x * w, v.y + offset.y * w, v.z + offset.z * w);
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

/** メッシュの自己交差・極端な破綻の簡易検出（非有限値と過大変位を検査） */
export function validateGeometry(geo: THREE.BufferGeometry, maxExtent = 5): boolean {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return false;
    if (Math.abs(x) > maxExtent || Math.abs(y) > maxExtent || Math.abs(z) > maxExtent) return false;
  }
  return true;
}

/** パラメータを安全な範囲へ制限する */
export function clampParam(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}
