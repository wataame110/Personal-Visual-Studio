// 左パネル：部位階層ツリー・表示/ロック切替
import { PART_DEFS } from '../core/parts';
import { useEditorStore } from '../core/store';

interface Props {
  mode: 'general' | 'medical';
}

export function PartTree({ mode }: Props) {
  const store = useEditorStore();
  const defs = PART_DEFS.filter((d) => !d.medicalOnly || mode === 'medical');
  const roots = defs.filter((d) => !d.parent);
  const childrenOf = (id: string) => defs.filter((d) => d.parent === id);

  const renderItem = (id: string, indent: boolean) => {
    const def = defs.find((d) => d.id === id);
    const state = store.parts[id];
    if (!def || !state) return null;
    const children = childrenOf(id);
    return (
      <div key={id}>
        <div
          className={`part-tree-item ${indent ? 'tree-indent' : ''} ${store.selectedPart === id ? 'selected' : ''} ${state.visible ? '' : 'hidden-part'}`}
          onClick={() => { store.selectPart(id); store.requestFocusPart(id); }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && store.selectPart(id)}
        >
          <span className="tree-label">{def.label}</span>
          <button
            className="icon-btn"
            title={state.visible ? '非表示にする' : '表示する'}
            onClick={(e) => { e.stopPropagation(); store.togglePartVisible(id); }}
          >
            {state.visible ? '表示' : '非'}
          </button>
          <button
            className="icon-btn"
            title={state.locked ? 'ロック解除' : 'ロック（編集禁止）'}
            onClick={(e) => { e.stopPropagation(); store.togglePartLocked(id); }}
          >
            {state.locked ? '錠' : '開'}
          </button>
        </div>
        {children.map((c) => renderItem(c.id, true))}
      </div>
    );
  };

  return (
    <div>
      <div className="section-title">部位ツリー</div>
      {roots.map((r) => renderItem(r.id, false))}
    </div>
  );
}
