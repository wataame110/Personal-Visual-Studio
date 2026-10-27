// 3Dモデル構築のテスト（形状パラメータがジオメトリに反映されることの検証）
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildBody } from '../engine/bodyBuilder';
import { createDefaultParts } from '../core/parts';
import { DEFAULTS } from '../core/store';
import { validateGeometry } from '../engine/geometry';

const baseOptions = () => ({
  parts: createDefaultParts(),
  globals: structuredClone(DEFAULTS.globals),
  hair: structuredClone(DEFAULTS.hair),
  clothing: structuredClone(DEFAULTS.clothing),
  medicalMode: false,
  quality: 'low' as const,
});

function collectMeshes(root: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
  });
  return meshes;
}

describe('3D人体モデル構築', () => {
  it('全身モデルが有効なジオメトリで構築される', () => {
    const body = buildBody(baseOptions());
    const meshes = collectMeshes(body);
    expect(meshes.length).toBeGreaterThan(10);
    for (const m of meshes) {
      expect(validateGeometry(m.geometry)).toBe(true);
    }
  });

  it('身長パラメータがモデル高さに反映される', () => {
    const opts = baseOptions();
    opts.globals.height = 1.8;
    const body = buildBody(opts);
    const box = new THREE.Box3().setFromObject(body);
    expect(box.max.y).toBeGreaterThan(1.7);
    expect(box.max.y).toBeLessThan(1.95);
  });

  it('胸郭の幅パラメータが胴体メッシュの幅に反映される', () => {
    // バスト高さ付近の頂点幅で検証する（肩幅に支配されないよう）
    const bustWidth = (opts: ReturnType<typeof baseOptions>) => {
      const body = buildBody(opts);
      let width = 0;
      body.traverse((o) => {
        if (o.name === 'torso' && (o as THREE.Mesh).isMesh) {
          const pos = (o as THREE.Mesh).geometry.getAttribute('position') as THREE.BufferAttribute;
          let minX = Infinity;
          let maxX = -Infinity;
          for (let i = 0; i < pos.count; i++) {
            const y = pos.getY(i);
            // bustY ≈ 1.38 - 0.085*1.65 ≈ 1.24（デフォルト身長時）
            if (Math.abs(y - 1.24) < 0.02) {
              minX = Math.min(minX, pos.getX(i));
              maxX = Math.max(maxX, pos.getX(i));
            }
          }
          width = maxX - minX;
        }
      });
      return width;
    };
    const narrow = bustWidth(baseOptions());
    const opts = baseOptions();
    opts.parts.chest.morph.width = 1.3;
    expect(bustWidth(opts)).toBeGreaterThan(narrow);
  });

  it('左右の乳房を独立して変更できる（医療モード・裸体時）', () => {
    const opts = baseOptions();
    opts.medicalMode = true; // 一般モードは常時着衣のため乳房メッシュは非表示になる
    opts.parts.breastL.morph.size = 2.0;
    opts.parts.breastR.morph.size = 0.5;
    const body = buildBody(opts);
    let left: THREE.Object3D | undefined;
    let right: THREE.Object3D | undefined;
    body.traverse((o) => {
      if (o.name === 'breastL') left = o;
      if (o.name === 'breastR') right = o;
    });
    expect(left).toBeTruthy();
    expect(right).toBeTruthy();
    const bl = new THREE.Box3().setFromObject(left!);
    const br = new THREE.Box3().setFromObject(right!);
    expect(bl.getSize(new THREE.Vector3()).length()).toBeGreaterThan(br.getSize(new THREE.Vector3()).length());
  });

  it('一般モードの初期状態は着衣（トップス・パンツが表示）', () => {
    const c = structuredClone(DEFAULTS.clothing);
    const upper = c.garments.some((g) => g.visible && (g.kind === 'tops' || g.kind === 'outer' || g.kind === 'dress'));
    const lower = c.garments.some((g) => g.visible && (g.kind === 'pants' || g.kind === 'skirt' || g.kind === 'dress'));
    expect(upper).toBe(true);
    expect(lower).toBe(true);
  });

  it('着衣時は一般モードのGLBに乳房メッシュが含まれない', () => {
    // DEFAULT_CLOTHING は着衣状態なので、medicalMode: false では乳房が構築されない
    const body = buildBody(baseOptions());
    let hasBreast = false;
    body.traverse((o) => {
      if (o.name === 'breastL' || o.name === 'breastR') hasBreast = true;
    });
    expect(hasBreast).toBe(false);
  });

  it('男性型と女性型で体型プロポーションが異なる', () => {
    const female = baseOptions();
    female.globals.sex = 'female';
    const male = baseOptions();
    male.globals.sex = 'male';
    const widthOf = (opts: ReturnType<typeof baseOptions>) => {
      const body = buildBody(opts);
      let maxX = 0;
      body.traverse((o) => {
        if ((o as THREE.Mesh).isMesh && o.userData.partId === 'chest') {
          const pos = (o as THREE.Mesh).geometry.getAttribute('position') as THREE.BufferAttribute;
          for (let i = 0; i < pos.count; i++) maxX = Math.max(maxX, Math.abs(pos.getX(i)));
        }
      });
      return maxX;
    };
    // 男性型は女性型より肩・胸幅が広い
    expect(widthOf(male)).toBeGreaterThan(widthOf(female));
  });

  it('医療モードで外性器パーツが構築される', () => {
    const opts = baseOptions();
    opts.medicalMode = true;
    opts.globals.sex = 'female';
    const body = buildBody(opts);
    const partIds = new Set<string>();
    body.traverse((o) => {
      if (o.userData.partId) partIds.add(o.userData.partId);
    });
    expect(partIds.has('monsPubis')).toBe(true);
    expect(partIds.has('clitoralGlans')).toBe(true);
    expect(partIds.has('labiaMajoraL')).toBe(true);
    expect(partIds.has('labiaMinoraR')).toBe(true);
    expect(partIds.has('vestibule')).toBe(true);
  });

  it('男性体型では男性外性器が構築される', () => {
    const opts = baseOptions();
    opts.medicalMode = true;
    opts.globals.sex = 'male';
    const body = buildBody(opts);
    const partIds = new Set<string>();
    body.traverse((o) => {
      if (o.userData.partId) partIds.add(o.userData.partId);
    });
    expect(partIds.has('penisShaft')).toBe(true);
    expect(partIds.has('glans')).toBe(true);
    expect(partIds.has('scrotum')).toBe(true);
  });

  it('陰茎の湾曲パラメータが形状（頂点位移）に反映される', () => {
    const straight = buildBody({ ...baseOptions(), medicalMode: true, globals: { ...structuredClone(DEFAULTS.globals), sex: 'male' } });
    const opts = baseOptions();
    opts.medicalMode = true;
    opts.globals.sex = 'male';
    opts.parts.penisShaft.morph.curveLR = 40;
    const curved = buildBody(opts);
    const tipOf = (root: THREE.Object3D) => {
      let maxX = -Infinity;
      root.traverse((o) => {
        if (o.userData.partId === 'penisShaft' && (o as THREE.Mesh).isMesh) {
          const pos = (o as THREE.Mesh).geometry.getAttribute('position') as THREE.BufferAttribute;
          for (let i = 0; i < pos.count; i++) maxX = Math.max(maxX, Math.abs(pos.getX(i)));
        }
      });
      return maxX;
    };
    expect(tipOf(curved)).toBeGreaterThan(tipOf(straight) + 0.005);
  });

  it('非表示にした部位は構築されない', () => {
    const opts = baseOptions();
    opts.parts.earL.visible = false;
    const body = buildBody(opts);
    const partIds = new Set<string>();
    body.traverse((o) => {
      if (o.userData.partId) partIds.add(o.userData.partId);
    });
    expect(partIds.has('earL')).toBe(false);
    expect(partIds.has('earR')).toBe(true);
  });

  it('衣服の表示切替が反映される', () => {
    const opts = baseOptions();
    opts.clothing.garments[0].visible = true; // tops
    const body = buildBody(opts);
    const ids = new Set<string>();
    body.traverse((o) => {
      if (o.userData.partId) ids.add(o.userData.partId);
    });
    expect(ids.has('g-tops')).toBe(true);
  });
});
