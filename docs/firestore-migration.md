# Supabase → Firestore 移行 / Cloud Run デプロイ手順

対象: Supabase `finance_data` テーブル（`id = 'main'` の 1 行に全データを JSON で保存）→ Firestore `households/{householdId}`。

## 0. 変更後の構成

```
ブラウザ (React SPA, Cloud Run の nginx から配信)
  ├─ Firebase Auth (Google ログイン)
  └─ Firestore  households/main
                  ├ members:   [uid, uid]   ← Admin スクリプトでのみ変更可
                  ├ data:      {fixedCosts, monthlyData, ...}  ← 旧 Supabase の data 列と同一形
                  ├ updatedAt: timestamp
                  └ updatedBy: uid
```

- アクセス制御は `firestore.rules`。`members` に UID が含まれるユーザーだけが読み書き可。作成・削除・メンバー変更はクライアントから不可
- Firebase 設定 (`VITE_FIREBASE_*`) が未設定のビルドは従来どおりローカル (localStorage) のみで動作
- 複数メンバーの同時編集は**後勝ち**（1 秒デバウンス中のローカル編集がある間はリモート更新を取り込まず、保存で上書き）

## 1. 事前準備（GCP / Firebase）

以下、`PROJECT_ID` は Cloud Run と同じ GCP プロジェクトを想定。

```bash
gcloud config set project PROJECT_ID
gcloud services enable firestore.googleapis.com identitytoolkit.googleapis.com
```

1. **Firebase をプロジェクトに追加**: Firebase コンソール →「プロジェクトを追加」→ 既存 GCP プロジェクト `PROJECT_ID` を選択
2. **Firestore データベース作成**（Native モード、リージョンは Cloud Run と同じ `asia-northeast1` 推奨。後から変更不可）
   ```bash
   gcloud firestore databases create --location=asia-northeast1 --type=firestore-native
   ```
3. **Authentication → Sign-in method → Google を有効化**
4. **Authentication → Settings → 承認済みドメイン** に Cloud Run の URL（`xxxx.a.run.app`、カスタムドメインがあればそれも）を追加。ローカル開発用に `localhost` は既定で入っている
5. **ウェブアプリ登録**: プロジェクト設定 → マイアプリ → ウェブ → 表示された `apiKey / authDomain / projectId / appId` を控える
6. ローカル `.env.local` に追記（`.env.example` 参照）

## 2. セキュリティルールのデプロイ

```bash
npx firebase-tools@15 login
npm run deploy:rules -- --project PROJECT_ID
```

デプロイ後、Firebase コンソール → Firestore → ルール で内容を確認。**ルール未デプロイの状態（テストモード等）でデータを入れないこと。**

## 3. Cloud Build トリガーの更新

Cloud Build トリガー（Cloud Run の継続デプロイ）の「置換変数」を差し替える。

| 削除 | 追加 |
|---|---|
| `_VITE_SUPABASE_URL` | `_VITE_FIREBASE_API_KEY` |
| `_VITE_SUPABASE_ANON_KEY` | `_VITE_FIREBASE_AUTH_DOMAIN` |
| | `_VITE_FIREBASE_PROJECT_ID` |
| | `_VITE_FIREBASE_APP_ID` |
| | `_VITE_FIREBASE_DATABASE_ID`（任意。空なら `(default)`） |

`cloudbuild.yaml` は必須 4 変数が空だとビルドを失敗させる。

## 4. 移行リハーサル（本番切替前）

```bash
gcloud auth application-default login   # Admin スクリプトの認証 (ADC)。鍵ファイルは作らない
```

1. ブランチをデプロイ（または `npm run dev` で `.env.local` を使ってローカル起動）し、**移行対象の各メンバーが一度 Google ログイン**する。「世帯メンバーに登録されていません」画面が出れば OK（Auth ユーザーが作られる）
2. ドライラン（Supabase から取得 → `backups/` に JSON 保存 → 件数・サイズ表示。書き込みなし）
   ```bash
   npm run migrate:firestore -- --member you@gmail.com --member partner@gmail.com
   ```
   - 取得 0 件エラーの場合は RLS が anon key を拒否している。Supabase ダッシュボードの service_role key を `.env.local` の `SUPABASE_SERVICE_ROLE_KEY` に一時設定（`VITE_` を付けない）
3. 件数がアプリ上の表示と一致することを確認

## 5. 本番移行（切替当日）

1. **書き込み停止**: 全端末で旧アプリを閉じる（旧アプリは保存のたびに Supabase を上書きするため、移行後に旧アプリで編集すると差分が失われる）
2. 本移行
   ```bash
   npm run migrate:firestore -- --member you@gmail.com --member partner@gmail.com --commit
   ```
   スクリプトは「バックアップ → 書き込み → 読み戻して全量比較」まで行い、不一致なら異常終了する
3. main へマージ → Cloud Build で Cloud Run に新リビジョンがデプロイされる
4. 各端末で新アプリを開き、Google ログイン → データ表示を確認 → 1 件編集して別端末に反映されるか確認
5. 再実行が必要な場合: `--force` で上書き（上書き前に `npm run household:member -- export` でエクスポート）

### Supabase を使っていなかった（localStorage のみの）端末からの移行

ブラウザの開発者ツールのコンソールで実行し、ダウンロードされた JSON を `--from-file` で渡す。

```js
const k = ['fixed_costs','monthly_data','scholarship_loans','savings_goals','transfer_records','bank_accounts','scholarship_reserve_initial','scholarship_reserve_bonus','scholarship_reserve_bonus_months'];
const n = ['fixedCosts','monthlyData','scholarshipLoans','savingsGoals','transferRecords','bankAccounts','scholarshipReserveInitial','scholarshipReserveBonus','scholarshipReserveBonusMonths'];
const d = Object.fromEntries(k.map((x, i) => [n[i], JSON.parse(localStorage.getItem('finance_app_' + x) ?? 'null')]).filter(([, v]) => v !== null));
const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(d)], {type: 'application/json'})); a.download = 'localstorage-export.json'; a.click();
```

```bash
npm run migrate:firestore -- --from-file localstorage-export.json --member you@gmail.com --commit
```

## 6. ロールバック

- Cloud Run: コンソール → リビジョン → 旧リビジョンにトラフィック 100%（旧リビジョンは Supabase を参照）
- 移行後に新アプリで入力したデータは Supabase に存在しないため、`npm run household:member -- export` で取り出して手動反映が必要

## 7. 移行後の後片付け（1〜2 週間の並行確認後）

1. `.env.local` から `VITE_SUPABASE_*` / `SUPABASE_SERVICE_ROLE_KEY` を削除
2. Supabase プロジェクトを一時停止（最終バックアップ取得後に削除）
3. `backups/` の JSON は家計データを含む。不要になったら削除（Git / Docker コンテキストには含まれない設定済み）

## メンバー管理

```bash
npm run household:member -- list
npm run household:member -- add --email partner@gmail.com     # 相手が一度ログインしてから実行
npm run household:member -- remove --email partner@gmail.com
npm run household:member -- export                           # backups/ に JSON 保存
```

## 既知の制約・リスク

- **1 MiB 上限**: 全データを 1 ドキュメントに保存。800 KB 超で設定画面に警告、1 MB 超は保存を拒否。到達時は月別サブコレクションへの分割が必要
- **同時編集は後勝ち**: 2 人がほぼ同時（1 秒以内）に別項目を編集すると片方が消える可能性がある
- **localStorage**: ログアウトしても端末にデータが残る（従来どおり）。共用端末では使わない
- **Zaim 連携**: 本番 (nginx) では従来どおり動作しない（Vite 開発サーバーのプロキシのみ）
- **Rules の自動テスト未整備**: Firestore エミュレータ (Java 21+) でのテスト追加を推奨
