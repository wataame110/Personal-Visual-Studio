// Undo/Redo・編集状態のテスト
import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../src/core/store';

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
