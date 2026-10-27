// エディタページ：2Dモンタージュ合成エディタ（ポーズ対応）
import { useRef, useState, useEffect, useCallback } from 'react';
import { useEditorStore } from '../core/store';
import { MontageEngine } from '../core/montage';
import { Toolbar } from '../ui/Toolbar';
import { PartTree } from '../ui/PartTree';
import { ParamPanel } from '../ui/ParamPanel';
import { GlobalBodyPanel, HairPanel, ClothingPanel } from '../ui/BodyPanels';
import { PosePanel } from '../ui/PosePanel';
import { BottomPanel } from '../ui/BottomPanel';
import { HelpModal } from '../ui/HelpModal';

interface Props {
  mode: 'general' | 'medical';
}

export default function EditorPage({ mode }: Props) {
  const store = useEditorStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<MontageEngine | null>(null);
  const [viewMode, setViewMode] = useState<'face' | 'fullbody'>('face');
  const [rightTab, setRightTab] = useState<'part' | 'body' | 'hair' | 'clothing' | 'pose'>('part');
  const [showHelp, setShowHelp] = useState(false);
  const [status, setStatus] = useState('');
  const [showAdult, setShowAdult] = useState(false);

  useEffect(() => {
    store.setMode(mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ステータスメッセージの自動消去
  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(''), 6000);
    return () => clearTimeout(t);
  }, [status]);

  const render = useCallback(() => {
    if (!canvasRef.current) return;
    if (!engineRef.current) {
      engineRef.current = new MontageEngine(canvasRef.current);
    }
    engineRef.current.render(
      store.parts,
      store.hair,
      store.clothing,
      store.globals,
      store.pose,
      {
        width: viewMode === 'face' ? 1024 : 768,
        height: viewMode === 'face' ? 1024 : 1536,
        mode: viewMode,
      }
    );
  }, [store.parts, store.hair, store.clothing, store.globals, store.pose, viewMode]);

  useEffect(() => {
    render();
  }, [render]);

  // キーボードショートカット
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;
      if (e.isComposing) return;
      const s = useEditorStore.getState();
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault();
        s.undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z')) && !typing) {
        e.preventDefault();
        s.redo();
      } else if (e.key === 'F1') {
        e.preventDefault();
        setShowHelp((v) => !v);
      } else if (!typing && e.key === '1') {
        setViewMode('face');
      } else if (!typing && e.key === '2') {
        setViewMode('fullbody');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onStatus = (msg: string) => setStatus(msg);

  const exportImage = useCallback(() => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `montage-${Date.now()}.png`;
    a.click();
    onStatus('PNG画像を保存しました。');
  }, [onStatus]);

  return (
    <div className="app-shell">
      <Toolbar mode={mode} onOpenHelp={() => setShowHelp(true)} onStatus={onStatus} onExportImage={exportImage} />
      {mode === 'medical' && (
        <div className="notice" style={{ margin: 0, borderRadius: 0 }}>
          医療モード：視覚的説明支援のためのシミュレーションです。医学的な診断や治療結果の確定的予測ではありません。
        </div>
      )}
      <div className="editor-main">
        <div className="panel-left">
          <PartTree mode={mode} />
        </div>
        <div className="panel-center">
          <div className="montage-toolbar">
            <button className={viewMode === 'face' ? 'active' : ''} onClick={() => setViewMode('face')}>顔 (1)</button>
            <button className={viewMode === 'fullbody' ? 'active' : ''} onClick={() => setViewMode('fullbody')}>全身 (2)</button>
          </div>
          <div className="montage-canvas-wrap">
            <canvas ref={canvasRef} className="montage-canvas" />
          </div>
        </div>
        <div className="panel-right">
          <div className="tabs">
            <button className={rightTab === 'part' ? 'active' : ''} onClick={() => setRightTab('part')}>部位</button>
            <button className={rightTab === 'body' ? 'active' : ''} onClick={() => setRightTab('body')}>全身</button>
            <button className={rightTab === 'hair' ? 'active' : ''} onClick={() => setRightTab('hair')}>髪</button>
            {mode === 'general' && (
              <button className={rightTab === 'clothing' ? 'active' : ''} onClick={() => setRightTab('clothing')}>衣服</button>
            )}
            <button className={rightTab === 'pose' ? 'active' : ''} onClick={() => setRightTab('pose')}>ポーズ</button>
          </div>
          {rightTab === 'part' && <ParamPanel />}
          {rightTab === 'body' && <GlobalBodyPanel />}
          {rightTab === 'hair' && <HairPanel />}
          {rightTab === 'clothing' && mode === 'general' && <ClothingPanel onStatus={onStatus} />}
          {rightTab === 'pose' && <PosePanel mode={mode} showAdult={showAdult} />}
        </div>
        <div className="panel-bottom">
          <BottomPanel onStatus={onStatus} />
          <div className="statusbar" style={{ marginTop: 6 }}>
            <span>{mode === 'medical' ? '医療モード' : '一般モード'}</span>
            <span>{status}</span>
            <span style={{ marginLeft: 'auto' }}>
              身長 {(store.globals.height * 100).toFixed(1)} cm / 履歴 {store.past.length}
            </span>
          </div>
        </div>
      </div>
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
