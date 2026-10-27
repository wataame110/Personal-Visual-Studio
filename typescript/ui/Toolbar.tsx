// 上部ツールバー：ファイル操作・履歴・出力
import { useRef } from 'react';
import { navigate } from '../App';
import { useEditorStore } from '../core/store';
import { useAuthStore } from '../auth/authStore';
import { buildProjectFile, serializeProject, parseProject, downloadBlob, ProjectParseError } from '../core/project';

interface Props {
  mode: 'general' | 'medical';
  onOpenHelp: () => void;
  onStatus: (msg: string) => void;
  onExportImage: () => void;
}

export function Toolbar({ mode, onOpenHelp, onStatus, onExportImage }: Props) {
  const store = useEditorStore();
  const auth = useAuthStore();
  const openFileRef = useRef<HTMLInputElement>(null);

  const saveProject = () => {
    const scenarioData: Record<string, { parts: typeof store.parts; globals: typeof store.globals; hair: typeof store.hair; clothing: typeof store.clothing; pose: typeof store.pose }> = {};
    for (const sc of store.scenarios) {
      scenarioData[sc.id] = { parts: sc.parts, globals: sc.globals, hair: sc.hair, clothing: sc.clothing, pose: sc.pose };
    }
    const project = buildProjectFile({
      globals: store.globals,
      parts: store.parts,
      hair: store.hair,
      clothing: store.clothing,
      pose: store.pose,
      scenarios: store.scenarios.map((s) => ({ id: s.id, name: s.name, createdAt: s.createdAt })),
      scenarioData,
      annotations: store.annotations,
      measurements: store.measurements,
      hairRemoval: store.hairRemoval,
      camera: { position: { x: 0, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 } },
    });
    const blob = new Blob([serializeProject(project)], { type: 'application/json' });
    downloadBlob(blob, `montage-project-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.pvsproj`);
    onStatus('プロジェクトを保存しました。');
  };

  const openProject = async (file: File) => {
    try {
      const text = await file.text();
      const project = parseProject(text);
      store.loadSnapshot({ parts: project.parts, globals: project.globals, hair: project.hair, clothing: project.clothing, pose: project.pose });
      store.setHairRemoval(project.hairRemoval);
      for (const id of [...store.annotations.map((a) => a.id)]) store.removeAnnotation(id);
      for (const a of project.annotations) store.addAnnotation(a);
      for (const id of [...store.measurements.map((m) => m.id)]) store.removeMeasurement(id);
      for (const m of project.measurements) store.addMeasurement(m);
      const current = useEditorStore.getState();
      for (const sc of [...current.scenarios]) current.deleteScenario(sc.id);
      const restored = project.scenarios
        .map((meta) => {
          const data = project.scenarioData[meta.id];
          if (!data) return null;
          return { ...meta, ...data, annotations: [] };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);
      useEditorStore.setState({ scenarios: restored });
      onStatus(`プロジェクトを読み込みました（保存日時: ${new Date(project.savedAt).toLocaleString('ja-JP')}）。`);
    } catch (e) {
      if (e instanceof ProjectParseError) {
        onStatus(`読み込みエラー: ${e.message}`);
      } else {
        onStatus('読み込みに失敗しました。ファイルが破損している可能性があります。');
      }
    }
  };

  return (
    <div className="toolbar" role="toolbar" aria-label="メインツールバー">
      <div className="group">
        <button onClick={() => navigate('home')} title="トップへ戻る">← トップ</button>
        {mode === 'medical' && (
          <button onClick={() => { auth.logout(); navigate('home'); }} title="ログアウト">ログアウト</button>
        )}
      </div>
      <div className="group">
        <button onClick={() => { if (window.confirm('現在の編集内容をリセットしますか？（Undo で戻せます）')) store.resetAll(); }}>
          新規
        </button>
        <button onClick={() => openFileRef.current?.click()}>開く (.pvsproj)</button>
        <button onClick={saveProject} title="Ctrl+S">保存 (.pvsproj)</button>
        <input ref={openFileRef} type="file" accept=".pvsproj,application/json" hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void openProject(f); e.target.value = ''; }} />
      </div>
      <div className="group">
        <button onClick={() => store.undo()} disabled={!store.canUndo()} title="Ctrl+Z">元に戻す</button>
        <button onClick={() => store.redo()} disabled={!store.canRedo()} title="Ctrl+Y / Ctrl+Shift+Z">やり直し</button>
      </div>
      <div className="group">
        <button onClick={onExportImage}>PNG画像出力</button>
      </div>
      <div className="spacer" />
      <div className="group">
        <label htmlFor="ui-level">UIモード</label>
        <select id="ui-level" value={store.uiLevel} onChange={(e) => store.setUiLevel(e.target.value as 'beginner' | 'expert')} style={{ width: 'auto' }}>
          <option value="beginner">簡易</option>
          <option value="expert">詳細</option>
        </select>
        <button onClick={onOpenHelp} title="F1">ヘルプ</button>
      </div>
    </div>
  );
}
