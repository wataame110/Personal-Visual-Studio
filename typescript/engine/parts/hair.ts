// 髪型のパラメトリック生成（スタイル・長さ・ボリューム・カール・分け目・カラー）
import * as THREE from 'three';
import { loftSections, tubeAlongPath, type Section } from '../geometry';
import type { BodyRig } from '../rig';
import type { HairConfig } from '../../core/types';
import { hairMaterial } from '../materials';

export function buildHair(rig: BodyRig, cfg: HairConfig, quality: 'high' | 'low'): THREE.Group {
  const group = new THREE.Group();
  group.name = 'hair';
  if (cfg.style === 'none') return group;

  const radial = quality === 'high' ? 28 : 14;
  const mat = hairMaterial(cfg.color, cfg.color2, cfg.gradient);
  const rx = rig.headRadiusX;
  const rz = rig.headRadiusZ;
  const topY = rig.crownY;
  const vol = 1 + cfg.volume * 0.25;

  // 頭皮キャップ（頭頂〜側頭部を覆う殻）
  const capSections: Section[] = [];
  const capProfile = [
    { t: 0.62, s: 1.07 * vol, z: -0.001 },
    { t: 0.75, s: 1.09 * vol, z: -0.002 },
    { t: 0.88, s: 1.08 * vol, z: -0.005 },
    { t: 1.0, s: 0.4, z: -0.01 },
    { t: 1.04, s: 0.02, z: -0.012 },
  ];
  for (const p of capProfile) {
    capSections.push({
      center: new THREE.Vector3(0, rig.chinY + rig.headHeight * p.t + 0.001, p.z),
      rx: rx * p.s * hairWidthAt(p.t),
      rz: rz * p.s,
    });
  }
  // 頭頂で閉じる
  const cap = new THREE.Mesh(loftSections(capSections, radial, false, true), mat);
  cap.userData.partId = 'hair';
  group.add(cap);

  const lenScale = cfg.length;
  const curl = cfg.curl;

  const styleLen: Record<string, number> = {
    short: 0.02,
    bob: 0.1,
    medium: 0.2,
    long: 0.34,
    ponytail: 0.1,
    bun: 0.06,
    none: 0,
  };
  const baseLen = (styleLen[cfg.style] ?? 0.1) * (0.5 + lenScale) * rig.height * 1.4;

  if (baseLen > 0.01) {
    // 側頭部・後頭部の毛束：頭の周りを垂れる殻
    const hairLen = baseLen;
    const bottomY = rig.chinY + rig.headHeight * 0.62 - hairLen;
    const shellProfile: Section[] = [];
    const nS = 5;
    for (let i = 0; i <= nS; i++) {
      const t = i / nS;
      const y = rig.chinY + rig.headHeight * 0.68 - hairLen * t;
      // カールは下部で外に広がる
      const spread = 1.05 * vol + curl * t * 0.25;
      shellProfile.push({
        center: new THREE.Vector3(0, Math.max(y, bottomY), -0.004 - curl * t * 0.02),
        rx: rx * spread * hairWidthAt(0.68),
        rz: rz * spread,
      });
    }
    const shell = new THREE.Mesh(
      // 顔の前面（θ=π/2 付近）を開けた部分殻にする
      loftSections(shellProfile, radial, false, false, Math.PI / 2 + 0.85, Math.PI * 2 - 1.7),
      mat,
    );
    shell.userData.partId = 'hair';
    group.add(shell);
  }

  // 前髪（眉を覆わないよう眉上で終わる長さに制限）
  if (cfg.bangs > 0.05) {
    const bangsLen = 0.012 * rig.height * cfg.bangs + 0.008;
    const parting = cfg.parting * 0.4; // -0.4..0.4
    const bangPts = [
      new THREE.Vector3(parting * rx, rig.browY + 0.022, rz * 0.88),
      new THREE.Vector3(parting * rx * 0.5, rig.browY + 0.008, rz * 1.0),
      new THREE.Vector3(0, rig.browY + 0.006 - bangsLen * 0.5, rz * 0.99),
    ];
    const bangs = new THREE.Mesh(
      tubeAlongPath(bangPts, (t) => ({ rx: rx * (0.9 - t * 0.2) * 0.9, rz: 0.004 }), 10, 10, true, false),
      mat,
    );
    bangs.userData.partId = 'hair';
    group.add(bangs);
  }

  // ポニーテール・お団子
  if (cfg.style === 'ponytail') {
    const tailLen = (0.12 + cfg.length * 0.2) * rig.height;
    const pts = [
      new THREE.Vector3(0, rig.crownY - rig.headHeight * 0.15, -rz * 1.0),
      new THREE.Vector3(0, rig.crownY - rig.headHeight * 0.3, -rz * 1.35),
      new THREE.Vector3(0, rig.crownY - rig.headHeight * 0.3 - tailLen * 0.7, -rz * 1.15 - curl * 0.02),
    ];
    const tail = new THREE.Mesh(
      tubeAlongPath(pts, (t) => ({ rx: 0.014 * (1 - t * 0.6) * vol, rz: 0.014 * (1 - t * 0.6) * vol }), 14, 10),
      mat,
    );
    tail.userData.partId = 'hair';
    group.add(tail);
  }
  if (cfg.style === 'bun') {
    const bun = new THREE.Mesh(
      new THREE.SphereGeometry(0.03 * vol, radial, Math.max(10, radial / 2)),
      mat,
    );
    bun.position.set(0, rig.crownY - 0.01, -rz * 0.95);
    bun.userData.partId = 'hair';
    group.add(bun);
  }

  return group;
}

/** 額側を狭く・後頭部側を広くする幅プロファイル */
function hairWidthAt(t: number): number {
  return 1;
}
