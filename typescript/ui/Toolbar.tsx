// 上部ツールバー：ファイル操作・モード・履歴・出力
import { useRef, useState } from 'react';
import { navigate } from '../App';
import { useEditorStore } from '../core/store';
import { useAuthStore } from '../auth/authStore';
import { buildProjectFile, serializeProject, parseProject, downloadBlob, dataUrlToBlob, ProjectParseError } from '../core/project';
import type { Viewport } from '../engine/viewport';
import { ExportImageDialog } from './ExportImageDialog';

interface Props {
  viewportRef: React.MutableRefObject<Viewport | null>;
  mode: 'general' | 'medical';
  sourcePhoto?: string;
  photoLandmarks?: { x: number; y: number; label: string }[];
  onOpenHelp: () => void;
  onOpenPhoto: () => void;
  onStatus: (msg: string) => void;
}

export function Toolbar({ viewportRef, mode, sourcePhoto, photoLandmarks, onOpenHelp, onOpenPhoto, onStatus }: Props) {
  const store = useEditorStore();
  const auth = useAuthStore();
  const openFileRef = useRef<HTMLInputElement>(null);
  const importGlbRef = useRef<HTMLInputElement>(null);
  const [showExport, setShowExport] = useState(false);

  const saveProject = () => {
    const vp = viewportRef.current;
    const scenarioData: Record<string, { parts: typeof store.parts; globals: typeof store.globals; hair: typeof store.hair; clothing: typeof store.clothing }> = {};
    for (const sc of store.scenarios) {
      scenarioData[sc.id] = { parts: sc.parts, globals: sc.globals, hair: sc.hair, clothing: sc.clothing };
    }
    const project = buildProjectFile({
      globals: store.globals,
      parts: store.parts,
      hair: store.hair,
      clothing: store.clothing,
      scenarios: store.scenarios.map((s) => ({ id: s.id, name: s.name, createdAt: s.createdAt })),
      scenarioData,
      annotations: store.annotations,
      measurements: store.measurements,
      hairRemoval: store.hairRemoval,
      camera: vp?.getCameraState() ?? { position: { x: 0, y: 1, z: 2.6 }, target: { x: 0, y: 0.95, z: 0 } },
      sourcePhoto,
      photoLandmarks,
    });
    const blob = new Blob([serializeProject(project)], { type: 'application/json' });
    downloadBlob(blob, `pvs-project-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.pvsproj`);
    onStatus('プロジェクトを保存しました。');
  };

  const openProject = async (file: File) => {
    try {
      const text = await file.text();
      const project = parseProject(text);
      store.loadSnapshot({ parts: project.parts, globals: project.globals, hair: project.hair, clothing: project.clothing });
      store.setHairRemoval(project.hairRemoval);
      for (const id of [...store.annotations.map((a) => a.id)]) store.removeAnnotation(id);
      for (const a of project.annotations) store.addAnnotation(a);
      for (const id of [...store.measurements.map((m) => m.id)]) store.removeMeasurement(id);
      for (const m of project.measurements) store.addMeasurement(m);
      // シナリオ復元
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
      viewportRef.current?.setCameraState(project.camera);
      onStatus(`プロジェクトを読み込みました（保存日時: ${new Date(project.savedAt).toLocaleString('ja-JP')}）。`);
    } catch (e) {
      if (e instanceof ProjectParseError) {
        onStatus(`読み込みエラー: ${e.message}`);
      } else {
        onStatus('読み込みに失敗しました。ファイルが破損している可能性があります。');
      }
    }
  };

  const exportGlb = async () => {
    const vp = viewportRef.current;
    if (!vp) return;
    try {
      const blob = await vp.exportGlb();
      downloadBlob(blob, `pvs-model-${Date.now()}.glb`);
      onStatus('GLBを出力しました。形状・マテリアルが保持されます。');
    } catch (e) {
      onStatus(`GLB出力に失敗しました: ${e instanceof Error ? e.message : '不明なエラー'}`);
    }
  };

  const importGlb = async (file: File) => {
    const vp = viewportRef.current;
    if (!vp) return;
    try {
      await vp.importGlb(file);
      onStatus('GLBを読み込みました（参照モデルとして表示）。');
    } catch {
      onStatus('GLBの読み込みに失敗しました。対応形式のファイルか確認してください。');
    }
  };

  const importBundledCc0 = async () => {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}models/cc0/human-base-rigged.glb`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await importGlb(new File([await response.blob()], 'human-base-rigged.glb', { type: 'model/gltf-binary' }));
      onStatus('CC0人体ベースメッシュを読み込みました（参照モデルとして表示）。');
    } catch {
      onStatus('CC0人体ベースメッシュを読み込めませんでした。配信ファイルを確認してください。');
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
        <button onClick={onOpenPhoto}>写真取込・解析</button>
        <button onClick={() => importGlbRef.current?.click()}>GLB読込</button>
        <button onClick={() => void importBundledCc0()} title="MakeHuman/MPFB由来のCC0ベースメッシュ">CC0人体読込</button>
        <input ref={importGlbRef} type="file" accept=".glb,.gltf" hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void importGlb(f); e.target.value = ''; }} />
      </div>
      <div className="group">
        <button onClick={exportGlb}>GLB出力</button>
        <button onClick={() => setShowExport(true)}>画像出力</button>
      </div>
      <div className="spacer" />
      <div className="group">
        <label htmlFor="ui-level">UIモード</label>
        <select id="ui-level" value={store.uiLevel} onChange={(e) => store.setUiLevel(e.target.value as 'beginner' | 'expert')} style={{ width: 'auto' }}>
          <option value="beginner">簡易</option>
          <option value="expert">詳細</option>
        </select>
        <label htmlFor="quality">画質</label>
        <select id="quality" value={store.quality} onChange={(e) => store.setQuality(e.target.value as 'high' | 'low')} style={{ width: 'auto' }}>
          <option value="high">高</option>
          <option value="low">低（軽量）</option>
        </select>
        <button onClick={onOpenHelp} title="F1">ヘルプ</button>
      </div>
      {showExport && (
        <ExportImageDialog viewportRef={viewportRef} onClose={() => setShowExport(false)} onStatus={onStatus} />
      )}
    </div>
  );
}
