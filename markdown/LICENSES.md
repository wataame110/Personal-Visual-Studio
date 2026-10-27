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
| `models/face_landmarker.task` | Google MediaPipe Models | MediaPipe Models 配布条件に従う（再配布条件は提供元の最新情報を確認すること） |
| `models/pose_landmarker_lite.task` | Google MediaPipe Models | 同上 |
| `models/selfie_multiclass_256x256.tflite` | Google MediaPipe Models | 同上（領域分割用） |
| `mediapipe/wasm/` | Google MediaPipe Tasks Vision | Apache-2.0（npmパッケージ @mediapipe/tasks-vision からの同梱） |
| `models/cc0/human-base-rigged.glb` | Innerscene（MakeHuman/MPFB CC0 assets） | CC0。出典・取得URL・SHA-256は `models/cc0/README.md` を参照 |

## 3Dアセットについて

- 編集用の人体モデルはThree.jsによるプロシージャル生成（コードによるパラメトリック生成）です。
- `models/cc0/human-base-rigged.glb` は、InnersceneがMakeHuman/MPFBのCC0アセットを基に公開したCC0の参考・インポート用GLBです。配布条件は同梱READMEと配布元の最新規約を確認してください。
- Three.jsのコード生成部分と、同梱GLBの第三者アセット部分はライセンス上分離して管理しています。
- 同梱GLBを編集用メッシュへ置換する場合は、形状編集・衣服強制・医療部位・GLB再出力の各機能をブラウザ実機で再検証してください。
- 利用者が読み込んだGLBモデル・商品画像の権利処理は利用者の責任で行ってください。

## ライセンス表記の全文

各ライブラリのライセンス全文は `node_modules/<パッケージ>/LICENSE` を参照してください。

- MIT License: https://opensource.org/licenses/MIT
- Apache License 2.0: https://www.apache.org/licenses/LICENSE-2.0
