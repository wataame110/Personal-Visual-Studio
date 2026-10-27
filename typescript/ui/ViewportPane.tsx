// 3DビューポートのReactラッパー（メイン＋比較ビュー）
import { useEffect, useRef } from 'react';
import { Viewport, CAMERA_PRESETS } from '../engine/viewport';
import { buildBody } from '../engine/bodyBuilder';
import { useEditorStore } from '../core/store';
import * as THREE from 'three';

interface Props {
  compare?: boolean;
  viewportRef?: React.MutableRefObject<Viewport | null>;
  onPickPoint?: (p: THREE.Vector3) => void;
  pickMode?: boolean;
}

export function ViewportPane({ compare, viewportRef, onPickPoint, pickMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const localRef = useRef<Viewport | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const store = useEditorStore();

  // 初期化
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const vp = new Viewport(canvas);
    localRef.current = vp;
    if (viewportRef) viewportRef.current = vp;
    if (!vp.isWebGlAvailable) {
      useEditorStore.getState().setWebglFailed(true);
      return;
    }
    vp.onSelect = (partId) => {
      if (partId && !partId.startsWith('g-') && !partId.startsWith('hair') && !partId.startsWith('accessory') && partId !== 'glasses' && partId !== 'imported') {
        useEditorStore.getState().selectPart(partId);
      } else {
        useEditorStore.getState().selectPart(null);
      }
    };
    vp.onPickPoint = (p) => onPickPoint?.(p);
    vp.pickMode = pickMode ?? false;

    const observer = new ResizeObserver(() => {
      vp.resize(wrap.clientWidth, wrap.clientHeight);
    });
    observer.observe(wrap);
    vp.resize(wrap.clientWidth, wrap.clientHeight);
    return () => {
      observer.disconnect();
      vp.dispose();
      localRef.current = null;
      if (viewportRef) viewportRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (localRef.current) localRef.current.pickMode = pickMode ?? false;
  }, [pickMode]);

  // モデル再構築（比較ビューはシナリオの状態を表示）
  useEffect(() => {
    const vp = localRef.current;
    if (!vp) return;
    let parts = store.parts;
    let globals = store.globals;
    let hair = store.hair;
    let clothing = store.clothing;
    if (compare && store.compareScenarioId) {
      const sc = store.scenarios.find((s) => s.id === store.compareScenarioId);
      if (sc) {
        parts = sc.parts;
        globals = sc.globals;
        hair = sc.hair;
        clothing = sc.clothing;
      }
    }
    const group = buildBody({
      parts,
      globals,
      hair,
      clothing,
      medicalMode: store.mode === 'medical',
      quality: store.quality,
      hairRemoval: store.hairRemoval,
    });
    vp.setBody(group);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    store.parts,
    store.globals,
    store.hair,
    store.clothing,
    store.mode,
    store.quality,
    store.hairRemoval,
    compare ? store.compareScenarioId : null,
    compare ? store.scenarios : null,
  ]);

  // 注釈マーカー
  useEffect(() => {
    localRef.current?.setAnnotations(store.annotations);
  }, [store.annotations]);

  // カメラプリセット要求の処理（メインビューポートのみ）
  useEffect(() => {
    if (compare) return;
    if (store.cameraPresetRequest) {
      if (store.cameraPresetRequest === 'reset') {
        localRef.current?.applyPreset('front');
      } else {
        localRef.current?.applyPreset(store.cameraPresetRequest);
      }
      store.clearCameraPresetRequest();
      // カメラ同期が有効なら比較ビューにも伝播（ComparePane側で購読）
      window.dispatchEvent(new CustomEvent('pvs-camera-sync', { detail: store.cameraPresetRequest }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.cameraPresetRequest]);

  useEffect(() => {
    if (compare) return;
    if (store.focusPartRequest) {
      localRef.current?.focusPart(store.focusPartRequest);
      store.clearFocusPartRequest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.focusPartRequest]);

  // カメラ同期（比較ビュー側）
  useEffect(() => {
    if (!compare) return;
    const handler = (e: Event) => {
      if (!useEditorStore.getState().cameraSync) return;
      const preset = (e as CustomEvent<string>).detail;
      if (preset && preset !== 'reset') localRef.current?.applyPreset(preset);
      else if (preset === 'reset') localRef.current?.applyPreset('front');
    };
    window.addEventListener('pvs-camera-sync', handler);
    return () => window.removeEventListener('pvs-camera-sync', handler);
  }, [compare]);

  return (
    <div ref={wrapRef} className={compare ? 'compare-pane' : 'viewport-wrap'}>
      {store.webglFailed && (
        <div className="notice danger" style={{ position: 'absolute', top: 8, left: 8, right: 8, zIndex: 5 }}>
          このブラウザではWebGLを利用できません。3D表示にはWebGL対応環境が必要です。
        </div>
      )}
      <canvas ref={canvasRef} />
      {!compare && store.photoOverlayVisible && store.sourcePhoto && (
        <div className="photo-overlay" style={{ opacity: store.photoOverlayOpacity }}>
          <div className="photo-frame">
            <img src={store.sourcePhoto} alt="元写真の重ね合わせ" draggable={false} />
            {store.photoLandmarks.map((lm, i) => (
              <span
                key={i}
                className={`photo-landmark ${lm.label.startsWith('pose') ? 'pose' : 'face'}`}
                style={{ left: `${lm.x * 100}%`, top: `${lm.y * 100}%` }}
              />
            ))}
          </div>
        </div>
      )}
      {!compare && store.sourcePhoto && (
        <div className="photo-compare-controls">
          <label>
            <input
              type="checkbox"
              checked={store.photoOverlayVisible}
              onChange={(e) => store.setPhotoOverlayVisible(e.target.checked)}
            />
            写真を重ねる
          </label>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={store.photoOverlayOpacity}
            disabled={!store.photoOverlayVisible}
            aria-label="重ね合わせ透明度"
            onChange={(e) => store.setPhotoOverlayOpacity(Number(e.target.value))}
          />
          <label>
            <input
              type="checkbox"
              checked={store.photoCompareVisible}
              onChange={(e) => store.setPhotoCompareVisible(e.target.checked)}
            />
            写真を並列表示
          </label>
        </div>
      )}
      {!compare && (
        <div className="viewport-overlay" role="toolbar" aria-label="視点プリセット">
          {Object.entries(CAMERA_PRESETS)
            .filter(([k]) => (store.mode === 'medical' ? true : !['chest', 'genital'].includes(k)))
            .map(([key, p]) => (
              <button key={key} onClick={() => store.requestCameraPreset(key)} title={`${p.label}表示`}>
                {p.label}
              </button>
            ))}
        </div>
      )}
      {compare && <div className="compare-label">比較：{store.scenarios.find((s) => s.id === store.compareScenarioId)?.name ?? ''}</div>}
    </div>
  );
}
