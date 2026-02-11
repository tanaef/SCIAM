# 🚀 ローカル開発環境セットアップ手順

## ステップ1: DocuSign統合キーの取得

### 1-1. DocuSign Sandboxにログイン
- URL: https://admindemo.docusign.com/
- アカウントにログインしてください

### 1-2. Integration Keyを作成
1. 左メニュー → **Settings** → **Apps and Keys**
2. **「ADD APP AND INTEGRATION KEY」** ボタンをクリック
3. アプリ名を入力（例：`My DocuSign Workers App`）
4. **「Save」** をクリック
5. 作成された **Integration Key** をコピーして保存

### 1-3. RSA秘密鍵を生成
1. 同じ画面で **「GENERATE RSA」** ボタンをクリック
2. 秘密鍵ファイル（`private.key`）がダウンロードされます
3. ダウンロードしたファイルを開いて、内容全体をコピー

### 1-4. User IDを取得
1. 同じ画面の **「API Username」** をコピー
2. 形式: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

### 1-5. Account IDを取得
1. DocuSign管理画面の右上に表示されているアカウント番号
2. または Settings → API and Keys の画面に表示されています

### 1-6. JWT Grantを有効化
1. 作成したアプリケーションの **「Actions」** → **「Edit」**
2. **「Service Integration」** セクションで：
   - **「JWT Grant」** にチェックを入れる
   - Redirect URIを追加: `http://localhost:8787/callback`
3. **「Save」** をクリック

---

## ステップ2: .dev.varsファイルの編集

`docusign-workers/.dev.vars` ファイルを開いて、取得した情報を入力してください：

```bash
# Integration Key を入力
DOCUSIGN_INTEGRATION_KEY=ここに統合キーを貼り付け

# User ID を入力
DOCUSIGN_USER_ID=ここにUser IDを貼り付け

# Account ID を入力
DOCUSIGN_ACCOUNT_ID=ここにAccount IDを貼り付け

# RSA秘密鍵を入力（重要：改行を \n に置き換える）
DOCUSIGN_PRIVATE_KEY=ここに秘密鍵を貼り付け
```

### 🔑 秘密鍵の変換方法

秘密鍵は複数行ですが、`.dev.vars` ファイルでは1行で記述する必要があります。

**元の秘密鍵:**
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890abcdef...
ghijklmnopqrstuvwxyz...
-----END RSA PRIVATE KEY-----
```

**変換後（改行を \n に置き換え）:**
```
-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA1234567890abcdef...\nghijklmnopqrstuvwxyz...\n-----END RSA PRIVATE KEY-----
```

**簡単な変換方法（macOS/Linux）:**
```bash
# 秘密鍵ファイルを1行に変換
cat ~/Downloads/private.key | tr '\n' '\\n'
```

---

## ステップ3: JWT Grantの許可

初回実行時に、DocuSignからJWT Grantの許可を求められます。

### 3-1. 許可URLにアクセス

ブラウザで以下のURLにアクセスしてください（`YOUR_INTEGRATION_KEY` を実際のIntegration Keyに置き換える）：

```
https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=YOUR_INTEGRATION_KEY&redirect_uri=http://localhost:8787/callback
```

### 3-2. 許可する

1. DocuSignのログイン画面が表示されたらログイン
2. **「Allow Access」** ボタンをクリック
3. リダイレクトされたら完了（エラーページでもOK）

---

## ステップ4: 開発サーバーの起動

ターミナルで以下のコマンドを実行：

```bash
cd /Users/shinichi.tanabe/Desktop/docusign-workers
npm run dev
```

成功すると以下のように表示されます：

```
⛅️ wrangler 4.x.x
-------------------
⎔ Starting local server...
[wrangler:inf] Ready on http://localhost:8787
```

---

## ステップ5: ブラウザでアクセス

ブラウザで以下のURLにアクセス：

```
http://localhost:8787
```

美しいWebインターフェースが表示されます！

---

## 🎉 使い方

### Envelope作成
1. 署名者のメールアドレスを入力
2. 署名者の名前を入力
3. ドキュメント名を入力（オプション）
4. **「Envelopeを作成」** ボタンをクリック
5. 署名者にメールが送信されます

### Envelope情報取得
1. Envelope IDを入力
2. **「情報を取得」** ボタンをクリック
3. Envelopeの詳細情報が表示されます

### Envelopeリスト表示
1. **「リストを取得」** ボタンをクリック
2. 過去30日間のEnvelopeリストが表示されます

---

## ❓ トラブルシューティング

### エラー: "認証エラー"

**原因**: Integration Key、User ID、または秘密鍵が正しくない

**解決方法**:
1. `.dev.vars` ファイルの内容を再確認
2. DocuSign管理画面で情報を再確認
3. 秘密鍵の改行が正しく `\n` に置き換えられているか確認

### エラー: "consent_required"

**原因**: JWT Grantの許可が必要

**解決方法**:
- ステップ3の許可URLにアクセスして「Allow Access」をクリック

### エラー: "Module not found"

**解決方法**:
```bash
cd /Users/shinichi.tanabe/Desktop/docusign-workers
npm install
```

### ポート8787が使用中

**解決方法**:
```bash
# 別のポートで起動
npx wrangler dev --port 8788
```

---

## 📝 次のステップ

ローカルで動作確認できたら：

1. **GitHubにプッシュ**
   ```bash
   cd /Users/shinichi.tanabe/Desktop/docusign-workers
   git init
   git add .
   git commit -m "Initial commit: DocuSign Workers App"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Cloudflare Workersにデプロイ**
   ```bash
   # Cloudflareにログイン
   npx wrangler login
   
   # シークレットを設定
   npx wrangler secret put DOCUSIGN_INTEGRATION_KEY
   npx wrangler secret put DOCUSIGN_USER_ID
   npx wrangler secret put DOCUSIGN_ACCOUNT_ID
   npx wrangler secret put DOCUSIGN_PRIVATE_KEY
   
   # デプロイ
   npm run deploy
   ```

---

## 🎊 完了！

これでローカル開発環境が整いました。楽しい開発を！
