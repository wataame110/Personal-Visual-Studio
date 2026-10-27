// 下部パネル：履歴・比較案・注釈
import { useState } from 'react';
import { useEditorStore } from '../core/store';

interface Props {
  onStatus: (msg: string) => void;
}

export function BottomPanel({ onStatus }: Props) {
  const store = useEditorStore();
  const [scenarioName, setScenarioName] = useState('');

  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
      <div style={{ minWidth: 240 }}>
        <div className="section-title">編集履歴</div>
        <div className="statusbar">
          <span>Undo 可能: {store.past.length} 件</span>
          <span>Redo 可能: {store.future.length} 件</span>
          <button className="small" onClick={() => store.undo()} disabled={!store.canUndo()}>元に戻す (Ctrl+Z)</button>
          <button className="small" onClick={() => store.redo()} disabled={!store.canRedo()}>やり直し (Ctrl+Y)</button>
        </div>
      </div>

      <div style={{ minWidth: 300, flex: 1 }}>
        <div className="section-title">比較案（案A・案B・案C…）</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
          <input type="text" placeholder="案の名前（例: 案A）" value={scenarioName}
            onChange={(e) => setScenarioName(e.target.value)} style={{ width: 160 }} />
          <button className="small" onClick={() => {
            const name = scenarioName.trim() || `案${String.fromCharCode(65 + store.scenarios.length)}`;
            store.saveScenario(name);
            setScenarioName('');
            onStatus(`「${name}」を保存しました。`);
          }}>現在の状態を保存</button>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={store.cameraSync} onChange={(e) => store.setCameraSync(e.target.checked)} />
            カメラ同期
          </label>
        </div>
        <div>
          {store.scenarios.length === 0 && <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>保存された案はありません。</span>}
          {store.scenarios.map((sc) => (
            <span key={sc.id} className="scenario-chip">
              <strong>{sc.name}</strong>
              <button className="small" onClick={() => { store.applyScenario(sc.id); onStatus(`「${sc.name}」を適用しました。`); }}>適用</button>
              <button className="small" onClick={() => store.setCompareScenario(store.compareScenarioId === sc.id ? null : sc.id)}>
                {store.compareScenarioId === sc.id ? '比較終了' : '比較'}
              </button>
              <button className="small" onClick={() => store.duplicateScenario(sc.id)}>複製</button>
              <button className="small danger" onClick={() => store.deleteScenario(sc.id)}>削除</button>
            </span>
          ))}
        </div>
      </div>

      <div style={{ minWidth: 240 }}>
        <div className="section-title">注釈（{store.annotations.length}）</div>
        {store.annotations.length === 0 && <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>注釈はありません。計測パネルから追加できます。</span>}
        {store.annotations.map((a) => (
          <div key={a.id} style={{ display: 'flex', gap: 6, fontSize: 12, alignItems: 'center' }}>
            <span style={{ flex: 1 }}>{a.text}</span>
            <button className="small danger" onClick={() => store.removeAnnotation(a.id)}>削除</button>
          </div>
        ))}
      </div>
    </div>
  );
}
