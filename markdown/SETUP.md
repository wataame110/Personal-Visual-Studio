# セットアップ・公開手順

## 1. 必要環境

- Node.js 18 以上（開発・ビルド・テスト用。実行時にサーバーは不要）
- npm 8 以上
- 対応ブラウザ：Chrome / Edge / Firefox / Safari の最新版（WebGL 必須）

## 2. インストール・ローカル起動

```bash
npm install
node javascript/fetch-models.mjs   # 写真解析モデルを同梱（任意だが推奨）
npm run dev
```

ブラウザで表示された URL（通常 `http://localhost:5173`）を開きます。

ローカル起動版では、必要なプログラムとモデルが事前に導入されていれば、
インターネット接続なしで基本機能（手動編集・保存・出力）を使用できます。
写真解析モデルもローカルファイルとして同梱されるためオフラインで動作します。

## 3. 本番ビルド

```bash
npm run test    # 自動テスト
npm run build   # dist/ に静的ファイルを出力
npm run preview # ビルド結果のローカル確認
```

## 4. GitHub Pages への公開

### 4.1 自動デプロイ（GitHub Actions）

`.github/workflows/deploy.yml` が同梱されています。

1. このリポジトリを GitHub へ push する
2. リポジトリの **Settings → Pages** で **Source: GitHub Actions** を選択
3. `main` ブランチへの push で自動的にビルド・デプロイされる
4. `https://<ユーザー名>.github.io/<リポジトリ名>/` で公開される

### 4.2 サブディレクトリ公開への対応

本プロジェクトは以下の対策済みです。

- Vite の `base: './'`（相対パス）により `<user>.github.io/<repo>/` 配下でもアセットが解決される
- 画面遷移は Hash Router（`#/editor` など）のため、直接アクセス・再読み込みで 404 にならない
- 認証プロファイル・モデルファイルは `public/` 配下から相対パスで読み込む

### 4.3 手動デプロイ

`dist/` の内容を `gh-pages` ブランチや任意の静的ホスティングへ配置するだけでも動作します。

## 5. Verdent への公開

`.verdentc.json`（静的サイトプロファイル）が同梱されています。
Verdent の Publish 機能からそのまま公開できます。

## 6. プロファイル・モデルの初期セットアップ

```bash
# 医療版プロファイル（30枠）の生成
node javascript/generate-profiles.mjs 30 json/auth/profiles.json

# MediaPipe モデル（顔・姿勢）の取得と同梱
node javascript/fetch-models.mjs
```

両者とも `public/` 配下に出力され、アプリケーションとともに配布されます。
**`json/auth/profiles.json` の初期パスワードは必ず変更してください。**
