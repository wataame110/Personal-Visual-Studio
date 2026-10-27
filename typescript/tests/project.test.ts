// プロジェクト保存・復元のテスト
import { describe, it, expect } from 'vitest';
import { buildProjectFile, serializeProject, parseProject, ProjectParseError, mergeParts } from '../core/project';
import { createDefaultParts } from '../core/parts';
import { DEFAULTS } from '../core/store';

const baseInput = () => ({
  globals: structuredClone(DEFAULTS.globals),
  parts: createDefaultParts(),
  hair: structuredClone(DEFAULTS.hair),
  clothing: structuredClone(DEFAULTS.clothing),
  scenarios: [],
  scenarioData: {},
  annotations: [],
  measurements: [],
  hairRemoval: [],
  camera: { position: { x: 0, y: 1, z: 2.6 }, target: { x: 0, y: 0.95, z: 0 } },
});

describe('プロジェクトの保存・復元', () => {
  it('保存前後で形状パラメータが一致する', () => {
    const input = baseInput();
    input.parts.head.morph.width = 1.2;
    input.parts.breastL.morph.size = 1.5;
    input.parts.eyeR.morph.tilt = -5;
    input.globals.height = 1.72;
    input.hair.color = '#ff0000';

    const project = buildProjectFile(input);
    const json = serializeProject(project);
    const restored = parseProject(json);

    expect(restored.parts.head.morph.width).toBe(1.2);
    expect(restored.parts.breastL.morph.size).toBe(1.5);
    expect(restored.parts.eyeR.morph.tilt).toBe(-5);
    expect(restored.globals.height).toBe(1.72);
    expect(restored.hair.color).toBe('#ff0000');
    expect(restored.version).toBe(1);
  });

  it('破損ファイルはエラーになる', () => {
    expect(() => parseProject('{broken json')).toThrow(ProjectParseError);
    expect(() => parseProject('{"format":"other"}')).toThrow(ProjectParseError);
  });

  it('将来バージョンはエラーになる', () => {
    expect(() => parseProject(JSON.stringify({ format: 'pvsproj', version: 999 }))).toThrow(/バージョン/);
  });

  it('欠損した部位は既定値で補完される', () => {
    const merged = mergeParts({ head: { morph: { width: 1.1 } } as never });
    expect(merged.head.morph.width).toBe(1.1);
    // 他のパラメータは既定値
    expect(merged.head.morph.length).toBe(1);
    expect(merged.eyeL.morph.size).toBe(1);
    expect(merged.scrotum).toBeTruthy();
  });
});
