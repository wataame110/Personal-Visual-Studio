// 医療モード：計測・注釈・脱毛デザインのパネル
import { useState } from 'react';
import { useEditorStore } from '../core/store';
import type * as THREE from 'three';

export type MeasureMode = 'off' | 'distance' | 'angle' | 'annotation';

interface Props {
  measureMode: MeasureMode;
  setMeasureMode: (m: MeasureMode) => void;
  pickedPoints: THREE.Vector3[];
  clearPicked: () => void;
  onStatus: (msg: string) => void;
}

export function MeasurePanel({ measureMode, setMeasureMode, pickedPoints, clearPicked, onStatus }: Props) {
  const store = useEditorStore();
  const [note, setNote] = useState('');
  const [annoText, setAnnoText] = useState('');

  const needed = measureMode === 'distance' ? 2 : measureMode === 'angle' ? 3 : 1;

  const computeValue = (): number | null => {
    if (measureMode === 'distance' && pickedPoints.length >= 2) {
      return pickedPoints[0].distanceTo(pickedPoints[1]);
    }
    if (measureMode === 'angle' && pickedPoints.length >= 3) {
      const v1 = pickedPoints[0].clone().sub(pickedPoints[1]);
      const v2 = pickedPoints[2].clone().sub(pickedPoints[1]);
      return v1.angleTo(v2) * (180 / Math.PI);
    }
    return null;
  };

  const value = computeValue();

  const saveMeasurement = () => {
    if (value === null) return;
    store.addMeasurement({
      id: `m-${Date.now()}`,
      kind: measureMode === 'angle' ? 'angle' : 'distance',
      points: pickedPoints.map((p) => ({ x: p.x, y: p.y, z: p.z })),
      referenceValue: value,
      unit: measureMode === 'angle' ? 'deg' : 'm',
      note,
    });
    setNote('');
    clearPicked();
    onStatus('計測結果を保存しました。');
  };

  const saveAnnotation = () => {
    if (!annoText.trim() || pickedPoints.length < 1) return;
    store.addAnnotation({
      id: `a-${Date.now()}`,
      text: annoText.trim(),
      position: { x: pickedPoints[0].x, y: pickedPoints[0].y, z: pickedPoints[0].z },
      createdAt: Date.now(),
    });
    setAnnoText('');
    clearPicked();
    onStatus('注釈を追加しました。');
  };

  return (
    <div>
      <div className="section-title">計測・注釈</div>
      <div className="notice">
        計測値は画面上の参考値です。校正済みの実測値ではありません。
      </div>
      <div className="tabs">
        {([['off', 'オフ'], ['distance', '距離'], ['angle', '角度'], ['annotation', '注釈']] as [MeasureMode, string][]).map(([m, label]) => (
          <button key={m} className={measureMode === m ? 'active' : ''}
            onClick={() => { setMeasureMode(m); clearPicked(); }}>
            {label}
          </button>
        ))}
      </div>
      {measureMode !== 'off' && (
        <div className="param-row">
          <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            モデル上をクリックして点を選択してください（{pickedPoints.length}/{needed} 点）。
          </p>
          {value !== null && (
            <p>
              参考値: <strong>
                {measureMode === 'angle' ? `${value.toFixed(1)}°` : `${value.toFixed(3)} m（${(value * 100).toFixed(1)} cm）`}
              </strong>
            </p>
          )}
          {measureMode !== 'annotation' ? (
            <>
              <input type="text" placeholder="メモ（任意）" value={note} onChange={(e) => setNote(e.target.value)} />
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button className="small primary" onClick={saveMeasurement} disabled={value === null}>計測を保存</button>
                <button className="small" onClick={clearPicked}>点をクリア</button>
              </div>
            </>
          ) : (
            <>
              <input type="text" placeholder="注釈テキスト" value={annoText} onChange={(e) => setAnnoText(e.target.value)} />
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button className="small primary" onClick={saveAnnotation} disabled={!annoText.trim() || pickedPoints.length < 1}>注釈を追加</button>
                <button className="small" onClick={clearPicked}>点をクリア</button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="section-title">保存済み計測（{store.measurements.length}）</div>
      {store.measurements.map((m) => (
        <div key={m.id} style={{ display: 'flex', gap: 6, fontSize: 12, alignItems: 'center', marginBottom: 4 }}>
          <span style={{ flex: 1 }}>
            {m.kind === 'angle' ? '角度' : '距離'}: {m.kind === 'angle' ? `${m.referenceValue.toFixed(1)}°` : `${(m.referenceValue * 100).toFixed(1)} cm`}
            {m.note && `（${m.note}）`}
          </span>
          <button className="small danger" onClick={() => store.removeMeasurement(m.id)}>削除</button>
        </div>
      ))}
    </div>
  );
}

/** 体毛・脱毛デザイン */
export function HairRemovalPanel({ onStatus }: { onStatus: (msg: string) => void }) {
  const store = useEditorStore();
  const list = store.hairRemoval;
  const pubic = list.find((h) => h.region === 'pubic');

  const update = (patch: Partial<NonNullable<typeof pubic>>) => {
    const base = pubic ?? {
      region: 'pubic', density: 0.5, length: 0.5, color: '#2b2019',
      keepTop: 1, keepBottom: 0, keepLeft: 0, keepRight: 1, scenarioNote: '',
    };
    const next = { ...base, ...patch };
    store.setHairRemoval([next, ...list.filter((h) => h.region !== 'pubic')]);
  };

  return (
    <div>
      <div className="section-title">体毛・脱毛デザイン</div>
      <div className="notice">
        医療者が設定した条件に基づく参考シナリオです。実際の施術結果の予測ではありません。
        施術回数と減毛率は固定的には対応しません。
      </div>
      <div className="param-row">
        <div className="param-head"><label>体毛の密度（恥骨領域）</label><span className="param-value">{Math.round((pubic?.density ?? 0) * 100)}%</span></div>
        <input type="range" min={0} max={1} step={0.01} value={pubic?.density ?? 0}
          onChange={(e) => update({ density: Number(e.target.value) })} aria-label="体毛の密度" />
      </div>
      <div className="param-row">
        <div className="param-head"><label>毛の長さ</label><span className="param-value">{Math.round((pubic?.length ?? 0.5) * 100)}%</span></div>
        <input type="range" min={0} max={1} step={0.01} value={pubic?.length ?? 0.5}
          onChange={(e) => update({ length: Number(e.target.value) })} aria-label="毛の長さ" />
      </div>
      <div className="param-row" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div>
          <label>毛色</label><br />
          <input type="color" value={pubic?.color ?? '#2b2019'} onChange={(e) => update({ color: e.target.value })} aria-label="毛色" />
        </div>
      </div>
      <div className="section-title">残す範囲（脱毛マスク）</div>
      {([
        ['keepTop', '上端'], ['keepBottom', '下端'], ['keepLeft', '左端'], ['keepRight', '右端'],
      ] as const).map(([key, label]) => (
        <div className="param-row" key={key}>
          <div className="param-head"><label>{label}</label><span className="param-value">{((pubic?.[key] ?? 0) * 100).toFixed(0)}%</span></div>
          <input type="range" min={0} max={1} step={0.01} value={pubic?.[key] ?? 0}
            onChange={(e) => update({ [key]: Number(e.target.value) })} aria-label={label} />
        </div>
      ))}
      <div className="param-row">
        <label>シナリオメモ（施術案の記録）</label>
        <textarea rows={2} value={pubic?.scenarioNote ?? ''} onChange={(e) => update({ scenarioNote: e.target.value })}
          placeholder="例: 案A = Vラインを残すデザイン（参考シナリオ）" />
      </div>
      <div className="param-row">
        <button className="small" onClick={() => {
          store.saveScenario(`脱毛案${store.scenarios.length + 1}`);
          onStatus('現在の状態を比較案として保存しました。');
        }}>施術案として保存</button>
      </div>
    </div>
  );
}
