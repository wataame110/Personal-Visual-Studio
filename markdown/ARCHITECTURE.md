# 開発者向けアーキテクチャ

## 技術構成

- React 18 + TypeScript + Vite（静的サイト。サーバーサイド処理なし）
- Three.js による WebGL レンダリング
- zustand による状態管理（イミュータブルなスナップショット＋Undo/Redo）
- MediaPipe Tasks Vision（顔・姿勢ランドマーク。WASM・モデルは同梱配布）
- Vitest（単体テスト）/ Playwright（E2E）
- GitHub Actions による GitHub Pages 自動デプロイ

## ディレクトリ構成

```
typescript/
  core/
    types.ts      型定義（パラメータ・プロジェクト形式・ポーズ等）
    parts.ts      部位ツリーと部位固有パラメータの定義
    store.ts      状態管理・Undo/Redo・シナリオ
    project.ts    .pvsproj の保存・復元・バージョン管理
    skeleton.ts   2D関節骨格システム（絶対角度FK）
    poses.ts      ポーズプリセットDB（立ち〜医療体位・性的体位）
    montage.ts    Canvas 2D モンタージュ合成エンジン
  auth/
    authStore.ts  二画面認証の状態管理
  ui/             共通UIコンポーネント（PosePanel 等）
  pages/          画面（ホーム・エディタ・認証）
  tests/          Vitest 単体テスト
css/
  styles.css      アプリ全体のスタイル
python/           E2Eテスト（Playwright + pytest）
javascript/
  generate-profiles.mjs  医療版プロファイル生成・増設
  fetch-models.mjs       MediaPipe モデル取得（任意機能）
  mediapipe/             MediaPipe WASM ローダーJS（未使用の同梱物）
markdown/         ドキュメント
json/
  auth/profiles.json     医療版プロファイル（配信対象・開発者が編集）
models/           MediaPipe モデル（任意機能の素材）
wasm/             MediaPipe WASM ランタイム（任意機能の素材）
```

## 設計上の要点

### パラメトリックメッシュ

- 人体は単純な球体・円柱の組み合わせではなく、**断面ロフト（連続曲面）**で構築
- `loftSections()` は任意経路に沿った平行輸送フレームで断面を配置し、
  湾曲（陰茎の湾曲など）をモデル全体の回転ではなく**経路変形**として表現する
- 部位パラメータは `PartState.morph` に格納され、変更時に対象部位を再生成
- 変形量はパラメータ定義の min/max で制限され、`validateGeometry()` で破綻を検出可能

### 状態と履歴

- すべての編集は zustand ストアのイミュータブル更新として実行
- 変更前スナップショットを履歴スタックに積み Undo/Redo を実現（上限100件）
- ロックされた部位は変更を拒否。左右は独立した部位IDを持つ

### 非破壊・情報区分

- 各パラメータに情報区分（写真確認／実測／手動設定／システム推定）を保持
- 比較案（シナリオ）はパラメータセット全体のスナップショット

### プロジェクト形式（.pvsproj）

- JSON 形式。`version` フィールドで将来の互換性を管理
- 読み込み時に欠損部位は既定値で補完（前方互換）
- 将来バージョンのファイルは明示的にエラー

### GitHub Pages 対応

- `base: './'`（相対パス）
- Hash Router（直接アクセス・再読込で404にならない）
- 認証プロファイル・モデルは `public/` から相対パスで取得

### プライバシー

- 写真解析・保存・出力はすべて端末内で実行
- 外部API・テレメトリー・広告トラッカーなし
- 外部送信を行うコードパスは存在しない

## 拡張方法

### 新しい部位の追加

1. `typescript/core/parts.ts` の `PART_DEFS` に部位定義（パラメータ含む）を追加
2. `typescript/core/montage.ts` に描画処理を追加
4. テストを追加

### 新しい髪型・衣服の追加

- `hair.ts` のスタイル分岐、または `BodyPanels.tsx` の衣服リストと `clothing.ts` のビルダーに追加
