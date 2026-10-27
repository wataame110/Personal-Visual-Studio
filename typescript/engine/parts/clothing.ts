// 衣服・アクセサリーのパラメトリックメッシュ
// 2D商品写真から3D衣服を復元するものではなく、体型に追従する簡易衣服モデル。
import * as THREE from 'three';
import { loftSections, ellipsoid, tubeAlongPath, type Section } from '../geometry';
import type { BodyRig } from '../rig';
import type { Garment, ClothingState } from '../../core/types';
import { clothMaterial } from '../materials';

function garmentMaterial(g: Garment): THREE.Material {
  if (g.useReferenceTexture && g.referenceImage) {
    const tex = new THREE.TextureLoader().load(g.referenceImage);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide });
  }
  return clothMaterial(g.color, g.pattern);
}

/**
 * 衣服生成のフォールバック：参照テクスチャ・柄・異常パラメータを除外した
 * 無地の安全な衣服を生成する。読込失敗時に裸体を表示しないための保険。
 */
export function buildFallbackGarment(rig: BodyRig, g: Garment, quality: 'high' | 'low'): THREE.Group {
  return buildGarment(
    rig,
    {
      ...g,
      useReferenceTexture: false,
      referenceImage: undefined,
      pattern: 'solid',
      offsetY: Number.isFinite(g.offsetY) ? g.offsetY : 0,
    },
    quality,
  );
}

export function buildGarment(rig: BodyRig, g: Garment, quality: 'high' | 'low'): THREE.Group {
  const group = new THREE.Group();
  group.name = g.id;
  if (!g.visible) return group;
  const radial = quality === 'high' ? 32 : 16;
  const mat = garmentMaterial(g);
  const ease = 1.12; // ゆとり
  const oy = g.offsetY;

  if (g.kind === 'tops' || g.kind === 'outer' || g.kind === 'dress') {
    const e = g.kind === 'outer' ? ease + 0.08 : ease;
    const bottomY = g.kind === 'dress' ? rig.kneeY + 0.1 : rig.hipY - 0.02;
    const sections: Section[] = [
      { center: new THREE.Vector3(0, bottomY + oy, 0), rx: rig.hipHalfW * e, rz: rig.hipHalfD * e },
      { center: new THREE.Vector3(0, rig.waistY + oy, 0), rx: rig.waistHalfW * e, rz: rig.waistHalfD * e },
      { center: new THREE.Vector3(0, rig.bustY + oy, 0), rx: rig.bustHalfW * (e + 0.03), rz: rig.bustHalfD * (e + 0.08) },
      { center: new THREE.Vector3(0, rig.shoulderY + oy, 0), rx: rig.shoulderHalf * 0.98, rz: rig.bustHalfD * e * 0.85, super: 1.4 },
    ];
    if (g.kind === 'dress') {
      sections.unshift(
        { center: new THREE.Vector3(0, rig.kneeY + 0.08 + oy, 0), rx: rig.hipHalfW * (e + 0.25), rz: rig.hipHalfD * (e + 0.25) },
        { center: new THREE.Vector3(0, rig.crotchY + oy, 0), rx: rig.hipHalfW * (e + 0.12), rz: rig.hipHalfD * (e + 0.12) },
      );
    }
    const mesh = new THREE.Mesh(loftSections(sections, radial, false, false), mat);
    mesh.userData.partId = g.id;
    group.add(mesh);

    // 袖（トップス・アウター）
    if (g.kind !== 'dress') {
      for (const side of [-1, 1]) {
        const sleeve = new THREE.Mesh(
          loftSections(
            [
              { center: new THREE.Vector3(side * rig.shoulderHalf * 0.98, rig.shoulderY + oy, 0), rx: 0.03 * rig.height * e, rz: 0.028 * rig.height * e },
              { center: new THREE.Vector3(side * rig.shoulderHalf * 1.06, rig.shoulderY - 0.09 * rig.height + oy, 0), rx: 0.024 * rig.height * e, rz: 0.022 * rig.height * e },
            ],
            radial / 2,
            false,
            false,
          ),
          mat,
        );
        sleeve.userData.partId = g.id;
        group.add(sleeve);
      }
    }
  }

  if (g.kind === 'pants') {
    for (const side of [-1, 1]) {
      const hx = side * rig.hipHalfW * 0.45;
      const sections: Section[] = [
        { center: new THREE.Vector3(hx, rig.waistY - 0.01 + oy, 0), rx: rig.hipHalfW * 0.55 * ease, rz: rig.hipHalfD * 0.6 * ease },
        { center: new THREE.Vector3(hx, rig.crotchY + oy, 0), rx: 0.055 * rig.height * ease, rz: 0.05 * rig.height * ease },
        { center: new THREE.Vector3(hx, rig.kneeY + oy, 0), rx: 0.03 * rig.height * ease, rz: 0.03 * rig.height * ease },
        { center: new THREE.Vector3(hx, rig.ankleY + 0.01 + oy, 0), rx: 0.02 * rig.height * ease, rz: 0.02 * rig.height * ease },
      ];
      const leg = new THREE.Mesh(loftSections(sections, radial / 2), mat);
      leg.userData.partId = g.id;
      group.add(leg);
    }
    // 腰部の帯
    const belt = new THREE.Mesh(
      loftSections(
        [
          { center: new THREE.Vector3(0, rig.waistY + 0.02 + oy, 0), rx: rig.waistHalfW * ease, rz: rig.waistHalfD * ease },
          { center: new THREE.Vector3(0, rig.hipY + oy, 0), rx: rig.hipHalfW * ease, rz: rig.hipHalfD * ease },
        ],
        radial,
        false,
        false,
      ),
      mat,
    );
    belt.userData.partId = g.id;
    group.add(belt);
  }

  if (g.kind === 'skirt') {
    const sections: Section[] = [
      { center: new THREE.Vector3(0, rig.waistY + oy, 0), rx: rig.waistHalfW * 1.05, rz: rig.waistHalfD * 1.05 },
      { center: new THREE.Vector3(0, rig.hipY + oy, 0), rx: rig.hipHalfW * 1.12, rz: rig.hipHalfD * 1.12 },
      { center: new THREE.Vector3(0, rig.crotchY - 0.06 + oy, 0), rx: rig.hipHalfW * 1.3, rz: rig.hipHalfD * 1.3 },
      { center: new THREE.Vector3(0, rig.kneeY + 0.06 + oy, 0), rx: rig.hipHalfW * 1.5, rz: rig.hipHalfD * 1.5 },
    ];
    const mesh = new THREE.Mesh(loftSections(sections, radial, false, false), mat);
    mesh.userData.partId = g.id;
    group.add(mesh);
  }

  if (g.kind === 'shoes') {
    for (const side of [-1, 1]) {
      const shoe = new THREE.Mesh(
        ellipsoid(0.023 * rig.height, 0.014 * rig.height, 0.042 * rig.height, 16, 12),
        mat,
      );
      shoe.position.set(side * rig.hipHalfW * 0.45, rig.ankleY - 0.012, 0.016);
      shoe.userData.partId = g.id;
      group.add(shoe);
    }
  }

  if (g.kind === 'hat') {
    const crown = new THREE.Mesh(
      loftSections(
        [
          { center: new THREE.Vector3(0, rig.crownY - rig.headHeight * 0.12, 0), rx: rig.headRadiusX * 1.12, rz: rig.headRadiusZ * 1.12 },
          { center: new THREE.Vector3(0, rig.crownY + 0.015, 0), rx: rig.headRadiusX * 1.05, rz: rig.headRadiusZ * 1.05 },
        ],
        radial,
        false,
        true,
      ),
      mat,
    );
    crown.userData.partId = g.id;
    group.add(crown);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(rig.headRadiusX * 1.7, rig.headRadiusX * 1.7, 0.004, radial), mat);
    brim.position.set(0, rig.crownY - rig.headHeight * 0.12, 0);
    brim.userData.partId = g.id;
    group.add(brim);
  }

  return group;
}

export function buildGlasses(rig: BodyRig, cfg: ClothingState['glasses']): THREE.Group {
  const group = new THREE.Group();
  group.name = 'glasses';
  if (!cfg.visible) return group;
  const mat = new THREE.MeshStandardMaterial({ color: cfg.color, roughness: 0.4, metalness: 0.4 });
  const w = cfg.shape === 'square' ? 0.016 : cfg.shape === 'round' ? 0.014 : 0.015;
  const h = cfg.shape === 'round' ? w : 0.012;
  const eyeSpacing = rig.headRadiusX * 0.42;
  const z = rig.headRadiusZ * 0.95;

  for (const side of [-1, 1]) {
    const rim = cfg.shape === 'round'
      ? new THREE.Mesh(new THREE.TorusGeometry(w, 0.0008, 8, 24), mat)
      : new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 4, 4), mat);
    if (cfg.shape !== 'round') {
      rim.geometry = new THREE.TorusGeometry(w, 0.0008, 4, 4);
      rim.scale.set(1, h / w, 1);
    } else {
      rim.scale.set(1, h / w, 1);
    }
    rim.position.set(side * eyeSpacing, rig.eyeY, z);
    rim.userData.partId = 'glasses';
    group.add(rim);
    // テンプル（耳への腕）
    const temple = new THREE.Mesh(
      tubeAlongPath(
        [
          new THREE.Vector3(side * (eyeSpacing + w), rig.eyeY, z),
          new THREE.Vector3(side * rig.headRadiusX * 0.95, rig.eyeY + 0.004, 0),
        ],
        () => ({ rx: 0.0009, rz: 0.0009 }),
        4,
        6,
      ),
      mat,
    );
    temple.userData.partId = 'glasses';
    group.add(temple);
  }
  // ブリッジ
  const bridge = new THREE.Mesh(
    tubeAlongPath(
      [
        new THREE.Vector3(-eyeSpacing + w * 0.8, rig.eyeY, z),
        new THREE.Vector3(0, rig.eyeY + 0.002, z + 0.001),
        new THREE.Vector3(eyeSpacing - w * 0.8, rig.eyeY, z),
      ],
      () => ({ rx: 0.0008, rz: 0.0008 }),
      6,
      6,
    ),
    mat,
  );
  bridge.userData.partId = 'glasses';
  group.add(bridge);
  return group;
}

export function buildAccessory(rig: BodyRig, kind: 'earring' | 'necklace', visible: boolean, color: string): THREE.Group {
  const group = new THREE.Group();
  if (!visible) return group;
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.85 });
  if (kind === 'earring') {
    for (const side of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.003, 10, 8), mat);
      e.position.set(side * rig.headRadiusX * 1.0, rig.eyeY - 0.017, 0);
      e.userData.partId = `accessory-${kind}`;
      group.add(e);
    }
  } else {
    const pts: THREE.Vector3[] = [];
    const n = 16;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const a = Math.PI * (0.15 + t * 0.7);
      pts.push(new THREE.Vector3(Math.cos(a) * rig.neckRadius * 1.5, rig.neckBaseY + 0.01 - Math.sin(a) * 0.03, Math.sin(a) * rig.neckRadius * 1.3 + rig.neckRadius * 0.4));
    }
    const chain = new THREE.Mesh(tubeAlongPath(pts, () => ({ rx: 0.0008, rz: 0.0008 }), 20, 6, false, false), mat);
    chain.userData.partId = `accessory-${kind}`;
    group.add(chain);
  }
  return group;
}
