// 右パネル：選択部位の詳細パラメータ編集
import { PART_DEF_MAP } from '../core/parts';
import { useEditorStore } from '../core/store';
import { PROVENANCE_LABELS, type Provenance, type Vec3 } from '../core/types';

/** 左右ペアの対応表（部位単位の設定コピー用） */
const SIDE_PAIRS: Record<string, string> = {
  eyeL: 'eyeR', eyeR: 'eyeL',
  browL: 'browR', browR: 'browL',
  earL: 'earR', earR: 'earL',
  breastL: 'breastR', breastR: 'breastL',
  upperArmL: 'upperArmR', upperArmR: 'upperArmL',
  forearmL: 'forearmR', forearmR: 'forearmL',
  handL: 'handR', handR: 'handL',
  thighL: 'thighR', thighR: 'thighL',
  calfL: 'calfR', calfR: 'calfL',
  footL: 'footR', footR: 'footL',
  labiaMajoraL: 'labiaMajoraR', labiaMajoraR: 'labiaMajoraL',
  labiaMinoraL: 'labiaMinoraR', labiaMinoraR: 'labiaMinoraL',
};

const PROVENANCE_ORDER: Provenance[] = ['photo', 'measured', 'manual', 'estimated'];

export function ParamPanel() {
  const store = useEditorStore();
  const id = store.selectedPart;
  if (!id || !store.parts[id]) {
    return (
      <div>
        <div className="section-title">詳細パラメータ</div>
        <p style={{ color: 'var(--text-dim)', fontSize: 12 }}>
          左の部位ツリーまたは3Dビュー上の部位をクリックして選択してください。
        </p>
      </div>
    );
  }
  const def = PART_DEF_MAP[id];
  const part = store.parts[id];
  const expert = store.uiLevel === 'expert';
  const visibleParams = def.params.filter((p) => expert || p.level === 'basic');
  const pairId = SIDE_PAIRS[id];

  const vecEditor = (field: 'offset' | 'rotation' | 'scale', label: string, step: number, min: number, max: number) => (
    <div className="param-row">
      <div className="param-head"><label>{label}</label></div>
      <div style={{ display: 'flex', gap: 4 }}>
        {(['x', 'y', 'z'] as (keyof Vec3)[]).map((axis) => (
          <input
            key={axis}
            type="number"
            className="param-num"
            style={{ width: '33%' }}
            step={step}
            min={min}
            max={max}
            value={part[field][axis]}
            disabled={part.locked}
            title={`${label} ${axis.toUpperCase()}`}
            onChange={(e) => store.setPartField(id, field, axis, Number(e.target.value))}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <div className="section-title">{def.label}</div>
      {part.locked && <div className="notice">この部位はロックされています。編集するにはロックを解除してください。</div>}

      {visibleParams.map((p) => {
        const value = part.morph[p.key] ?? p.defaultValue;
        const prov = part.provenance[p.key] ?? 'estimated';
        return (
          <div className="param-row" key={p.key}>
            <div className="param-head">
              <label title={p.key}>{p.label}</label>
              <span className={`provenance-badge ${prov}`}>{PROVENANCE_LABELS[prov]}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="range"
                min={p.min}
                max={p.max}
                step={p.step}
                value={value}
                disabled={part.locked}
                aria-label={p.label}
                onChange={(e) => store.setMorph(id, p.key, Number(e.target.value), 'manual')}
              />
              <input
                type="number"
                className="param-num"
                min={p.min}
                max={p.max}
                step={p.step}
                value={value}
                disabled={part.locked}
                aria-label={`${p.label}（数値入力）`}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) store.setMorph(id, p.key, Math.min(p.max, Math.max(p.min, v)), 'manual');
                }}
              />
            </div>
          </div>
        );
      })}

      {expert && (
        <>
          <div className="section-title">変換（専門家向け）</div>
          {vecEditor('offset', '位置オフセット (m)', 0.001, -0.2, 0.2)}
          {vecEditor('rotation', '回転 (°)', 1, -180, 180)}
          {vecEditor('scale', 'スケール倍率', 0.01, 0.3, 2.5)}
        </>
      )}

      <div className="section-title">色・質感</div>
      <div className="param-row" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div>
          <label>基調色</label>
          <br />
          <input type="color" value={part.color} disabled={part.locked}
            onChange={(e) => store.setPartColor(id, e.target.value)} aria-label="基調色" />
        </div>
        <div>
          <label>サブ色</label>
          <br />
          <input type="color" value={part.color2} disabled={part.locked}
            onChange={(e) => store.setPartColor(id, e.target.value, true)} aria-label="サブ色" />
        </div>
        <div style={{ flex: 1 }}>
          <label>皮膚の粗さ</label>
          <input type="range" min={0.2} max={1} step={0.01} value={part.roughness} disabled={part.locked}
            onChange={(e) => store.setPartRoughness(id, Number(e.target.value))} aria-label="皮膚の粗さ" />
        </div>
      </div>

      {expert && (
        <div className="param-row">
          <label>情報区分の変更</label>
          <select
            onChange={(e) => {
              const prov = e.target.value as Provenance;
              for (const p of def.params) {
                if (part.provenance[p.key]) {
                  useEditorStore.setState((s) => ({
                    parts: {
                      ...s.parts,
                      [id]: { ...s.parts[id], provenance: { ...s.parts[id].provenance, [p.key]: prov } },
                    },
                  }));
                }
              }
            }}
            defaultValue=""
          >
            <option value="" disabled>一括で区分を設定…</option>
            {PROVENANCE_ORDER.map((p) => (
              <option key={p} value={p}>{PROVENANCE_LABELS[p]}</option>
            ))}
          </select>
        </div>
      )}

      {pairId && (
        <div className="param-row">
          <button className="small" onClick={() => store.copyPartParams(id, pairId)}>
            この設定を{PART_DEF_MAP[pairId]?.label ?? '反対側'}へコピー
          </button>
        </div>
      )}
    </div>
  );
}
