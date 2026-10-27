// Undo/Redo・編集状態のテスト
import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../core/store';

describe('編集履歴（Undo/Redo）', () => {
  beforeEach(() => {
    useEditorStore.getState().resetAll();
    useEditorStore.setState({ past: [], future: [], scenarios: [] });
  });

  it('パラメータ変更がUndoで元に戻る', () => {
    const s = useEditorStore.getState();
    const before = s.parts.head.morph.width;
    s.setMorph('head', 'width', 1.3, 'manual');
    expect(useEditorStore.getState().parts.head.morph.width).toBe(1.3);
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().parts.head.morph.width).toBe(before);
  });

  it('Redoで変更が再適用される', () => {
    const s = useEditorStore.getState();
    s.setMorph('head', 'width', 1.3, 'manual');
    useEditorStore.getState().undo();
    useEditorStore.getState().redo();
    expect(useEditorStore.getState().parts.head.morph.width).toBe(1.3);
  });

  it('新しい変更でRedo履歴がクリアされる', () => {
    const s = useEditorStore.getState();
    s.setMorph('head', 'width', 1.3, 'manual');
    useEditorStore.getState().undo();
    useEditorStore.getState().setMorph('nose', 'tipSize', 1.5, 'manual');
    expect(useEditorStore.getState().canRedo()).toBe(false);
  });

  it('指定した部位以外は変形しない', () => {
    const s = useEditorStore.getState();
    const noseBefore = structuredClone(useEditorStore.getState().parts.nose);
    s.setMorph('eyeL', 'size', 1.5, 'manual');
    expect(useEditorStore.getState().parts.nose).toEqual(noseBefore);
  });

  it('左右独立編集が機能する', () => {
    const s = useEditorStore.getState();
    s.setMorph('breastL', 'size', 1.8, 'manual');
    expect(useEditorStore.getState().parts.breastL.morph.size).toBe(1.8);
    expect(useEditorStore.getState().parts.breastR.morph.size).toBe(1);
  });

  it('ロックされた部位は変更されない', () => {
    const s = useEditorStore.getState();
    s.togglePartLocked('head');
    useEditorStore.getState().setMorph('head', 'width', 1.4, 'manual');
    expect(useEditorStore.getState().parts.head.morph.width).toBe(1);
  });

  it('provenance が記録される', () => {
    const s = useEditorStore.getState();
    s.setMorph('head', 'width', 1.1, 'photo');
    expect(useEditorStore.getState().parts.head.provenance.width).toBe('photo');
  });

  it('シナリオの保存・適用ができる', () => {
    const s = useEditorStore.getState();
    s.setMorph('head', 'width', 1.25, 'manual');
    useEditorStore.getState().saveScenario('案A');
    useEditorStore.getState().setMorph('head', 'width', 0.9, 'manual');
    const scenarios = useEditorStore.getState().scenarios;
    expect(scenarios.length).toBe(1);
    useEditorStore.getState().applyScenario(scenarios[0].id);
    expect(useEditorStore.getState().parts.head.morph.width).toBe(1.25);
  });

  it('左右間でパラメータをコピーできる', () => {
    const s = useEditorStore.getState();
    s.setMorph('eyeL', 'size', 1.4, 'manual');
    useEditorStore.getState().copyPartParams('eyeL', 'eyeR');
    expect(useEditorStore.getState().parts.eyeR.morph.size).toBe(1.4);
  });
});

describe('一般モードの常時着衣保証', () => {
  beforeEach(() => {
    useEditorStore.getState().resetAll();
    useEditorStore.setState({ past: [], future: [], scenarios: [] });
    useEditorStore.getState().setMode('general');
  });

  const garment = (id: string) => useEditorStore.getState().clothing.garments.find((g) => g.id === id)!;
  const hasUpper = () => {
    const cs = useEditorStore.getState().clothing;
    return cs.garments.some((g) => g.visible && (g.kind === 'tops' || g.kind === 'outer' || g.kind === 'dress'));
  };
  const hasLower = () => {
    const cs = useEditorStore.getState().clothing;
    return cs.garments.some((g) => g.visible && (g.kind === 'pants' || g.kind === 'skirt' || g.kind === 'dress'));
  };

  it('初期状態でトップスとパンツが着用されている', () => {
    expect(garment('g-tops').visible).toBe(true);
    expect(garment('g-pants').visible).toBe(true);
    expect(hasUpper() && hasLower()).toBe(true);
  });

  it('一般モードで全衣服を非表示にできない（補正される）', () => {
    const s = useEditorStore.getState();
    // すべての衣服を非視に変更しようとする
    s.setClothing({
      garments: s.clothing.garments.map((g) => ({ ...g, visible: false })),
    });
    // 補正により上半身・下半身の衣服が強制的に着用される
    expect(hasUpper()).toBe(true);
    expect(hasLower()).toBe(true);
  });

  it('衣服を交換できる（トップス非表示→アウター表示）', () => {
    const s = useEditorStore.getState();
    s.setClothing({
      garments: s.clothing.garments.map((g) =>
        g.id === 'g-tops' ? { ...g, visible: false } : g.id === 'g-outer' ? { ...g, visible: true } : g,
      ),
    });
    expect(garment('g-tops').visible).toBe(false);
    expect(garment('g-outer').visible).toBe(true);
    expect(hasUpper()).toBe(true);
  });

  it('医療モードへの切替と Undo 後も一般モードでは着衣が維持される', () => {
    // 医療モードで全衣服を外す（医療では裸体を扱える）
    useEditorStore.getState().setMode('medical');
    const s = useEditorStore.getState();
    s.setClothing({ garments: s.clothing.garments.map((g) => ({ ...g, visible: false })) });
    expect(hasUpper()).toBe(false);
    // 一般モードへ戻すと着衣が保証される
    useEditorStore.getState().setMode('general');
    expect(hasUpper()).toBe(true);
    expect(hasLower()).toBe(true);
  });

  it('スナップショット読込（プロジェクト復元）でも着衣が維持される', () => {
    const s = useEditorStore.getState();
    // 裸体状態のスナップショットを直接読み込む（破損・旧バージョンファイル相当）
    const nude = structuredClone(s.clothing);
    nude.garments = nude.garments.map((g) => ({ ...g, visible: false }));
    s.loadSnapshot({ parts: s.parts, globals: s.globals, hair: s.hair, clothing: nude });
    expect(hasUpper()).toBe(true);
    expect(hasLower()).toBe(true);
  });
});

describe('性別テンプレート切替（データ保持）', () => {
  beforeEach(() => {
    useEditorStore.getState().resetAll();
    useEditorStore.setState({ past: [], future: [], scenarios: [] });
  });

  it('性別を切り替えても部位パラメータ・髪・衣服が保持される', () => {
    const s = useEditorStore.getState();
    s.setMorph('head', 'width', 1.3, 'manual');
    s.setHair({ color: '#aabbcc' });
    const topsColorBefore = s.clothing.garments.find((g) => g.id === 'g-tops')!.color;
    useEditorStore.getState().setGlobals({ sex: 'male' });
    const after = useEditorStore.getState();
    expect(after.globals.sex).toBe('male');
    expect(after.parts.head.morph.width).toBe(1.3);
    expect(after.hair.color).toBe('#aabbcc');
    expect(after.clothing.garments.find((g) => g.id === 'g-tops')!.color).toBe(topsColorBefore);
    // Undo で女性型に戻せる
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().globals.sex).toBe('female');
  });
});

describe('医療モードの初期状態（非着衣）', () => {
  beforeEach(() => {
    useEditorStore.setState({ mode: 'general' });
    useEditorStore.getState().resetAll();
    useEditorStore.setState({ past: [], future: [], scenarios: [] });
  });

  it('医療モードへ切り替えると全衣服が非着用になる', () => {
    useEditorStore.getState().setMode('medical');
    const cs = useEditorStore.getState().clothing;
    expect(cs.garments.every((g) => !g.visible)).toBe(true);
    expect(cs.glasses.visible).toBe(false);
    expect(cs.accessories.every((a) => !a.visible)).toBe(true);
  });

  it('医療モードでは衣服データが保持され自由に再着用できる', () => {
    useEditorStore.getState().setMode('medical');
    const s = useEditorStore.getState();
    // 衣服の設定（色・種類）は消えていない
    expect(s.clothing.garments.length).toBeGreaterThan(0);
    // 医療モードでは自由に着脱できる
    s.setClothing({
      garments: s.clothing.garments.map((g) => (g.id === 'g-tops' ? { ...g, visible: true } : g)),
    });
    const after = useEditorStore.getState();
    expect(after.clothing.garments.find((g) => g.id === 'g-tops')!.visible).toBe(true);
    expect(after.clothing.garments.find((g) => g.id === 'g-pants')!.visible).toBe(false);
  });

  it('医療モードで新規リセットしても非着衣のまま', () => {
    useEditorStore.getState().setMode('medical');
    useEditorStore.getState().setClothing({
      garments: useEditorStore.getState().clothing.garments.map((g) => ({ ...g, visible: true })),
    });
    useEditorStore.getState().resetAll();
    expect(useEditorStore.getState().clothing.garments.every((g) => !g.visible)).toBe(true);
  });

  it('同じモードへの再設定では着衣状態が変化しない', () => {
    useEditorStore.getState().setMode('medical');
    const before = structuredClone(useEditorStore.getState().clothing);
    useEditorStore.getState().setMode('medical');
    expect(useEditorStore.getState().clothing).toEqual(before);
  });
});

describe('本人写真の状態管理', () => {
  beforeEach(() => {
    useEditorStore.setState({ mode: 'general' });
    useEditorStore.getState().resetAll();
    useEditorStore.getState().setPhoto(null, []);
  });

  it('写真とランドマークを保持し、重ね合わせ・並列表示を制御できる', () => {
    const s = useEditorStore.getState();
    s.setPhoto('data:image/png;base64,xxxx', [{ x: 0.5, y: 0.3, label: 'face-1' }]);
    let st = useEditorStore.getState();
    expect(st.sourcePhoto).toBe('data:image/png;base64,xxxx');
    expect(st.photoLandmarks).toHaveLength(1);
    expect(st.photoOverlayVisible).toBe(false);
    st.setPhotoOverlayVisible(true);
    st.setPhotoOverlayOpacity(1.4);
    st.setPhotoCompareVisible(true);
    st = useEditorStore.getState();
    expect(st.photoOverlayVisible).toBe(true);
    expect(st.photoOverlayOpacity).toBe(1); // クランプされる
    expect(st.photoCompareVisible).toBe(true);
    // 写真を差し替えると比較表示はリセットされる
    st.setPhoto('data:image/png;base64,yyyy', []);
    st = useEditorStore.getState();
    expect(st.photoOverlayVisible).toBe(false);
    expect(st.photoCompareVisible).toBe(false);
  });
});
