// 写真編集ページ：実写真原本の画素を保持する写真ベース編集エンジンのUI
// 原則：
//  - 編集はすべて「マスク内のみ」。マスク外の画素は元写真とビット一致する（ops.ts/renderSession が保証）
//  - 非破壊編集（原本 + 操作列の再描画）。Undo/Redo・保存/復元は操作列の管理
//  - 画像は端末内のみで処理され、外部へ送信されない
import { useCallback, useEffect, useRef, useState } from 'react';
import { navigate } from '../App';
import type { RGBImage } from '../photo/composite';
import {
  applyBrush, createMask, cloneMask, maskCoverage, maskToOverlay, type Mask,
} from '../photo/mask';
import {
  createSession, setMask, pushOp, undoOp, redoOp, renderSession,
  serializeSession, deserializeSession, type EditSession,
} from '../photo/ops';
import { createField, addStroke, applyWarp, type WarpField } from '../photo/warp';
import {
  checkSegmentationAvailability, initSegmenter, segmentPhoto,
} from '../photo/segmentation';

interface Props {
  mode: 'general' | 'medical';
}

/** 編集解像度の上限（長辺）。ブラウザ内CPU処理の実用速度を優先し、取込時に縮小する */
const MAX_DIM = 1400;

type RegionId = 'hair' | 'face' | 'skin' | 'clothes' | 'custom';
type Tool = 'none' | 'brush-add' | 'brush-erase' | 'warp';
type ViewMode = 'after' | 'before' | 'split';

const REGION_LABELS: Record<RegionId, string> = {
  hair: '髪',
  face: '顔（肌）',
  skin: '体（肌）',
  clothes: '衣服',
  custom: 'カスタム',
};

function loadImageFile(file: File): Promise<{ img: RGBImage; dataUrl: string; scaled: boolean }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const el = new Image();
      el.onerror = () => reject(new Error('画像として読み込めませんでした'));
      el.onload = () => {
        let w = el.naturalWidth;
        let h = el.naturalHeight;
        const scale = Math.min(1, MAX_DIM / Math.max(w, h));
        const scaled = scale < 1;
        w = Math.round(w * scale);
        h = Math.round(h * scale);
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(el, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h);
        resolve({ img: { width: w, height: h, data: data.data }, dataUrl, scaled });
      };
      el.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export default function PhotoEditorPage({ mode }: Props) {
  const [original, setOriginal] = useState<RGBImage | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [session, setSession] = useState<EditSession | null>(null);
  const [region, setRegion] = useState<RegionId>('hair');
  const [tool, setTool] = useState<Tool>('none');
  const [brushRadius, setBrushRadius] = useState(24);
  const [view, setView] = useState<ViewMode>('after');
  const [showMask, setShowMask] = useState(true);
  const [status, setStatus] = useState('');
  const [segState, setSegState] = useState<'unknown' | 'running' | 'done' | 'unavailable'>('unknown');
  // 操作パラメータ
  const [hue, setHue] = useState(0);
  const [sat, setSat] = useState(1);
  const [lum, setLum] = useState(1);
  const [smoothStrength, setSmoothStrength] = useState(0.6);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beforeCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const openRef = useRef<HTMLInputElement>(null);
  // ワープドラッグ中の状態
  const warpStart = useRef<{ x: number; y: number } | null>(null);
  const [previewField, setPreviewField] = useState<WarpField | null>(null);
  const painting = useRef(false);

  const onStatus = useCallback((msg: string) => setStatus(msg), []);
  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(''), 6000);
    return () => clearTimeout(t);
  }, [status]);

  // ---- 描画 ----
  useEffect(() => {
    if (!original || !session || !canvasRef.current) return;
    let rendered = renderSession(original, session);
    const activeMask = session.masks[region];
    if (previewField && activeMask) {
      rendered = applyWarp(rendered, previewField, activeMask);
    }
    // 「Before長押し」中は元写真を表示
    const shown = view === 'before' ? original : rendered;
    const c = canvasRef.current;
    c.width = shown.width;
    c.height = shown.height;
    c.getContext('2d')!.putImageData(
      new ImageData(new Uint8ClampedArray(shown.data), shown.width, shown.height), 0, 0,
    );
    // Before キャンバス（比較表示用）
    if (view === 'split' && beforeCanvasRef.current) {
      const b = beforeCanvasRef.current;
      b.width = original.width;
      b.height = original.height;
      b.getContext('2d')!.putImageData(
        new ImageData(new Uint8ClampedArray(original.data), original.width, original.height), 0, 0,
      );
    }
    // マスクオーバーレイ
    if (overlayRef.current) {
      const o = overlayRef.current;
      o.width = original.width;
      o.height = original.height;
      const ctx = o.getContext('2d')!;
      ctx.clearRect(0, 0, o.width, o.height);
      if (showMask && activeMask) {
        ctx.putImageData(new ImageData(maskToOverlay(activeMask), o.width, o.height), 0, 0);
      }
    }
  }, [original, session, previewField, region, view, showMask]);

  // ---- 写真取込 ----
  const handleFile = async (f: File) => {
    try {
      const { img, dataUrl, scaled } = await loadImageFile(f);
      setOriginal(img);
      setPhotoDataUrl(dataUrl);
      setSession(createSession(img.width, img.height));
      setSegState('unknown');
      setPreviewField(null);
      onStatus(scaled
        ? `写真を読み込みました（編集速度優先のため長辺${MAX_DIM}pxに縮小しています）`
        : '写真を読み込みました');
    } catch (e) {
      onStatus(`読み込み失敗: ${(e as Error).message}`);
    }
  };

  // ---- 領域の自動分割 ----
  const runSegmentation = async () => {
    if (!original || !photoDataUrl || !session) return;
    setSegState('running');
    onStatus('領域を分割しています（端末内処理）…');
    try {
      const ok = await checkSegmentationAvailability();
      if (!ok) {
        setSegState('unavailable');
        onStatus('領域分割モデルが未配置です。ブラシによる手動マスクをご利用ください。');
        return;
      }
      await initSegmenter();
      let s = session;
      // 表示画像と同じ解像度で解析するため、縮小済みキャンバスから Image を作り直す
      const c = document.createElement('canvas');
      c.width = original.width;
      c.height = original.height;
      c.getContext('2d')!.putImageData(
        new ImageData(new Uint8ClampedArray(original.data), original.width, original.height), 0, 0,
      );
      const el2 = new Image();
      await new Promise<void>((res, rej) => {
        el2.onload = () => res();
        el2.onerror = () => rej(new Error('解析用画像の生成に失敗'));
        el2.src = c.toDataURL('image/png');
      });
      const masks = await segmentPhoto(el2, ['hair', 'face', 'skin', 'clothes'], 2);
      for (const [id, m] of Object.entries(masks)) {
        s = setMask(s, id, m);
      }
      setSession(s);
      setSegState('done');
      setShowMask(true);
      onStatus('領域分割が完了しました（髪・顔・体・衣服）。マスクはブラシで補正できます。');
    } catch (e) {
      setSegState('unavailable');
      onStatus(`領域分割に失敗しました: ${(e as Error).message}`);
    }
  };

  // ---- ポインタ操作（ブラシ／ワープ） ----
  const toImageCoords = (e: React.PointerEvent): { x: number; y: number } | null => {
    const c = canvasRef.current;
    if (!c || !original) return null;
    const r = c.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * original.width;
    const y = ((e.clientY - r.top) / r.height) * original.height;
    if (x < 0 || y < 0 || x >= original.width || y >= original.height) return null;
    return { x, y };
  };

  const ensureMask = (s: EditSession, id: RegionId): EditSession => {
    if (s.masks[id]) return s;
    return setMask(s, id, createMask(s.width, s.height));
  };

  const paintAt = (x: number, y: number) => {
    if (!session) return;
    let s = ensureMask(session, region);
    const m = cloneMask(s.masks[region]);
    applyBrush(m, x, y, brushRadius, tool === 'brush-add');
    s = setMask(s, region, m);
    setSession(s);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const p = toImageCoords(e);
    if (!p || !session) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    if (tool === 'brush-add' || tool === 'brush-erase') {
      painting.current = true;
      paintAt(p.x, p.y);
    } else if (tool === 'warp') {
      warpStart.current = p;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = toImageCoords(e);
    if (!p || !session) return;
    if (painting.current && (tool === 'brush-add' || tool === 'brush-erase')) {
      paintAt(p.x, p.y);
    } else if (tool === 'warp' && warpStart.current) {
      const f = createField(session.width, session.height);
      addStroke(f, {
        fromX: warpStart.current.x, fromY: warpStart.current.y,
        toX: p.x, toY: p.y,
        radius: brushRadius * 2, strength: 0.85,
      });
      setPreviewField(f);
    }
  };

  const onPointerUp = () => {
    painting.current = false;
    if (tool === 'warp' && warpStart.current && previewField && session) {
      let s = ensureMask(session, region);
      s = pushOp(s, { kind: 'warp', maskId: region, field: previewField });
      setSession(s);
      onStatus('局所変形を適用しました。');
    }
    warpStart.current = null;
    setPreviewField(null);
  };

  // ---- 編集操作の適用 ----
  const applyOp = (op: Parameters<typeof pushOp>[1], label: string) => {
    if (!session) return;
    if (!session.masks[region]) {
      onStatus(`「${REGION_LABELS[region]}」のマスクがありません。自動分割するかブラシで範囲を指定してください。`);
      return;
    }
    setSession(pushOp(session, op));
    onStatus(`${label}を適用しました（対象: ${REGION_LABELS[region]}）。`);
  };

  const isClothesGeneralBlock = mode === 'general' && region === 'clothes';

  // ---- エクスポート ----
  const exportImage = (format: 'png' | 'jpeg' | 'webp') => {
    if (!original || !session) return;
    const rendered = renderSession(original, session);
    const c = document.createElement('canvas');
    c.width = rendered.width;
    c.height = rendered.height;
    c.getContext('2d')!.putImageData(
      new ImageData(new Uint8ClampedArray(rendered.data), rendered.width, rendered.height), 0, 0,
    );
    c.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `pvs-photo.${format === 'jpeg' ? 'jpg' : format}`;
      a.click();
      URL.revokeObjectURL(a.href);
      onStatus(`${format.toUpperCase()}を出力しました。`);
    }, `image/${format}`, 0.95);
  };

  // ---- プロジェクト保存/復元 ----
  const saveProject = () => {
    if (!session || !photoDataUrl) return;
    const proj = {
      version: 3,
      type: 'photo-project',
      mode,
      sourcePhoto: photoDataUrl,
      editWidth: session.width,
      editHeight: session.height,
      session: serializeSession(session),
    };
    const blob = new Blob([JSON.stringify(proj)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'photo-project.pvsproj';
    a.click();
    URL.revokeObjectURL(a.href);
    onStatus('プロジェクトを保存しました。');
  };

  const openProject = async (f: File) => {
    try {
      const proj = JSON.parse(await f.text());
      if (proj.type !== 'photo-project') throw new Error('写真プロジェクトではありません');
      const el = new Image();
      await new Promise<void>((res, rej) => {
        el.onload = () => res();
        el.onerror = () => rej(new Error('写真の復元に失敗'));
        el.src = proj.sourcePhoto;
      });
      // 保存時の編集解像度で原本を再構成
      const c = document.createElement('canvas');
      c.width = proj.editWidth;
      c.height = proj.editHeight;
      c.getContext('2d')!.drawImage(el, 0, 0, proj.editWidth, proj.editHeight);
      const data = c.getContext('2d')!.getImageData(0, 0, proj.editWidth, proj.editHeight);
      setOriginal({ width: proj.editWidth, height: proj.editHeight, data: data.data });
      setPhotoDataUrl(proj.sourcePhoto);
      setSession(deserializeSession(proj.session));
      setSegState('done');
      onStatus('プロジェクトを復元しました。');
    } catch (e) {
      onStatus(`プロジェクトを開けません: ${(e as Error).message}`);
    }
  };

  const activeMask = session?.masks[region];

  return (
    <div className="app-shell">
      <div className="toolbar">
        <div className="group">
          <strong>{mode === 'medical' ? '医療モード' : '一般モード'}：写真編集</strong>
        </div>
        <div className="group">
          <button onClick={() => fileRef.current?.click()}>写真を開く</button>
          <button onClick={() => openRef.current?.click()} disabled={false}>プロジェクトを開く</button>
          <button onClick={saveProject} disabled={!session}>保存 (.pvsproj)</button>
        </div>
        <div className="group">
          <button onClick={() => session && setSession(undoOp(session))}
            disabled={!session || session.ops.length === 0}>元に戻す</button>
          <button onClick={() => session && setSession(redoOp(session))}
            disabled={!session || session.redoOps.length === 0}>やり直す</button>
        </div>
        <div className="group">
          <button onClick={() => exportImage('png')} disabled={!session}>PNG出力</button>
          <button onClick={() => exportImage('jpeg')} disabled={!session}>JPEG出力</button>
          <button onClick={() => exportImage('webp')} disabled={!session}>WebP出力</button>
        </div>
        <div className="spacer" />
        <div className="group">
          <button onClick={() => navigate(mode === 'medical' ? 'medical-3d' : 'editor')}>
            3Dモンタージュ編集を開く
          </button>
          <button onClick={() => navigate('home')}>ホームへ</button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" hidden
        aria-label="写真ファイル"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <input ref={openRef} type="file" accept=".pvsproj" hidden
        aria-label="プロジェクトファイル"
        onChange={(e) => e.target.files?.[0] && openProject(e.target.files[0])} />

      {!original ? (
        <div className="photo-empty">
          <h2>本人の写真を取り込んで編集を開始</h2>
          <p>
            取り込んだ写真を原本として、髪・顔・肌・衣服などの<strong>指定した領域だけ</strong>を編集します。
            指定領域の外側の画素は元写真のまま保持されます。
            画像はすべて端末内で処理され、外部へ送信されません。
          </p>
          <button className="primary" onClick={() => fileRef.current?.click()}>写真を開く</button>
          <div className="notice info" style={{ maxWidth: 640, textAlign: 'left' }}>
            編集はブラウザ内の処理速度を優先して長辺{MAX_DIM}pxに縮小して行います。
            {mode === 'general'
              ? '一般モードでは衣服の除去（脱衣）・裸体の生成はできません。'
              : '医療モードでは身体の局所編集・体毛範囲の編集が可能です。シミュレーション画像は医学的な結果予測ではありません。'}
          </div>
        </div>
      ) : (
        <div className="editor-main photo-editor-main">
          <div className="panel-left">
            <div className="section-title">編集対象の領域</div>
            <button className="primary" style={{ width: '100%', marginBottom: 8 }}
              onClick={runSegmentation} disabled={segState === 'running'}>
              {segState === 'running' ? '分割中…' : '領域を自動分割'}
            </button>
            {segState === 'unavailable' && (
              <div className="notice">自動分割モデルが未配置のため手動マスクのみ利用できます。</div>
            )}
            {(Object.keys(REGION_LABELS) as RegionId[]).map((id) => (
              <div key={id}
                className={`part-tree-item ${region === id ? 'selected' : ''}`}
                role="button" tabIndex={0}
                onClick={() => setRegion(id)}
                onKeyDown={(e) => e.key === 'Enter' && setRegion(id)}>
                <span className="tree-label">{REGION_LABELS[id]}</span>
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  {session?.masks[id] ? `${Math.round(maskCoverage(session.masks[id]) * 100)}%` : '—'}
                </span>
              </div>
            ))}
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8, fontSize: 12 }}>
              <input type="checkbox" checked={showMask} onChange={(e) => setShowMask(e.target.checked)} />
              マスクを表示
            </label>

            <div className="section-title" style={{ marginTop: 16 }}>マスク補正・変形ツール</div>
            <div className="tabs" style={{ flexWrap: 'wrap' }}>
              <button className={tool === 'brush-add' ? 'active' : ''}
                onClick={() => setTool(tool === 'brush-add' ? 'none' : 'brush-add')}>範囲を追加</button>
              <button className={tool === 'brush-erase' ? 'active' : ''}
                onClick={() => setTool(tool === 'brush-erase' ? 'none' : 'brush-erase')}>範囲を除去</button>
              <button className={tool === 'warp' ? 'active' : ''}
                onClick={() => setTool(tool === 'warp' ? 'none' : 'warp')}>局所変形</button>
            </div>
            <div className="param-row">
              <div className="param-head">
                <span>ブラシ径</span><span className="param-value">{brushRadius}px</span>
              </div>
              <input type="range" min={4} max={120} value={brushRadius}
                aria-label="ブラシ径"
                onChange={(e) => setBrushRadius(Number(e.target.value))} />
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              局所変形：画像上をドラッグすると、その部分だけが引き延ばされ/縮みます（リリースで確定）。
            </p>
          </div>

          <div className="panel-center photo-canvas-pane">
            {view === 'split' && (
              <div className="photo-canvas-wrap">
                <div className="compare-label">Before（元写真）</div>
                <canvas ref={beforeCanvasRef} />
              </div>
            )}
            <div className="photo-canvas-wrap">
              {view === 'split' && <div className="compare-label">After（編集結果）</div>}
              <canvas ref={canvasRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{ touchAction: 'none', cursor: tool === 'none' ? 'default' : 'crosshair' }} />
              <canvas ref={overlayRef} className="mask-overlay-canvas" />
            </div>
          </div>

          <div className="panel-right">
            <div className="tabs">
              <button className={view === 'after' ? 'active' : ''} onClick={() => setView('after')}>編集結果</button>
              <button onPointerDown={() => setView('before')} onPointerUp={() => setView('after')}
                onPointerLeave={() => view === 'before' && setView('after')}>Before長押し</button>
              <button className={view === 'split' ? 'active' : ''} onClick={() => setView('split')}>並列比較</button>
            </div>
            {view === 'before' && (
              <div className="notice info">Before表示は「Before長押し」ボタンを押している間のみです。</div>
            )}

            <div className="section-title">色の変更（髪色・衣服色など）</div>
            <div className="param-row">
              <div className="param-head"><span>色相</span><span className="param-value">{hue}°</span></div>
              <input type="range" min={-180} max={180} value={hue} aria-label="色相"
                onChange={(e) => setHue(Number(e.target.value))} />
            </div>
            <div className="param-row">
              <div className="param-head"><span>彩度</span><span className="param-value">{sat.toFixed(2)}</span></div>
              <input type="range" min={0} max={2} step={0.05} value={sat} aria-label="彩度"
                onChange={(e) => setSat(Number(e.target.value))} />
            </div>
            <div className="param-row">
              <div className="param-head"><span>明度</span><span className="param-value">{lum.toFixed(2)}</span></div>
              <input type="range" min={0.4} max={1.6} step={0.05} value={lum} aria-label="明度"
                onChange={(e) => setLum(Number(e.target.value))} />
            </div>
            <button onClick={() => applyOp({ kind: 'recolor', maskId: region, hueDeg: hue, satScale: sat, lumScale: lum }, '色の変更')}>
              色変更を適用
            </button>

            <div className="section-title" style={{ marginTop: 16 }}>肌・質感</div>
            <div className="param-row">
              <div className="param-head"><span>スムージング</span><span className="param-value">{smoothStrength.toFixed(2)}</span></div>
              <input type="range" min={0.1} max={1} step={0.05} value={smoothStrength} aria-label="スムージング強度"
                onChange={(e) => setSmoothStrength(Number(e.target.value))} />
            </div>
            <button onClick={() => applyOp({ kind: 'smooth', maskId: region, strength: smoothStrength, radius: 3 }, 'スムージング')}>
              スムージングを適用
            </button>

            <div className="section-title" style={{ marginTop: 16 }}>明るさ・コントラスト</div>
            <div className="param-row">
              <div className="param-head"><span>明るさ</span><span className="param-value">{brightness}</span></div>
              <input type="range" min={-60} max={60} value={brightness} aria-label="明るさ"
                onChange={(e) => setBrightness(Number(e.target.value))} />
            </div>
            <div className="param-row">
              <div className="param-head"><span>コントラスト</span><span className="param-value">{contrast}</span></div>
              <input type="range" min={-60} max={60} value={contrast} aria-label="コントラスト"
                onChange={(e) => setContrast(Number(e.target.value))} />
            </div>
            <button onClick={() => applyOp({ kind: 'adjust', maskId: region, brightness, contrast }, '明暗調整')}>
              明暗調整を適用
            </button>

            <div className="section-title" style={{ marginTop: 16 }}>除去・補完</div>
            {isClothesGeneralBlock ? (
              <div className="notice danger">一般モードでは衣服領域の除去（脱衣）はできません。</div>
            ) : (
              <>
                <button onClick={() => applyOp({ kind: 'inpaint', maskId: region }, '除去・補完')}>
                  マスク内を除去・補完
                </button>
                <p style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  周囲の画素からの拡散充填で近似します（体毛・小さなシミの除去等）。
                  大面積では質感が平坦になります。AI生成による補完ではありません。
                </p>
              </>
            )}
          </div>

          <div className="panel-bottom">
            <div className="statusbar">
              {status || `編集操作数: ${session?.ops.length ?? 0}　対象領域: ${REGION_LABELS[region]}${activeMask ? '' : '（マスク未作成）'}`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
