// 画像出力ダイアログ（PNG/JPEG/WebP・解像度・背景設定）
import { useState } from 'react';
import { dataUrlToBlob, downloadBlob } from '../core/project';
import type { Viewport } from '../engine/viewport';

interface Props {
  viewportRef: React.MutableRefObject<Viewport | null>;
  onClose: () => void;
  onStatus: (msg: string) => void;
}

export function ExportImageDialog({ viewportRef, onClose, onStatus }: Props) {
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [transparent, setTransparent] = useState(false);
  const [background, setBackground] = useState('#2a2f38');
  const [error, setError] = useState('');

  const doExport = () => {
    const vp = viewportRef.current;
    if (!vp) return;
    try {
      if (width * height > 4096 * 4096) {
        setError('解像度が大きすぎます（最大 4096×4096）。メモリ制約のため縮小してください。');
        return;
      }
      const dataUrl = vp.captureImage({ width, height, format, transparent: transparent && format !== 'jpeg', background });
      downloadBlob(dataUrlToBlob(dataUrl), `pvs-image-${Date.now()}.${format === 'jpeg' ? 'jpg' : format}`);
      onStatus('画像を出力しました。');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '画像出力に失敗しました。');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <h2>2D画像出力</h2>
        <div className="param-row">
          <label>形式</label>
          <select value={format} onChange={(e) => setFormat(e.target.value as typeof format)}>
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
            <option value="webp">WebP</option>
          </select>
        </div>
        <div className="param-row">
          <label>幅 (px)</label>
          <input type="number" min={64} max={4096} value={width} onChange={(e) => setWidth(Number(e.target.value))} />
        </div>
        <div className="param-row">
          <label>高さ (px)</label>
          <input type="number" min={64} max={4096} value={height} onChange={(e) => setHeight(Number(e.target.value))} />
        </div>
        {format !== 'jpeg' && (
          <div className="param-row">
            <label>
              <input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} /> 背景を透過
            </label>
          </div>
        )}
        {!transparent && (
          <div className="param-row">
            <label>背景色</label>
            <input type="color" value={background} onChange={(e) => setBackground(e.target.value)} />
          </div>
        )}
        <div className="auth-error">{error}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="primary" onClick={doExport}>出力</button>
          <button onClick={onClose}>キャンセル</button>
        </div>
      </div>
    </div>
  );
}
