import { navigate } from '../App';

export default function HomePage() {
  return (
    <div className="home">
      <h1>Personal Visual Studio</h1>
      <p className="subtitle">
        高精度3D人物モンタージュ・人体再現・医療美容シミュレーション・バーチャル試着の統合ツール。
        写真や3Dデータはすべてお使いの端末内で処理され、外部サーバーへ送信されません。
      </p>
      <div className="mode-cards">
        <div className="mode-card" onClick={() => navigate('editor')} role="button" tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('editor')}>
          <h2>一般モード</h2>
          <p>
            顔・体型の3D再現、ヘアスタイル・髪色の変更、衣服のバーチャル試着、
            メガネや帽子などの小物シミュレーション、3Dモデルの保存・出力が行えます。
          </p>
          <button className="primary">一般モードを開始</button>
        </div>
        <div className="mode-card" onClick={() => navigate('medical-login')} role="button" tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('medical-login')}>
          <h2>医療機関モード</h2>
          <p>
            解剖学的な部位別編集、施術前後の比較、計測・注釈、脱毛デザインなど、
            視覚的説明を支援する専門機能を提供します。利用にはプロファイル認証が必要です。
          </p>
          <button>医療機関ログイン</button>
        </div>
      </div>
      <div className="notice info" style={{ maxWidth: 640, marginTop: 32, textAlign: 'left' }}>
        <strong>プライバシーについて：</strong>
        本アプリはブラウザ内で動作し、読み込んだ写真・3Dモデル・作業データを外部へ送信しません。
        開発・検証版では実患者情報を使用しないでください。
        医療機能は視覚的説明の支援を目的としており、医学的な診断や治療結果の予測を行うものではありません。
      </div>
    </div>
  );
}
