// ヘルプ・FAQ・ショートカット一覧
import { useState } from 'react';

const FAQ: { q: string; a: string }[] = [
  {
    q: '写真はどこへ送信されますか？',
    a: '送信されません。写真解析はすべてブラウザ内（端末内）で行われます。GitHub へのアップロードも行いません。',
  },
  {
    q: '作業データを保存して後で続きを編集できますか？',
    a: 'ツールバーの「保存 (.pvsproj)」で専用プロジェクトファイルを保存し、「開く」で完全な編集状態を復元できます。',
  },
  {
    q: 'GLB と .pvsproj の違いは？',
    a: 'GLB は完成モデルの交換・閲覧用の標準3D形式です。.pvsproj は編集履歴やパラメータを含む再編集用の専用形式です。',
  },
  {
    q: '写真解析で人物が検出されません。',
    a: '正面を向き、顔と肩がはっきり写った写真を使用してください。検出できない場合でも「解析せず手動で編集」で作業を続けられます。',
  },
  {
    q: '医療モードの画像は手術結果の予測ですか？',
    a: 'いいえ。利用者が設定した外観上のシナリオであり、実際の手術結果を保証・予測するものではありません。',
  },
  {
    q: '動作が重い場合は？',
    a: 'ツールバーの画質を「低（軽量）」に切り替えてください。AI解析機能は使わない場合オフのままにできます。',
  },
  {
    q: 'WebGL が利用できないと表示されます。',
    a: '3D表示には WebGL 対応ブラウザが必要です。最新の Chrome / Edge / Firefox / Safari をご利用ください。',
  },
];

const SHORTCUTS: [string, string][] = [
  ['Ctrl + Z', '元に戻す'],
  ['Ctrl + Y / Ctrl + Shift + Z', 'やり直し'],
  ['Ctrl + S', 'プロジェクトを保存'],
  ['F1', 'このヘルプを開く'],
  ['Tab', 'フォーカス移動'],
  ['1〜9', '視点プリセット（正面・背面・側面など）'],
  ['ドラッグ', 'モデルの回転'],
  ['ホイール', '拡大・縮小'],
  ['右ドラッグ / Shift+ドラッグ', 'パン（平行移動）'],
  ['部位をクリック', '部位の選択'],
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
              <li><strong>部位の選択：</strong>左の部位ツリーまたは3Dモデル上をクリックします。</li>
              <li><strong>形状の編集：</strong>右パネルのスライダー・数値入力で調整します。目・乳房・手足などは左右独立して編集できます。</li>
              <li><strong>視点の操作：</strong>ドラッグで回転、ホイールで拡大縮小。ビュー左上のボタンで正面・背面・側面などに切り替えられます。</li>
              <li><strong>写真から作成：</strong>「写真取込・解析」から正面写真を読み込み、解析後にガイドを反映します。AIなしの完全手動作成も可能です。</li>
              <li><strong>比較：</strong>下部パネルで「案A・案B」を保存し、「比較」ボタンで並列表示できます。</li>
              <li><strong>保存・出力：</strong>.pvsproj で再編集用に保存、GLB で3D出力、画像出力で PNG/JPEG/WebP を保存できます。</li>
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
