import { navigate } from '../App';

export default function HomePage() {
  return (
    <div className="home">
      <h1>Personal Visual Studio</h1>
      <p className="subtitle">
        写実的モンタージュ写真作成ツール。
        顔・体型・髪型・衣服のパラメータを調整して、実際の人のような写真を生成します。
        すべての処理はお使いの端末内で行われ、外部サーバーへ送信されません。
      </p>
      <div className="mode-cards">
        <div className="mode-card" onClick={() => navigate('editor')} role="button" tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('editor')}>
          <h2>一般モード</h2>
          <p>
            顔の各部位（目・鼻・口・眉）や髪型、体型を細かく調整して、
            写実的なモンタージュ写真を作成できます。完成した画像はPNGで保存可能です。
          </p>
          <button className="primary">一般モードを開始</button>
        </div>
        <div className="mode-card" onClick={() => navigate('medical-login')} role="button" tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('medical-login')}>
          <h2>医療機関モード</h2>
          <p>
            解剖学的な部位別編集、施術前後の比較など、
            視覚的説明を支援する専門機能を提供します。利用にはプロファイル認証が必要です。
          </p>
          <button>医療機関ログイン</button>
        </div>
      </div>
      <div className="notice info" style={{ maxWidth: 640, marginTop: 32, textAlign: 'left' }}>
        <strong>プライバシーについて：</strong>
        本アプリはブラウザ内で動作し、読み込んだ写真・作業データを外部へ送信しません。
        開発・検証版では実患者情報を使用しないでください。
        医療機能は視覚的説明の支援を目的としており、医学的な診断や治療結果の予測を行うものではありません。
      </div>
    </div>
  );
}
