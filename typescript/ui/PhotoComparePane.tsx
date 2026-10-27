// 元写真と3Dモデルの比較ペイン（並列表示・ランドマーク重ね合わせ）
import { useEditorStore } from '../core/store';

/**
 * 元写真を3Dビューと並列表示する。
 * ランドマーク点は写真上の検出位置を示し、モデル側の形状調整の目安になる。
 * 写真のアスペクト比を維持してレターボックス無しで % 座標を一致させる。
 */
export function PhotoComparePane() {
  const store = useEditorStore();
  const photo = store.sourcePhoto;
  if (!photo) return null;
  return (
    <div className="photo-pane">
      <div className="compare-label">元写真（本人再現の基準）</div>
      <div className="photo-pane-body">
        <div className="photo-frame">
          <img src={photo} alt="元写真" draggable={false} />
          {store.photoLandmarks.map((lm, i) => (
            <span
              key={i}
              className={`photo-landmark ${lm.label.startsWith('pose') ? 'pose' : 'face'}`}
              style={{ left: `${lm.x * 100}%`, top: `${lm.y * 100}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
