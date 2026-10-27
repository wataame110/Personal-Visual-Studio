// 体型グローバル・髪・衣服の編集パネル
import { useEditorStore } from '../core/store';
import type { Garment } from '../core/types';

/** 上半身を覆う衣服カテゴリ（一般モードの常時着衣保証と同じ定義） */
const UPPER_KINDS: Garment['kind'][] = ['tops', 'outer', 'dress'];
/** 下半身を覆う衣服カテゴリ */
const LOWER_KINDS: Garment['kind'][] = ['pants', 'skirt', 'dress'];

export function GlobalBodyPanel() {
  const store = useEditorStore();
  const g = store.globals;
  return (
    <div>
      <div className="section-title">人物ベース（テンプレート）</div>
      <div className="param-row">
        <label>性別体型ベース</label>
        <select value={g.sex} onChange={(e) => store.setGlobals({ sex: e.target.value as typeof g.sex })} aria-label="性別体型ベース">
          <option value="female">女性型</option>
          <option value="male">男性型</option>
          <option value="custom">カスタム（医療：両方の部位を編集可能）</option>
        </select>
        <div className="small" style={{ marginTop: 4 }}>
          切り替えても編集中の部位パラメータ・髪・衣服は保持されます。
        </div>
      </div>
      <div className="section-title">全身の基本設定</div>
      <div className="param-row">
        <div className="param-head"><label>身長（実測値を入力）</label><span className="param-value">{(g.height * 100).toFixed(1)} cm</span></div>
        <input type="range" min={1.3} max={2.0} step={0.005} value={g.height}
          onChange={(e) => store.setGlobals({ height: Number(e.target.value) })} aria-label="身長" />
      </div>
      <div className="param-row">
        <div className="param-head"><label>皮下脂肪（外形への影響）</label><span className="param-value">{Math.round(g.bodyFat * 100)}%</span></div>
        <input type="range" min={0} max={1} step={0.01} value={g.bodyFat}
          onChange={(e) => store.setGlobals({ bodyFat: Number(e.target.value) })} aria-label="皮下脂肪" />
      </div>
      <div className="param-row">
        <div className="param-head"><label>筋肉の輪郭</label><span className="param-value">{Math.round(g.muscle * 100)}%</span></div>
        <input type="range" min={0} max={1} step={0.01} value={g.muscle}
          onChange={(e) => store.setGlobals({ muscle: Number(e.target.value) })} aria-label="筋肉の輪郭" />
      </div>
      <div className="param-row">
        <div className="param-head"><label>姿勢（前傾〜後傾）</label><span className="param-value">{g.posture.toFixed(2)}</span></div>
        <input type="range" min={-1} max={1} step={0.01} value={g.posture}
          onChange={(e) => store.setGlobals({ posture: Number(e.target.value) })} aria-label="姿勢" />
      </div>
    </div>
  );
}

export function HairPanel() {
  const store = useEditorStore();
  const h = store.hair;
  return (
    <div>
      <div className="section-title">髪型・髪色</div>
      <div className="param-row">
        <label>髪型</label>
        <select value={h.style} onChange={(e) => store.setHair({ style: e.target.value as typeof h.style })} aria-label="髪型">
          <option value="none">なし</option>
          <option value="short">ショート</option>
          <option value="bob">ボブ</option>
          <option value="medium">ミディアム</option>
          <option value="long">ロング</option>
          <option value="ponytail">ポニーテール</option>
          <option value="bun">お団子</option>
        </select>
      </div>
      {[
        ['length', '髪の長さ'],
        ['volume', '毛量・ボリューム'],
        ['curl', 'カール'],
        ['bangs', '前髪'],
        ['gradient', 'グラデーション'],
      ].map(([key, label]) => (
        <div className="param-row" key={key}>
          <div className="param-head"><label>{label}</label><span className="param-value">{Math.round((h[key as keyof typeof h] as number) * 100)}%</span></div>
          <input type="range" min={0} max={1} step={0.01} value={h[key as keyof typeof h] as number}
            onChange={(e) => store.setHair({ [key]: Number(e.target.value) })} aria-label={label} />
        </div>
      ))}
      <div className="param-row">
        <div className="param-head"><label>分け目（左〜右）</label><span className="param-value">{h.parting.toFixed(2)}</span></div>
        <input type="range" min={-1} max={1} step={0.01} value={h.parting}
          onChange={(e) => store.setHair({ parting: Number(e.target.value) })} aria-label="分け目" />
      </div>
      <div className="param-row" style={{ display: 'flex', gap: 10 }}>
        <div>
          <label>髪色</label><br />
          <input type="color" value={h.color} onChange={(e) => store.setHair({ color: e.target.value })} aria-label="髪色" />
        </div>
        <div>
          <label>毛先の色</label><br />
          <input type="color" value={h.color2} onChange={(e) => store.setHair({ color2: e.target.value })} aria-label="毛先の色" />
        </div>
      </div>
    </div>
  );
}

const GARMENT_LABELS: Record<Garment['kind'], string> = {
  tops: 'トップス', outer: 'アウター', pants: 'パンツ', skirt: 'スカート',
  dress: 'ワンピース', shoes: '靴', hat: '帽子',
};

export function ClothingPanel({ onStatus }: { onStatus: (msg: string) => void }) {
  const store = useEditorStore();
  const c = store.clothing;
  const general = store.mode === 'general';

  const updateGarment = (id: string, patch: Partial<Garment>) => {
    store.setClothing({ garments: c.garments.map((g) => (g.id === id ? { ...g, ...patch } : g)) });
  };

  /** 一般モードで最後の上半身/下半身衣服を外そうとした場合にブロックする */
  const trySetVisible = (g: Garment, visible: boolean) => {
    if (general && !visible) {
      const others = c.garments.filter((x) => x.id !== g.id);
      const upperOk = others.some((x) => x.visible && UPPER_KINDS.includes(x.kind)) || UPPER_KINDS.includes(g.kind) === false;
      const lowerOk = others.some((x) => x.visible && LOWER_KINDS.includes(x.kind)) || LOWER_KINDS.includes(g.kind) === false;
      if (!(upperOk && lowerOk)) {
        onStatus('一般モードでは上半身・下半身の衣服をすべて外すことはできません（常時着衣）。');
        return;
      }
    }
    updateGarment(g.id, { visible });
  };

  const loadReferenceImage = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      updateGarment(id, { referenceImage: reader.result as string });
      onStatus('参照画像を読み込みました。テクスチャとして利用できます（2D写真から正確な3D形状・生地物性は復元されません）。');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <div className="section-title">衣服</div>
      {general && (
        <div className="notice info">
          一般モードでは常時着衣です。上半身・下半身いずれかの衣服を必ず着用します（すべて外すことはできません）。
        </div>
      )}
      {!general && (
        <div className="notice info">
          見た目の試着シミュレーションです。実際のサイズ・フィット感の予測ではありません。
        </div>
      )}
      {c.garments.map((g) => (
        <div key={g.id} className="param-row" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
          <div className="param-head">
            <label>
              <input type="checkbox" checked={g.visible} onChange={(e) => trySetVisible(g, e.target.checked)} />
              {' '}{GARMENT_LABELS[g.kind]}
            </label>
            <input type="color" value={g.color} onChange={(e) => updateGarment(g.id, { color: e.target.value })} aria-label={`${GARMENT_LABELS[g.kind]}の色`} />
          </div>
          {g.visible && (
            <>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <select value={g.pattern} onChange={(e) => updateGarment(g.id, { pattern: e.target.value as Garment['pattern'] })} aria-label="柄">
                  <option value="solid">無地</option>
                  <option value="stripe">ストライプ</option>
                  <option value="dot">ドット</option>
                  <option value="check">チェック</option>
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  位置
                  <input type="number" className="param-num" step={0.005} min={-0.1} max={0.1} value={g.offsetY}
                    onChange={(e) => updateGarment(g.id, { offsetY: Number(e.target.value) })} aria-label="着用位置" />
                </label>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
                <label className="small" style={{ cursor: 'pointer', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 8px' }}>
                  商品画像を参照
                  <input type="file" accept="image/*" hidden onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) loadReferenceImage(g.id, f);
                    e.target.value = '';
                  }} />
                </label>
                {g.referenceImage && (
                  <label style={{ fontSize: 11 }}>
                    <input type="checkbox" checked={g.useReferenceTexture}
                      onChange={(e) => updateGarment(g.id, { useReferenceTexture: e.target.checked })} />
                    テクスチャに使用
                  </label>
                )}
              </div>
            </>
          )}
        </div>
      ))}

      <div className="section-title">ファッション小物</div>
      <div className="param-row">
        <div className="param-head">
          <label>
            <input type="checkbox" checked={c.glasses.visible}
              onChange={(e) => store.setClothing({ glasses: { ...c.glasses, visible: e.target.checked } })} />
            {' '}メガネ
          </label>
          <input type="color" value={c.glasses.color}
            onChange={(e) => store.setClothing({ glasses: { ...c.glasses, color: e.target.value } })} aria-label="メガネの色" />
        </div>
        {c.glasses.visible && (
          <select value={c.glasses.shape}
            onChange={(e) => store.setClothing({ glasses: { ...c.glasses, shape: e.target.value as typeof c.glasses.shape } })} aria-label="メガネの形">
            <option value="round">ラウンド</option>
            <option value="square">スクエア</option>
            <option value="wellington">ウェリントン</option>
          </select>
        )}
      </div>
      {c.accessories.map((a) => (
        <div className="param-row" key={a.id}>
          <div className="param-head">
            <label>
              <input type="checkbox" checked={a.visible}
                onChange={(e) => store.setClothing({ accessories: c.accessories.map((x) => (x.id === a.id ? { ...x, visible: e.target.checked } : x)) })} />
              {' '}{a.kind === 'earring' ? 'ピアス・イヤリング' : 'ネックレス'}
            </label>
            <input type="color" value={a.color}
              onChange={(e) => store.setClothing({ accessories: c.accessories.map((x) => (x.id === a.id ? { ...x, color: e.target.value } : x)) })}
              aria-label="アクセサリーの色" />
          </div>
        </div>
      ))}
    </div>
  );
}
