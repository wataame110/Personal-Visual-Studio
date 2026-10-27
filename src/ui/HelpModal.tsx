// ヘルプ・FAQ・ショートカット一覧
import { useState } from 'react';

const FAQ: { q: string; a: string }[] = [
  {
    q: '写真はどこへ送信されますか？',
    a: '送信されません。モンタージュ合成はすべてブラウザ内（端末内）で行われます。外部サーバーへのアップロードも行いません。',
  },
  {
    q: '作業データを保存して後で続きを編集できますか？',
    a: 'ツールバーの「保存 (.pvsproj)」で専用プロジェクトファイルを保存し、「開く」で完全な編集状態を復元できます。',
  },
  {
    q: '生成した画像を保存できますか？',
    a: 'ツールバーの「PNG画像出力」ボタンで、現在のモンタージュをPNG画像として保存できます。',
  },
  {
    q: '顔モードと全身モードの違いは？',
    a: '顔モードは証明写真のような正面顔のモンタージュ、全身モードは体型・髪型・衣服を含む全身のモンタージュを生成します。キーボードの 1 / 2 で切り替えられます。',
  },
  {
    q: '医療モードの画像は手術結果の予測ですか？',
    a: 'いいえ。利用者が設定した外観上のシナリオであり、実際の手術結果を保証・予測するものではありません。',
  },
];

const SHORTCUTS: [string, string][] = [
  ['Ctrl + Z', '元に戻す'],
  ['Ctrl + Y / Ctrl + Shift + Z', 'やり直し'],
  ['Ctrl + S', 'プロジェクトを保存'],
  ['F1', 'このヘルプを開く'],
  ['1', '顔モードに切替'],
  ['2', '全身モードに切替'],
];

export function HelpModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'guide' | 'shortcuts' | 'faq'>('guide');
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>ヘルプ</h2>
        <div className="tabs">
          {([['guide', '基本操作'], ['shortcuts', 'キーボード操作'], ['faq', 'FAQ']] as const).map(([k, label]) => (
            <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>
        {tab === 'guide' && (
          <div style={{ fontSize: 13, lineHeight: 1.8 }}>
            <ol>
              <li><strong>部位の選択：</strong>左の部位ツリーから編集したい部位を選びます。</li>
              <li><strong>形状の編集：</strong>右パネルのスライダー・数値入力で顔・体型のパラメータを調整します。リアルタイムでモンタージュが更新されます。</li>
              <li><strong>髪型・衣服：</strong>右パネルの「髪」「衣服」タブで髪型・髪色・メガネなどを変更できます。</li>
              <li><strong>比較：</strong>下部パネルで「案A・案B」を保存し、後で切り替えて比較できます。</li>
              <li><strong>保存・出力：</strong>.pvsproj で再編集用に保存、PNG画像出力で完成したモンタージュ写真を保存できます。</li>
            </ol>
          </div>
        )}
        {tab === 'shortcuts' && (
          <table className="kbd-table">
            <tbody>
              {SHORTCUTS.map(([k, d]) => (
                <tr key={k}><td><kbd>{k}</kbd></td><td>{d}</td></tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === 'faq' && (
          <div>
            {FAQ.map((f) => (
              <details key={f.q} style={{ marginBottom: 8 }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: 13 }}>{f.q}</summary>
                <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{f.a}</p>
              </details>
            ))}
          </div>
        )}
        <div style={{ marginTop: 12, textAlign: 'right' }}>
          <button onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}
