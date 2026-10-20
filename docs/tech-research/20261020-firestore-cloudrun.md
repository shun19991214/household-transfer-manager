# 技術調査レポート: Supabase → Firestore 移行 / Cloud Run デプロイ

- **調査日**: 2026-10-20
- **調査対象**: Firebase JS SDK (Firestore / Auth), firebase-admin (Node), Cloud Run Node.js ランタイム, Firestore Security Rules
- **調査コンテキスト**: Vite 6 + React 19 SPA（Supabase の `finance_data` テーブル 1 行に JSON 丸ごと保存、認証なし、nginx コンテナで Cloud Run 配信）を Firestore + Cloud Run 構成に移行する

---

## Firebase JS SDK (`firebase`)

### 基本情報
- **最新版**: 13.0.0 (2026-10-07)
- **推奨版**: 12.19.0 (2026-09-09, 12.x 最終)
- **公式**: https://firebase.google.com/support/release-notes/js

### 破壊的変更
- 12.0.0 (2025-07): Node 20 以上必須（SSR/テスト時のみ関係）
- 13.0.0: 破壊的変更は **AI Logic のみ**（`VertexAIBackend` 削除など）。Firestore / Auth の破壊的変更は記載なし
- 12.18 / 12.19: Auth の `signInWithPopup` が iOS/iPadOS Safari で "Database is closing" になる不具合を修正 → **12.19 以上を使うべき**

### 推奨アクション
- `firebase@^12.19.0` を採用。13.0.0 はリリース 2 週間で .0 のため見送り（本アプリは AI Logic 未使用なので、後日 13.x へは無改修で上げられる見込み）
- モジュラー API（`firebase/firestore`, `firebase/auth`）のみ使用。`initializeFirestore(app, { localCache: persistentLocalCache() })` が現行のオフライン永続化 API（旧 `enableIndexedDbPersistence` は非推奨）

---

## firebase-admin (Node)

### 基本情報
- **最新版**: 14.5.0 (2026-09-23)
- **engines**: `node >= 22`
- **公式**: https://firebase.google.com/support/release-notes/admin/node

### 破壊的変更
- 14.0.0 (2026-06-08): Node 18/20 サポート終了、**レガシー namespace import（`admin.firestore()` 形式）削除** → `firebase-admin/app`, `firebase-admin/firestore` のモジュラー entry point を使う
- Instance ID API 削除（本件無関係）

### 推奨アクション
- データ移行スクリプトで `firebase-admin@^14.5.0` を使用（devDependency）。認証は ADC（`gcloud auth application-default login`）でサービスアカウント鍵ファイルを作らない

---

## Cloud Run / Node.js ランタイム

- Cloud Run 公式表: **Node.js 20 は 2026-04-30 deprecated、2026-10-30 decommission**。Node.js 24 は 2028-04-30 まで
- 現 Dockerfile のビルドステージ `node:20-alpine` は Node 20 本体も EOL (2026-04) のため **`node:24-alpine` へ更新必須**
- 配信ステージは nginx のままで問題なし（コンテナ持ち込みなので Cloud Run ランタイム表の対象外）

---

## Firestore Security Rules / 認証

- 現状の Supabase は anon key + 認証なしで、URL を知る誰もが家計データを読み書きできる状態と推測（RLS 設定は未確認）
- Firestore はクライアント SDK から直接読み書きするため、**Rules が唯一の防御線**。`allow read, write: if true` は不可
- 標準パターン: Firebase Auth (Google ログイン) + `request.auth.uid == userId` で自分のドキュメントのみ許可。さらに単一ユーザー運用なら UID 許可リストで固定可能
- Rules はエミュレータでテスト → `firebase deploy --only firestore:rules`

### Firestore 制約
- 1 ドキュメント最大 **1 MiB**。現行の「全データ 1 JSON」をそのまま 1 ドキュメントに入れると、変動費明細の蓄積（特に Zaim 取込）で将来上限に達しうる（1 明細 ≈ 100 B として約 1 万件）
- フィールド値に `undefined` 不可（`ignoreUndefinedProperties: true` で回避）

---

## 代替案

| 案 | 特徴 | 判断 |
|---|---|---|
| A. クライアント SDK 直結 + Firebase Auth + Rules | 現行構造とほぼ同じ、サーバー不要、nginx 継続 | **推奨** |
| B. Cloud Run 上に Node API (Admin SDK) を置きクライアントは API 経由 | Rules 不要だが API 自体の認証（IAP 等）が必要、構成が重い | Zaim プロキシも本番化したい場合に検討 |
| C. Supabase 継続 | 移行不要 | 要件外 |

---

## 総合判断

- 案 A: `firebase@12.19` + Google ログイン + UID 単位の Rules、ビルドは `node:24-alpine`、移行は `firebase-admin@14` スクリプト
- 既知の未解決点: Zaim 連携は現在 Vite dev サーバーのプロキシでのみ動作し、本番 (nginx) では元々動かない。Firestore 移行とは独立した課題

### 情報源
- [Firebase JS SDK release notes](https://firebase.google.com/support/release-notes/js)
- [Firebase Admin Node.js release notes](https://firebase.google.com/support/release-notes/admin/node)
- [Cloud Run: Supported language runtimes and base images](https://docs.cloud.google.com/run/docs/configuring/services/runtime-base-images)
- [Firebase: Security rules and Firebase Authentication](https://firebase.google.com/docs/rules/rules-and-auth)
- npm registry（`npm view`、2026-10-20 時点）
