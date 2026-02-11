# GitHubへのプッシュ方法（Google認証の場合）

Google認証を使用しているGitHubアカウントの場合、Personal Access Token (PAT)を使用してプッシュする必要があります。

## 手順

### 1. GitHub Personal Access Tokenの作成

1. GitHubにログイン
2. 右上のプロフィールアイコン → **Settings**
3. 左サイドバーの一番下 → **Developer settings**
4. **Personal access tokens** → **Tokens (classic)**
5. **Generate new token** → **Generate new token (classic)**
6. トークンの設定：
   - **Note**: `docusign-workers` (任意の名前)
   - **Expiration**: 90 days（または任意の期間）
   - **Select scopes**: 
     - ✅ `repo` (すべてのリポジトリアクセス)
7. **Generate token**をクリック
8. **トークンをコピーして安全な場所に保存**（再表示されません）

### 2. GitHubでリポジトリを作成

1. GitHub → **New repository**
2. Repository name: `docusign-workers`
3. Description: `DocuSign API Cloudflare Workers Application`
4. **Public** または **Private** を選択
5. **Create repository**

### 3. リモートリポジトリの追加とプッシュ

```bash
cd /Users/shinichi.tanabe/Desktop/docusign-workers

# リモートリポジトリを追加（<username>を自分のGitHubユーザー名に置き換え）
git remote add origin https://github.com/<username>/docusign-workers.git

# ブランチ名をmainに設定（既にmainの場合は不要）
git branch -M main

# プッシュ（初回）
git push -u origin main
```

### 4. 認証情報の入力

プッシュ時に認証情報を求められます：

- **Username**: GitHubのユーザー名
- **Password**: 作成したPersonal Access Token（パスワードではない）

### 5. 認証情報の保存（オプション）

毎回トークンを入力したくない場合：

```bash
# macOSの場合（Keychainに保存）
git config --global credential.helper osxkeychain

# 次回のpush時に入力したトークンが保存されます
```

## トラブルシューティング

### エラー: "Support for password authentication was removed"

パスワードの代わりにPersonal Access Tokenを使用してください。

### エラー: "Permission denied"

- トークンに`repo`スコープが含まれているか確認
- トークンの有効期限が切れていないか確認
- 正しいトークンを入力しているか確認

## SSH認証を使用する場合（推奨）

より安全で便利な方法として、SSH鍵を使用することもできます：

### 1. SSH鍵の生成

```bash
ssh-keygen -t ed25519 -C "shinichi.tanabe@docusign.com"
# Enterを3回押す（デフォルト設定）
```

### 2. SSH鍵をGitHubに追加

```bash
# 公開鍵をクリップボードにコピー
pbcopy < ~/.ssh/id_ed25519.pub
```

1. GitHub → **Settings** → **SSH and GPG keys**
2. **New SSH key**
3. Title: `MacBook Pro`（任意の名前）
4. Key: ペースト
5. **Add SSH key**

### 3. リモートURLをSSHに変更

```bash
cd /Users/shinichi.tanabe/Desktop/docusign-workers

# HTTPSの場合は削除
git remote remove origin

# SSHで追加
git remote add origin git@github.com:<username>/docusign-workers.git

# プッシュ
git push -u origin main
```

SSH認証を使用すると、パスワードやトークンの入力が不要になります。
