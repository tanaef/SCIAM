# Cloudflare Workersへのデプロイ方法

## 重要: 環境変数の設定

`.dev.vars`ファイルはローカル開発用で、GitHubにはプッシュされていません（機密情報保護のため）。

**Cloudflare Workersで動かすには、環境変数をCloudflareのダッシュボードまたはWranglerコマンドで設定する必要があります。**

## 方法1: Wranglerコマンドで環境変数を設定（推奨）

### 1. Cloudflareにログイン

```bash
cd /Users/shinichi.tanabe/Desktop/docusign-workers
npx wrangler login
```

ブラウザが開き、Cloudflareアカウントでログインします。

### 2. 環境変数（Secrets）を設定

```bash
# DocuSign Integration Key
npx wrangler secret put DOCUSIGN_INTEGRATION_KEY
# プロンプトが表示されたら値を入力

# DocuSign User ID
npx wrangler secret put DOCUSIGN_USER_ID
# プロンプトが表示されたら値を入力

# DocuSign Account ID
npx wrangler secret put DOCUSIGN_ACCOUNT_ID
# プロンプトが表示されたら値を入力

# DocuSign Private Key（複数行の場合は注意）
npx wrangler secret put DOCUSIGN_PRIVATE_KEY
# プロンプトが表示されたら秘密鍵全体を入力（改行を含む）

# DocuSign Base Path
npx wrangler secret put DOCUSIGN_BASE_PATH
# 例: https://demo.docusign.net/restapi
```

### 3. デプロイ

```bash
npx wrangler deploy
```

## 方法2: Cloudflareダッシュボードで環境変数を設定

### 1. Cloudflareダッシュボードにアクセス

1. https://dash.cloudflare.com/ にログイン
2. **Workers & Pages** を選択
3. デプロイしたWorkerを選択（または新規作成）

### 2. 環境変数を設定

1. **Settings** タブを選択
2. **Variables** セクションまでスクロール
3. **Add variable** をクリック
4. 以下の環境変数を追加：

| Variable Name | Type | Value |
|--------------|------|-------|
| `DOCUSIGN_INTEGRATION_KEY` | Secret | `.dev.vars`から取得 |
| `DOCUSIGN_USER_ID` | Secret | `.dev.vars`から取得 |
| `DOCUSIGN_ACCOUNT_ID` | Secret | `.dev.vars`から取得 |
| `DOCUSIGN_PRIVATE_KEY` | Secret | `.dev.vars`から取得（改行を含む） |
| `DOCUSIGN_BASE_PATH` | Secret | `.dev.vars`から取得 |

**注意:** すべて**Secret**として設定してください（暗号化されます）。

### 3. デプロイ

```bash
cd /Users/shinichi.tanabe/Desktop/docusign-workers
npx wrangler deploy
```

## デプロイ手順の詳細

### ステップ1: Cloudflareにログイン

```bash
npx wrangler login
```

### ステップ2: 環境変数を設定（上記の方法1または2）

### ステップ3: デプロイ

```bash
npx wrangler deploy
```

成功すると、以下のような出力が表示されます：

```
Total Upload: XX.XX KiB / gzip: XX.XX KiB
Uploaded docusign-workers (X.XX sec)
Published docusign-workers (X.XX sec)
  https://docusign-workers.<your-subdomain>.workers.dev
Current Deployment ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### ステップ4: 動作確認

デプロイされたURLにアクセスして動作を確認：

```
https://docusign-workers.<your-subdomain>.workers.dev
```

## トラブルシューティング

### エラー: "Missing required environment variable"

環境変数が設定されていません。上記の方法1または2で設定してください。

### エラー: "Authentication failed"

DocuSignの認証情報が正しくありません：
- Integration Keyが正しいか確認
- User IDが正しいか確認
- Private Keyが正しく設定されているか確認（改行を含む）

### Private Keyの設定方法

Private Keyは複数行のため、以下の方法で設定します：

**方法A: Wranglerコマンド**
```bash
npx wrangler secret put DOCUSIGN_PRIVATE_KEY
# プロンプトが表示されたら、秘密鍵全体をコピー＆ペースト
# Ctrl+D（macOS）またはCtrl+Z（Windows）で入力終了
```

**方法B: ファイルから読み込み**
```bash
cat .dev.vars | grep DOCUSIGN_PRIVATE_KEY | cut -d'=' -f2- | npx wrangler secret put DOCUSIGN_PRIVATE_KEY
```

## カスタムドメインの設定（オプション）

### 1. Cloudflareダッシュボード

1. Workers & Pages → あなたのWorker
2. **Settings** → **Triggers**
3. **Add Custom Domain**
4. ドメイン名を入力（例: `docusign-api.example.com`）

### 2. DNSレコードの設定

Cloudflareが自動的にDNSレコードを設定します。

## 環境変数の確認

設定した環境変数を確認（値は表示されません）：

```bash
npx wrangler secret list
```

## 環境変数の削除

```bash
npx wrangler secret delete VARIABLE_NAME
```

## まとめ

1. ✅ `.dev.vars`はローカル開発用
2. ✅ Cloudflareでは環境変数を別途設定する必要がある
3. ✅ Wranglerコマンドまたはダッシュボードで設定
4. ✅ すべてSecretとして設定（暗号化）
5. ✅ デプロイ後、URLにアクセスして動作確認

**重要:** 環境変数を設定しないと、アプリケーションは動作しません。
