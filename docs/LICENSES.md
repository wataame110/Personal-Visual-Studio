# 使用ライブラリとライセンス一覧

## 依存ライブラリ（実行時）

| ライブラリ | バージョン | ライセンス | 用途 |
| --- | --- | --- | --- |
| React | 18.3.1 | MIT | UIフレームワーク |
| React DOM | 18.3.1 | MIT | UIレンダリング |
| Three.js | 0.169.0 | MIT | 3Dレンダリング・GLB入出力 |
| zustand | 4.5.5 | MIT | 状態管理 |
| @mediapipe/tasks-vision | 0.10.14 | Apache License 2.0 | 顔・姿勢ランドマーク検出 |

## 依存ライブラリ（開発時）

| ライブラリ | バージョン | ライセンス | 用途 |
| --- | --- | --- | --- |
| Vite | 5.4.9 | MIT | ビルドツール |
| TypeScript | 5.6.3 | Apache License 2.0 | 型付け |
| Vitest | 2.1.3 | MIT | 単体テスト |
| @vitejs/plugin-react | 4.3.2 | MIT | React 連携 |

## 同梱モデルファイル

| ファイル | 提供元 | 条件 |
| --- | --- | --- |
| `public/models/face_landmarker.task` | Google MediaPipe Models | MediaPipe Models 配布条件に従う（再配布条件は提供元の最新情報を確認すること） |
| `public/models/pose_landmarker_lite.task` | Google MediaPipe Models | 同上 |

## 3Dアセットについて

- 本アプリケーションの人体モデルは**すべてプロシージャル生成**（コードによるパラメトリック生成）であり、外部の3D人体アセットを同梱していません。
- そのため第三者の3Dモデルに関する商用利用・再配布・改変の制約は発生しません。
- 一方で、解剖学的な精密さは専門の3D人体アセットに及ばない場合があります。`docs/LIMITATIONS.md` を参照してください。
- 利用者が読み込んだGLBモデル・商品画像の権利処理は利用者の責任で行ってください。

## ライセンス表記の全文

各ライブラリのライセンス全文は `node_modules/<パッケージ>/LICENSE` を参照してください。

- MIT License: https://opensource.org/licenses/MIT
- Apache License 2.0: https://www.apache.org/licenses/LICENSE-2.0
