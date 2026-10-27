// 写真取込・解析パネル（MediaPipe による端末内解析＋手動補正）
import { useRef, useState, useEffect, useCallback } from 'react';
import { analyzePhoto, landmarksToGuideParams, checkModelAvailability, sampleIdentityColors, type PhotoAnalysisResult } from '../photo/analysis';
import { useEditorStore } from '../core/store';

/** 肌色を適用する皮膚部位（眼球・唇・粘膜系は本人固有の色調を別途編集するため除外） */
const SKIN_PART_IDS = [
  'head', 'nose', 'earL', 'earR', 'neck', 'chest', 'breastL', 'breastR',
  'abdomen', 'waist', 'pelvis', 'upperArmL', 'upperArmR', 'forearmL', 'forearmR',
  'handL', 'handR', 'thighL', 'thighR', 'calfL', 'calfR', 'footL', 'footR', 'monsPubis',
];

interface Props {
  onClose: () => void;
  onStatus: (msg: string) => void;
  initialPhoto?: string;
}

export function PhotoPanel({ onClose, onStatus, initialPhoto }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(initialPhoto ?? null);
  const [result, setResult] = useState<PhotoAnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [modelsAvailable, setModelsAvailable] = useState<{ face: boolean; pose: boolean } | null>(null);
  const [heightCm, setHeightCm] = useState('165');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const store = useEditorStore();

  useEffect(() => {
    void checkModelAvailability().then(setModelsAvailable);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageUrl) return;
    const paint = () => {
      const img = imgRef.current;
      if (!img) return;
      const maxW = 560;
      const scale = Math.min(1, maxW / img.naturalWidth);
      canvas.width = img.naturalWidth * scale;
      canvas.height = img.naturalHeight * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      if (result) {
        // 顔ランドマーク
        ctx.fillStyle = '#4f8ef7';
        for (const lm of result.faceLandmarks) {
          ctx.beginPath();
          ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
        // 姿勢ランドマーク
        ctx.fillStyle = '#37b58a';
        for (const lm of result.poseLandmarks) {
          ctx.beginPath();
          ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };
    if (!imgRef.current || imgRef.current.src !== imageUrl) {
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        paint();
      };
      img.src = imageUrl;
    } else {
      paint();
    }
  }, [imageUrl, result]);

  useEffect(draw, [draw]);

  const loadFile = (file: File) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setError('JPEG・PNG・WebP 形式の画像を選択してください。');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
      setResult(null);
      setError('');
      store.setPhoto(reader.result as string, []);
    };
    reader.readAsDataURL(file);
  };

  const runAnalysis = async () => {
    if (!imgRef.current) return;
    setAnalyzing(true);
    setError('');
    try {
      const r = await analyzePhoto(imgRef.current);
      setResult(r);
      store.setPhoto(imageUrl!, [...r.faceLandmarks, ...r.poseLandmarks]);
      onStatus(`解析が完了しました（顔 ${r.faceLandmarks.length} 点・姿勢 ${r.poseLandmarks.length} 点）。`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '解析に失敗しました。');
    } finally {
      setAnalyzing(false);
    }
  };

  /** ランドマークの手動補正（ドラッグで移動） */
  const canvasPoint = (e: React.PointerEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / canvas.width, y: (e.clientY - rect.top) / canvas.height };
  };

  const findNearest = (pt: { x: number; y: number }): number | null => {
    if (!result) return null;
    const all = result.poseLandmarks.length > 0 ? result.poseLandmarks : result.faceLandmarks;
    let best: number | null = null;
    let bestD = 0.03;
    all.forEach((lm, i) => {
      const d = Math.hypot(lm.x - pt.x, lm.y - pt.y);
      if (d < bestD) { best = i; bestD = d; }
    });
    return best;
  };

  const applyGuide = () => {
    if (!result) return;
    const img = imgRef.current;
    const aspect = img ? img.naturalWidth / img.naturalHeight : 1;
    const guide = landmarksToGuideParams(result, aspect);
    let applied = 0;
    for (const [partId, morphs] of Object.entries(guide)) {
      if (partId === 'detectedItems') continue;
      for (const [key, value] of Object.entries(morphs as Record<string, number>)) {
        if (typeof value === 'number') {
          store.setMorph(partId, key, value, 'photo');
          applied++;
        }
      }
    }
    // 肌色・髪色を写真から抽出して反映（本人再現の基礎情報）
    const colorNotes: string[] = [];
    if (img) {
      const colors = sampleIdentityColors(img, result);
      if (colors.skinColor) {
        for (const id of SKIN_PART_IDS) store.setPartColor(id, colors.skinColor);
        colorNotes.push('肌色');
      }
      if (colors.hairColor) {
        store.setHair({ color: colors.hairColor });
        colorNotes.push('髪色');
      }
    }
    const h = Number(heightCm);
    if (Number.isFinite(h) && h >= 100 && h <= 230) {
      store.setGlobals({ height: h / 100 });
    }
    onStatus(
      applied > 0 || colorNotes.length > 0
        ? `本人の特徴をモデルに反映しました（形状 ${applied} 項目: ${guide.detectedItems.join('、') || '該当なし'}${colorNotes.length ? `／色情報: ${colorNotes.join('・')}` : ''}）。写真に写らない部位は推定値のままです。`
        : '反映できる項目がありませんでした。手動で編集してください。',
    );
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>正面写真の取り込み・解析</h2>
        <div className="notice info">
          写真は端末内でのみ処理され、外部へ送信されません。解析は初期ガイドの生成であり、
          写真に写っていない部位の正確な形状・色味を取得するものではありません。
        </div>
        {modelsAvailable && (!modelsAvailable.face || !modelsAvailable.pose) && (
          <div className="notice">
            解析モデルの一部が未配置です（顔: {modelsAvailable.face ? '有' : '無'} / 姿勢: {modelsAvailable.pose ? '有' : '無'}）。
            手動モードで作業を継続できます。モデルは tools/fetch-models.mjs で配置できます。
          </div>
        )}
        <div className="param-row">
          <label className="primary" style={{ display: 'inline-block', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', background: 'var(--accent)', color: '#fff' }}>
            写真を選択（JPEG/PNG/WebP）
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = ''; }} />
          </label>
        </div>
        {imageUrl && (
          <>
            <canvas
              ref={canvasRef}
              className="photo-panel-canvas"
              onPointerDown={(e) => {
                const pt = canvasPoint(e);
                if (pt) setDragIndex(findNearest(pt));
              }}
              onPointerMove={(e) => {
                if (dragIndex === null || !result) return;
                const pt = canvasPoint(e);
                if (!pt) return;
                setResult((prev) => {
                  if (!prev) return prev;
                  const isPose = prev.poseLandmarks.length > 0;
                  const key = isPose ? 'poseLandmarks' : 'faceLandmarks';
                  const list = [...prev[key]];
                  list[dragIndex] = { ...list[dragIndex], x: pt.x, y: pt.y };
                  return { ...prev, [key]: list };
                });
              }}
              onPointerUp={() => setDragIndex(null)}
            />
            <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              ランドマークはドラッグで手動補正できます（緑: 姿勢 / 青: 顔）。
            </p>
          </>
        )}
        <div className="param-row" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ whiteSpace: 'nowrap' }}>身長（実測値・cm）</label>
          <input type="number" min={100} max={230} value={heightCm} onChange={(e) => setHeightCm(e.target.value)} style={{ width: 100 }} />
        </div>
        <div className="auth-error">{error}</div>
        {analyzing && (
          <div className="progress-bar"><div style={{ width: '60%' }} /></div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <button className="primary" onClick={runAnalysis} disabled={!imageUrl || analyzing}>
            {analyzing ? '解析中…' : '解析を実行'}
          </button>
          <button onClick={applyGuide} disabled={!result}>ガイドをモデルに反映</button>
          <button onClick={() => { onStatus('手動モードで編集を継続します。'); onClose(); }}>解析せず手動で編集</button>
          <button onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}
