# Navigator API トラブルシューティング

## 現在のエラー: 404 - File or directory not found

このエラーは、Navigator APIのエンドポイントが見つからないことを示しています。以下の可能性が考えられます：

## 1. **Navigator APIの有効化確認**
- ✅ 社員として裏側の設定で有効化済み（確認済み）
- 確認事項：
  - アカウントレベルでNavigator APIが有効になっているか
  - Integration Keyに対してNavigator APIのスコープが付与されているか

## 2. **APIエンドポイントの問題**

### 現在の実装:
```typescript
const navigatorBasePath = env.DOCUSIGN_BASE_PATH.replace('/restapi', '');
// 例: https://demo.docusign.net/restapi → https://demo.docusign.net

const url = `${navigatorBasePath}/navigator/v1/accounts/${accountId}/documents`;
```

### 考えられる正しいエンドポイント:
1. **オプション1**: `/restapi`を含める
   ```
   https://demo.docusign.net/restapi/navigator/v1/accounts/{accountId}/documents
   ```

2. **オプション2**: 別のベースURL
   ```
   https://api-d.docusign.net/navigator/v1/accounts/{accountId}/documents
   ```

3. **オプション3**: 異なるAPIバージョン
   ```
   https://demo.docusign.net/navigator/v2/accounts/{accountId}/documents
   ```

## 3. **認証スコープの確認**

JWTのスコープに`navigator`が含まれているか確認：
```typescript
scope: 'signature impersonation'  // 現在
// 必要かもしれない:
scope: 'signature impersonation navigator'
```

## 4. **アカウントIDの確認**

- Demo環境とProduction環境でアカウントIDが異なる
- Navigator APIが有効なアカウントIDを使用しているか確認

## 5. **APIドキュメントの確認**

Navigator APIの正式なエンドポイントを確認：
- 内部ドキュメント
- Swagger/OpenAPI仕様
- 開発者ポータルの限定アクセスセクション

## 推奨される次のステップ

### ステップ1: エンドポイントのバリエーションをテスト
複数のエンドポイントパターンを試して、どれが正しいか確認する

### ステップ2: 詳細なエラーログを確認
```typescript
console.log('Navigator Base Path:', navigatorBasePath);
console.log('Full URL:', url);
console.log('Response Status:', response.status);
console.log('Response Headers:', response.headers);
```

### ステップ3: DocuSign社内リソースに確認
- Navigator APIの正式なエンドポイント仕様
- Demo環境での有効化手順
- 必要な権限とスコープ

## テスト用のデバッグエンドポイント

以下のエンドポイントを追加して、どのURLが正しいか確認できます：

```typescript
// /api/navigator/test
// 複数のエンドポイントパターンを試す
const patterns = [
  `${basePath}/restapi/navigator/v1/accounts/${accountId}/documents`,
  `${basePath}/navigator/v1/accounts/${accountId}/documents`,
  `https://api-d.docusign.net/navigator/v1/accounts/${accountId}/documents`,
];
```

## 参考情報

- 現在のベースパス: `https://demo.docusign.net/restapi`
- 使用している認証: JWT (impersonation)
- エラーコード: 404 (Not Found)
- 環境: Demo (account-d.docusign.com)

## 結論: Navigator APIが解放されていない可能性が高い

すべてのエンドポイントパターンで404エラーが発生する場合、以下の可能性が最も高いです：

### 1. **Navigator APIの有効化が完了していない**
- アカウントレベルでの有効化
- Integration Keyへの権限付与
- 環境（Demo/Production）での有効化状態

### 2. **確認すべき項目**

#### DocuSign管理画面での確認:
1. **Settings > Integrations > Apps and Keys**
   - Integration Keyを選択
   - "Additional Settings"または"API Access"セクション
   - Navigator APIが有効になっているか確認

2. **Account Settings**
   - Navigator機能が有効になっているか
   - Demo環境とProduction環境で設定が異なる可能性

3. **User Permissions**
   - ユーザーアカウントにNavigator APIの使用権限があるか
   - Admin権限が必要な場合がある

#### 社内リソースでの確認:
- Navigator APIのプロビジョニング状態
- 内部ツールでの有効化ステータス
- Demo環境での制限事項

### 3. **代替アプローチ**

Navigator APIが利用できない場合の代替案：

#### オプション1: Envelope APIで文書を管理
```typescript
// Envelopeから文書を取得
GET /v2.1/accounts/{accountId}/envelopes/{envelopeId}/documents
GET /v2.1/accounts/{accountId}/envelopes/{envelopeId}/documents/{documentId}
```

#### オプション2: Templates APIを使用
```typescript
// テンプレートとして文書を管理
GET /v2.1/accounts/{accountId}/templates
POST /v2.1/accounts/{accountId}/templates
```

#### オプション3: Rooms APIを検討
DocuSign Roomsが有効な場合、文書管理機能を提供

### 4. **次のアクション**

1. **社内のNavigator APIチームに確認**
   - アカウントIDでのNavigator API有効化状態
   - Demo環境での利用可否
   - 必要な追加設定や承認プロセス

2. **Integration Keyの再確認**
   - 正しいIntegration Keyを使用しているか
   - Navigator APIスコープが付与されているか

3. **別の環境でテスト**
   - Production環境で試す（有効化されている場合）
   - 別のアカウントIDで試す

### 5. **暫定対応**

Navigator APIが使えない間は、Envelope APIを使った文書管理機能を実装することをお勧めします：

- Envelopeに添付された文書の一覧取得
- 完了したEnvelopeから文書をダウンロード
- 新しいEnvelopeを作成して文書をアップロード

これらの機能は既に実装されているEnvelope APIで実現可能です。
