# DocuSign API - Cloudflare Workers

DocuSign APIを使用してEnvelopeの作成と情報取得を行うCloudflare Workersアプリケーションです。

## 📋 必要なもの

1. **DocuSign Sandbox アカウント**
2. **Cloudflareアカウント**
3. **Node.js** (v18以上推奨)
4. **npm** または **yarn**

## 🚀 セットアップ手順

### ステップ1: プロジェクトのクローン/ダウンロード

```bash
cd /Users/shinichi.tanabe/Desktop/docusign-workers
```

### ステップ2: 依存関係のインストール

```bash
npm install
```

### ステップ3: DocuSign統合キーの取得

DocuSign Sandboxで以下の情報を取得してください：

1. **Integration Key（統合キー）**
   - DocuSign管理画面 → Settings → Apps and Keys
   - 「ADD APP AND INTEGRATION KEY」をクリック
   - アプリ名を入力（例：My DocuSign App）
   - Integration Keyをコピー

2. **RSA秘密鍵の生成**
   - 同じ画面で「GENERATE RSA」をクリック
   - 秘密鍵をダウンロード（private.keyファイル）

3. **User ID（API Username）**
   - DocuSign管理画面 → Settings → Apps and Keys
   - 「API Username」をコピー

4. **Account ID**
   - DocuSign管理画面の右上に表示されているアカウント番号

### ステップ4: Cloudflare Workersにシークレットを設定

ローカル開発用に `.dev.vars` ファイルを作成：

```bash
# .dev.vars ファイルを作成
cat > .dev.vars << 'EOF'
DOCUSIGN_INTEGRATION_KEY=your_integration_key_here
DOCUSIGN_USER_ID=your_user_id_here
DOCUSIGN_ACCOUNT_ID=your_account_id_here
DOCUSIGN_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----
EOF
```

**重要**: 秘密鍵の改行は `\n` で表現してください。

### ステップ5: ローカルで開発サーバーを起動

```bash
npm run dev
```

ブラウザで `http://localhost:8787` にアクセスします。

### ステップ6: Cloudflare Workersにデプロイ

#### 6-1. Cloudflareにログイン

```bash
npx wrangler login
```

#### 6-2. シークレットを設定

```bash
# Integration Keyを設定
npx wrangler secret put DOCUSIGN_INTEGRATION_KEY

# User IDを設定
npx wrangler secret put DOCUSIGN_USER_ID

# Account IDを設定
npx wrangler secret put DOCUSIGN_ACCOUNT_ID

# 秘密鍵を設定（改行を\nに置き換えて1行で入力）
npx wrangler secret put DOCUSIGN_PRIVATE_KEY
```

#### 6-3. デプロイ

```bash
npm run deploy
```

デプロイが完了すると、URLが表示されます（例：`https://docusign-workers.your-subdomain.workers.dev`）

## 📁 プロジェクト構成

```
docusign-workers/
├── src/
│   └── index.ts           # メインアプリケーション
├── wrangler.toml          # Cloudflare Workers設定
├── tsconfig.json          # TypeScript設定
├── package.json           # npm設定
├── .gitignore            # Gitで無視するファイル
├── .dev.vars             # ローカル開発用環境変数（作成が必要）
└── README.md             # このファイル
```

## 🔧 機能

1. **Envelope作成**: 署名者のメールアドレスと名前を指定してEnvelopeを作成
2. **Envelope情報取得**: Envelope IDを指定して詳細情報を取得
3. **Envelopeリスト表示**: 過去30日間のEnvelopeリストを表示

## 🌐 APIエンドポイント

### GET /
ホームページ（Webインターフェース）

### POST /api/create-envelope
Envelopeを作成

**リクエストボディ:**
```json
{
  "signer_email": "example@example.com",
  "signer_name": "山田 太郎",
  "document_name": "契約書"
}
```

**レスポンス:**
```json
{
  "success": true,
  "envelope_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "status": "sent",
  "message": "Envelopeが正常に作成されました"
}
```

### GET /api/get-envelope/:envelopeId
Envelope情報を取得

**レスポンス:**
```json
{
  "success": true,
  "envelope_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "status": "sent",
  "email_subject": "署名をお願いします",
  "created_date_time": "2024-01-01T00:00:00Z",
  "sent_date_time": "2024-01-01T00:00:00Z"
}
```

### GET /api/list-envelopes
Envelopeリストを取得

**レスポンス:**
```json
{
  "success": true,
  "envelopes": [
    {
      "envelope_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "status": "sent",
      "email_subject": "署名をお願いします",
      "created_date_time": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 1
}
```

## 🛠️ 開発コマンド

```bash
# ローカル開発サーバーを起動
npm run dev

# Cloudflare Workersにデプロイ
npm run deploy

# Cloudflareにログイン
npx wrangler login

# シークレットを設定
npx wrangler secret put SECRET_NAME

# シークレット一覧を表示
npx wrangler secret list

# ログを表示
npx wrangler tail
```

## ❓ トラブルシューティング

### エラー: 認証エラー

**原因**: Integration Key、User ID、または秘密鍵が正しくない

**解決方法**:
1. `.dev.vars` ファイルまたはCloudflareのシークレット設定を再確認
2. DocuSign管理画面で情報を再確認
3. 秘密鍵の改行が正しく `\n` に置き換えられているか確認

### エラー: consent_required

**原因**: JWT Grantの許可が必要

**解決方法**:
1. ブラウザで以下のURLにアクセス（Integration Keyを置き換える）：
   ```
   https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=YOUR_INTEGRATION_KEY&redirect_uri=https://localhost
   ```
2. 「Allow Access」をクリック

### エラー: Module not found

**解決方法**:
```bash
npm install
```

### デプロイ時のエラー

**解決方法**:
1. Cloudflareにログインしているか確認: `npx wrangler whoami`
2. シークレットが正しく設定されているか確認: `npx wrangler secret list`

## 📝 注意事項

- このアプリケーションはSandbox環境用です
- 本番環境で使用する場合は、適切なセキュリティ対策が必要です
- 秘密鍵やAPIキーは絶対にGitにコミットしないでください
- `.dev.vars` ファイルは `.gitignore` に含まれています

## 📚 参考リンク

- [DocuSign API Documentation](https://developers.docusign.com/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)

## 📞 サポート

問題が発生した場合は、以下を確認してください：
- DocuSign Sandbox アカウントが有効か
- Cloudflareアカウントが有効か
- シークレットが正しく設定されているか
- Node.jsのバージョンが18以上か
