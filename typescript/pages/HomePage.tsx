import { navigate } from '../App';

export default function HomePage() {
  return (
    <div className="home">
      <h1>Personal Visual Studio</h1>
      <p className="subtitle">
        本人の写真を基準に、指定した部分だけを編集できるフォトモンタージュ・シミュレーションツール。
        3Dモンタージュ編集も利用できます。
        写真や3Dデータはすべてお使いの端末内で処理され、外部サーバーへ送信されません。
      </p>
      <div className="mode-cards">
        <div className="mode-card" onClick={() => navigate('photo')} role="button" tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('photo')}>
          <h2>一般モード</h2>
          <p>
            本人写真を取り込み、髪色・髪型領域・肌・衣服の色調などを領域指定で編集できます。
            指定領域の外側は元写真の画素が保持されます。衣服の除去はできません。
            写真なしで作成する3Dモンタージュ編集も利用できます。
          </p>
          <button className="primary">一般モードを開始</button>
        </div>
        <div className="mode-card" onClick={() => navigate('editor')} role="button" tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('editor')}>
          <h2>3Dモンタージュ（写真なし）</h2>
          <p>
            写真を使わず、パーツ・パラメータ指定で3D人物モデルを構成します。
            合成人物であり、実本人との一致精度は入力情報に依存します。GLB出力に対応。
          </p>
          <button>3Dモンタージュを開く</button>
        </div>
        <div className="mode-card" onClick={() => navigate('medical-login')} role="button" tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('medical-login')}>
          <h2>医療機関モード</h2>
          <p>
            患者写真の局所編集、体毛範囲のシミュレーション、施術前後の視覚的比較など、
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
