// エディタページ（一般モード・医療モード共通）
import { useRef, useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useEditorStore } from '../core/store';
import { Viewport } from '../engine/viewport';
import { ViewportPane } from '../ui/ViewportPane';
import { Toolbar } from '../ui/Toolbar';
import { PartTree } from '../ui/PartTree';
import { ParamPanel } from '../ui/ParamPanel';
import { GlobalBodyPanel, HairPanel, ClothingPanel } from '../ui/BodyPanels';
import { BottomPanel } from '../ui/BottomPanel';
import { MeasurePanel, HairRemovalPanel, type MeasureMode } from '../ui/MedicalPanels';
import { PhotoPanel } from '../ui/PhotoPanel';
import { HelpModal } from '../ui/HelpModal';
import { CAMERA_PRESETS } from '../engine/viewport';

interface Props {
  mode: 'general' | 'medical';
}

export default function EditorPage({ mode }: Props) {
  const store = useEditorStore();
  const viewportRef = useRef<Viewport | null>(null);
  const [rightTab, setRightTab] = useState<'part' | 'body' | 'hair' | 'clothing' | 'measure' | 'hairRemoval'>('part');
  const [showHelp, setShowHelp] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [status, setStatus] = useState('');
  const [sourcePhoto, setSourcePhoto] = useState<string | undefined>();
  const [photoLandmarks, setPhotoLandmarks] = useState<{ x: number; y: number; label: string }[]>([]);
  const [measureMode, setMeasureMode] = useState<MeasureMode>('off');
  const [pickedPoints, setPickedPoints] = useState<THREE.Vector3[]>([]);

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

  // 計測点マーカーの反映
  useEffect(() => {
    viewportRef.current?.setMeasurementMarkers(pickedPoints.map((p) => ({ x: p.x, y: p.y, z: p.z })));
  }, [pickedPoints]);

  const handlePickPoint = useCallback((p: THREE.Vector3) => {
    setPickedPoints((prev) => {
      const limit = measureMode === 'angle' ? 3 : measureMode === 'distance' ? 2 : 1;
      const next = [...prev, p];
      return next.length > limit ? next.slice(-limit) : next;
    });
  }, [measureMode]);

  // キーボードショートカット（IME入力中・フォーム入力中は無効化）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;
      if (e.isComposing) return; // 日本語IME変換中は無視
      const s = useEditorStore.getState();
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault();
        s.undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z')) && !typing) {
        e.preventDefault();
        s.redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        // 保存はツールバーのボタン経由（ファイルダイアログを開くためユーザー操作が必要）
        onStatus('ツールバーの「保存 (.pvsproj)」ボタンから保存してください。');
      } else if (e.key === 'F1') {
        e.preventDefault();
        setShowHelp((v) => !v);
      } else if (!typing && /^[1-9]$/.test(e.key)) {
        const keys = Object.keys(CAMERA_PRESETS);
        const idx = Number(e.key) - 1;
        if (idx < keys.length) s.requestCameraPreset(keys[idx]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onStatus = (msg: string) => setStatus(msg);

  return (
    <div className="app-shell">
      <Toolbar
        viewportRef={viewportRef}
        mode={mode}
        sourcePhoto={sourcePhoto}
        photoLandmarks={photoLandmarks}
        onOpenHelp={() => setShowHelp(true)}
        onOpenPhoto={() => setShowPhoto(true)}
        onStatus={onStatus}
      />
      {mode === 'medical' && (
        <div className="notice" style={{ margin: 0, borderRadius: 0 }}>
          医療モード：視覚的説明支援のためのシミュレーションです。医学的な診断や治療結果の確定的予測ではありません。
          開発・検証版では実患者情報を使用しないでください。
        </div>
      )}
      <div className="editor-main">
        <div className="panel-left">
          <PartTree mode={mode} />
        </div>
        <div className="panel-center">
          <ViewportPane viewportRef={viewportRef} pickMode={measureMode !== 'off'} onPickPoint={handlePickPoint} />
          {store.compareScenarioId && <ViewportPane compare />}
        </div>
        <div className="panel-right">
          <div className="tabs">
            <button className={rightTab === 'part' ? 'active' : ''} onClick={() => setRightTab('part')}>部位</button>
            <button className={rightTab === 'body' ? 'active' : ''} onClick={() => setRightTab('body')}>全身</button>
            <button className={rightTab === 'hair' ? 'active' : ''} onClick={() => setRightTab('hair')}>髪</button>
            {mode === 'general' && (
              <button className={rightTab === 'clothing' ? 'active' : ''} onClick={() => setRightTab('clothing')}>衣服</button>
            )}
            {mode === 'medical' && (
              <>
                <button className={rightTab === 'measure' ? 'active' : ''} onClick={() => setRightTab('measure')}>計測</button>
                <button className={rightTab === 'hairRemoval' ? 'active' : ''} onClick={() => setRightTab('hairRemoval')}>脱毛</button>
              </>
            )}
          </div>
          {rightTab === 'part' && <ParamPanel />}
          {rightTab === 'body' && <GlobalBodyPanel />}
          {rightTab === 'hair' && <HairPanel />}
          {rightTab === 'clothing' && mode === 'general' && <ClothingPanel onStatus={onStatus} />}
          {rightTab === 'measure' && mode === 'medical' && (
            <MeasurePanel
              measureMode={measureMode}
              setMeasureMode={setMeasureMode}
              pickedPoints={pickedPoints}
              clearPicked={() => setPickedPoints([])}
              onStatus={onStatus}
            />
          )}
          {rightTab === 'hairRemoval' && mode === 'medical' && <HairRemovalPanel onStatus={onStatus} />}
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
      {showPhoto && (
        <PhotoPanel
          onClose={() => setShowPhoto(false)}
          onStatus={onStatus}
          initialPhoto={sourcePhoto}
          onPhotoLoaded={(dataUrl, landmarks) => {
            setSourcePhoto(dataUrl);
            setPhotoLandmarks(landmarks);
          }}
        />
      )}
    </div>
  );
}
