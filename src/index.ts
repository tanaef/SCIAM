/**
 * DocuSign API Cloudflare Workers
 * Cloudflare Workers上でDocuSign APIを使用するアプリケーション
 */

import { EnvelopesApi, EnvelopeDefinition, Document, Signer, SignHere, Tabs, Recipients } from 'docusign-esign';

// 環境変数の型定義
interface Env {
  DOCUSIGN_INTEGRATION_KEY: string;
  DOCUSIGN_USER_ID: string;
  DOCUSIGN_ACCOUNT_ID: string;
  DOCUSIGN_PRIVATE_KEY: string;
  DOCUSIGN_BASE_PATH: string;
}

// CORS ヘッダーを追加
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Base64URLエンコード
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * JWTを生成
 */
async function createJWT(env: Env, privateKey: string): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: env.DOCUSIGN_INTEGRATION_KEY,
    sub: env.DOCUSIGN_USER_ID,
    aud: 'account-d.docusign.com',
    iat: now,
    exp: now + 3600,
    scope: 'signature impersonation'
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  // Web Crypto APIを使用してRSA署名を生成
  const pemHeader = '-----BEGIN RSA PRIVATE KEY-----';
  const pemFooter = '-----END RSA PRIVATE KEY-----';
  const pemContents = privateKey
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\s/g, '');
  
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  const encodedSignature = Buffer.from(signature)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${signatureInput}.${encodedSignature}`;
}

/**
 * DocuSign APIクライアントを取得（アクセストークンを返す）
 */
async function getAccessToken(env: Env): Promise<string> {
  try {
    // 秘密鍵を正しい形式に変換
    let privateKey = env.DOCUSIGN_PRIVATE_KEY;
    
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }
    
    privateKey = privateKey.replace(/\\n/g, '\n');
    
    console.log('JWT認証を開始します...');
    console.log('Integration Key:', env.DOCUSIGN_INTEGRATION_KEY);
    console.log('User ID:', env.DOCUSIGN_USER_ID);

    // JWTを生成
    const jwt = await createJWT(env, privateKey);
    console.log('JWT生成完了');

    // DocuSign OAuth APIにリクエスト
    const tokenUrl = 'https://account-d.docusign.com/oauth/token';
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OAuth APIエラー:', errorText);
      throw new Error(`OAuth API error: ${response.status} ${errorText}`);
    }

    const data = await response.json() as { access_token: string };
    console.log('アクセストークン取得成功');
    
    return data.access_token;
  } catch (error) {
    console.error('=== 認証エラーの詳細 ===');
    console.error('エラーオブジェクト:', error);
    if (error instanceof Error) {
      console.error('エラーメッセージ:', error.message);
      console.error('エラースタック:', error.stack);
      throw new Error(`DocuSign認証に失敗しました: ${error.message}`);
    }
    throw new Error('DocuSign認証に失敗しました');
  }
}

/**
 * DocuSign APIを直接呼び出すヘルパー関数
 */
async function callDocuSignAPI(
  env: Env,
  accessToken: string,
  method: string,
  path: string,
  body?: any
): Promise<any> {
  const url = `${env.DOCUSIGN_BASE_PATH}${path}`;
  
  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DocuSign API error: ${response.status} ${errorText}`);
  }

  return await response.json();
}

/**
 * シンプルなPDFドキュメントを作成
 */
function createSamplePDF(): string {
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 100
>>
stream
BT
/F1 24 Tf
100 700 Td
(Please sign this document) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000317 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
466
%%EOF
`;
  return Buffer.from(pdfContent).toString('base64');
}

/**
 * HTMLページを返す
 */
function getHTMLPage(): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DocuSign API - Cloudflare Workers</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        header {
            text-align: center;
            color: white;
            margin-bottom: 40px;
        }
        h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        .subtitle {
            font-size: 1.1rem;
            opacity: 0.9;
        }
        .cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 30px;
            margin-bottom: 30px;
        }
        .card {
            background: white;
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 40px rgba(0,0,0,0.3);
        }
        .card h2 {
            color: #667eea;
            margin-bottom: 20px;
            font-size: 1.5rem;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .icon {
            font-size: 1.8rem;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            color: #333;
            font-weight: 500;
        }
        input[type="text"],
        input[type="email"] {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 1rem;
            transition: border-color 0.3s ease;
        }
        input[type="text"]:focus,
        input[type="email"]:focus {
            outline: none;
            border-color: #667eea;
        }
        button {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        button:active {
            transform: translateY(0);
        }
        button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        .result {
            margin-top: 20px;
            padding: 15px;
            border-radius: 8px;
            display: none;
        }
        .result.success {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
        }
        .result.error {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
        }
        .result.info {
            background: #d1ecf1;
            border: 1px solid #bee5eb;
            color: #0c5460;
        }
        .envelope-list {
            max-height: 400px;
            overflow-y: auto;
            margin-top: 20px;
        }
        .envelope-item {
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            margin-bottom: 10px;
            border-left: 4px solid #667eea;
        }
        .envelope-item strong {
            color: #667eea;
        }
        .envelope-item .status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            margin-left: 10px;
        }
        .status.sent {
            background: #fff3cd;
            color: #856404;
        }
        .status.delivered {
            background: #d1ecf1;
            color: #0c5460;
        }
        .status.completed {
            background: #d4edda;
            color: #155724;
        }
        .status.voided {
            background: #f8d7da;
            color: #721c24;
        }
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255,255,255,.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s ease-in-out infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .info-box {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            margin-bottom: 30px;
        }
        .info-box h3 {
            color: #667eea;
            margin-bottom: 15px;
        }
        .info-box ul {
            list-style: none;
            padding-left: 0;
        }
        .info-box li {
            padding: 8px 0;
            color: #555;
        }
        .info-box li:before {
            content: "✓ ";
            color: #667eea;
            font-weight: bold;
            margin-right: 8px;
        }
        @media (max-width: 768px) {
            h1 {
                font-size: 2rem;
            }
            .cards {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>📄 DocuSign API - Cloudflare Workers</h1>
            <p class="subtitle">Envelopeの作成・管理を簡単に</p>
        </header>

        <div class="info-box">
            <h3>🚀 このアプリケーションでできること</h3>
            <ul>
                <li>署名用のEnvelopeを作成して送信</li>
                <li>Envelope IDで詳細情報を取得</li>
                <li>過去のEnvelopeリストを表示</li>
                <li>Navigator APIで文書を管理（アップロード・ダウンロード）</li>
            </ul>
        </div>

        <div class="cards">
            <div class="card">
                <h2><span class="icon">✉️</span> Envelope作成</h2>
                <form id="createEnvelopeForm">
                    <div class="form-group">
                        <label for="signerEmail">署名者のメールアドレス</label>
                        <input type="email" id="signerEmail" name="signer_email" required 
                               placeholder="example@example.com">
                    </div>
                    <div class="form-group">
                        <label for="signerName">署名者の名前</label>
                        <input type="text" id="signerName" name="signer_name" required 
                               placeholder="山田 太郎">
                    </div>
                    <div class="form-group">
                        <label for="documentName">ドキュメント名</label>
                        <input type="text" id="documentName" name="document_name" 
                               placeholder="契約書" value="Sample Document">
                    </div>
                    <button type="submit" id="createBtn">
                        <span class="btn-text">Envelopeを作成</span>
                    </button>
                </form>
                <div id="createResult" class="result"></div>
            </div>

            <div class="card">
                <h2><span class="icon">🔍</span> Envelope情報取得</h2>
                <form id="getEnvelopeForm">
                    <div class="form-group">
                        <label for="envelopeId">Envelope ID</label>
                        <input type="text" id="envelopeId" name="envelope_id" required 
                               placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx">
                    </div>
                    <button type="submit" id="getBtn">
                        <span class="btn-text">情報を取得</span>
                    </button>
                </form>
                <div id="getResult" class="result"></div>
            </div>

            <div class="card">
                <h2><span class="icon">📋</span> Envelopeリスト</h2>
                <p style="color: #666; margin-bottom: 20px;">過去30日間のEnvelopeを表示します</p>
                <button id="listBtn">
                    <span class="btn-text">リストを取得</span>
                </button>
                <div id="listResult" class="result"></div>
            </div>
        </div>

        <div class="info-box" style="margin-top: 40px;">
            <h3>📚 Navigator API - 文書管理</h3>
            <ul>
                <li>Navigatorに保存されている文書の一覧を表示</li>
                <li>文書をダウンロード</li>
                <li>新しい文書をアップロード</li>
            </ul>
        </div>

        <div class="cards">
            <div class="card">
                <h2><span class="icon">📤</span> 文書アップロード</h2>
                <form id="navigatorUploadForm">
                    <div class="form-group">
                        <label for="navigatorFile">ファイルを選択</label>
                        <input type="file" id="navigatorFile" name="file" required 
                               accept=".pdf,.doc,.docx,.txt" 
                               style="padding: 10px; border: 2px dashed #667eea; border-radius: 8px; background: #f8f9fa;">
                    </div>
                    <button type="submit" id="navigatorUploadBtn">
                        <span class="btn-text">アップロード</span>
                    </button>
                </form>
                <div id="navigatorUploadResult" class="result"></div>
            </div>

            <div class="card">
                <h2><span class="icon">📄</span> Navigator文書リスト</h2>
                <p style="color: #666; margin-bottom: 20px;">Navigatorに保存されている文書を表示します</p>
                <button id="navigatorListBtn">
                    <span class="btn-text">文書リストを取得</span>
                </button>
                <div id="navigatorListResult" class="result"></div>
            </div>
        </div>
    </div>

    <script>
        document.getElementById('createEnvelopeForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('createBtn');
            const btnText = btn.querySelector('.btn-text');
            const resultDiv = document.getElementById('createResult');
            
            btn.disabled = true;
            btnText.innerHTML = '<span class="loading"></span> 作成中...';
            resultDiv.style.display = 'none';
            
            const formData = {
                signer_email: document.getElementById('signerEmail').value,
                signer_name: document.getElementById('signerName').value,
                document_name: document.getElementById('documentName').value
            };
            
            try {
                const response = await fetch('/api/create-envelope', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    resultDiv.className = 'result success';
                    resultDiv.innerHTML = \`
                        <strong>✅ 成功!</strong><br>
                        \${data.message}<br>
                        <strong>Envelope ID:</strong> \${data.envelope_id}<br>
                        <strong>ステータス:</strong> \${data.status}
                    \`;
                    e.target.reset();
                } else {
                    throw new Error(data.error || '不明なエラー');
                }
            } catch (error) {
                resultDiv.className = 'result error';
                resultDiv.innerHTML = \`<strong>❌ エラー:</strong> \${error.message}\`;
            } finally {
                btn.disabled = false;
                btnText.textContent = 'Envelopeを作成';
                resultDiv.style.display = 'block';
            }
        });

        document.getElementById('getEnvelopeForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('getBtn');
            const btnText = btn.querySelector('.btn-text');
            const resultDiv = document.getElementById('getResult');
            
            btn.disabled = true;
            btnText.innerHTML = '<span class="loading"></span> 取得中...';
            resultDiv.style.display = 'none';
            
            const envelopeId = document.getElementById('envelopeId').value;
            
            try {
                const response = await fetch(\`/api/get-envelope/\${envelopeId}\`);
                const data = await response.json();
                
                if (data.success) {
                    resultDiv.className = 'result info';
                    resultDiv.innerHTML = \`
                        <strong>📄 Envelope情報</strong><br>
                        <strong>ID:</strong> \${data.envelope_id}<br>
                        <strong>ステータス:</strong> \${data.status}<br>
                        <strong>件名:</strong> \${data.email_subject}<br>
                        <strong>作成日時:</strong> \${formatDate(data.created_date_time)}<br>
                        \${data.sent_date_time ? \`<strong>送信日時:</strong> \${formatDate(data.sent_date_time)}<br>\` : ''}
                        \${data.completed_date_time ? \`<strong>完了日時:</strong> \${formatDate(data.completed_date_time)}<br>\` : ''}
                    \`;
                } else {
                    throw new Error(data.error || '不明なエラー');
                }
            } catch (error) {
                resultDiv.className = 'result error';
                resultDiv.innerHTML = \`<strong>❌ エラー:</strong> \${error.message}\`;
            } finally {
                btn.disabled = false;
                btnText.textContent = '情報を取得';
                resultDiv.style.display = 'block';
            }
        });

        document.getElementById('listBtn').addEventListener('click', async () => {
            const btn = document.getElementById('listBtn');
            const btnText = btn.querySelector('.btn-text');
            const resultDiv = document.getElementById('listResult');
            
            btn.disabled = true;
            btnText.innerHTML = '<span class="loading"></span> 取得中...';
            resultDiv.style.display = 'none';
            
            try {
                const response = await fetch('/api/list-envelopes');
                const data = await response.json();
                
                if (data.success) {
                    resultDiv.className = 'result info';
                    
                    if (data.envelopes.length === 0) {
                        resultDiv.innerHTML = '<strong>📭 Envelopeが見つかりませんでした</strong>';
                    } else {
                        let html = \`<strong>📋 Envelopeリスト (\${data.count}件)</strong>\`;
                        html += '<div class="envelope-list">';
                        
                        data.envelopes.forEach(env => {
                            html += \`
                                <div class="envelope-item">
                                    <strong>ID:</strong> \${env.envelope_id}
                                    <span class="status \${env.status}">\${env.status}</span><br>
                                    <strong>件名:</strong> \${env.email_subject || '(件名なし)'}<br>
                                    <strong>作成日時:</strong> \${formatDate(env.created_date_time)}
                                </div>
                            \`;
                        });
                        
                        html += '</div>';
                        resultDiv.innerHTML = html;
                    }
                } else {
                    throw new Error(data.error || '不明なエラー');
                }
            } catch (error) {
                resultDiv.className = 'result error';
                resultDiv.innerHTML = \`<strong>❌ エラー:</strong> \${error.message}\`;
            } finally {
                btn.disabled = false;
                btnText.textContent = 'リストを取得';
                resultDiv.style.display = 'block';
            }
        });

        // Navigator: 文書一覧取得
        document.getElementById('navigatorListBtn').addEventListener('click', async () => {
            const btn = document.getElementById('navigatorListBtn');
            const btnText = btn.querySelector('.btn-text');
            const resultDiv = document.getElementById('navigatorListResult');
            
            btn.disabled = true;
            btnText.innerHTML = '<span class="loading"></span> 取得中...';
            resultDiv.style.display = 'none';
            
            try {
                const response = await fetch('/api/navigator/documents');
                const data = await response.json();
                
                if (data.success) {
                    resultDiv.className = 'result info';
                    
                    if (data.documents.length === 0) {
                        resultDiv.innerHTML = '<strong>📭 文書が見つかりませんでした</strong>';
                    } else {
                        let html = \`<strong>📄 Navigator文書リスト (\${data.count}件)</strong>\`;
                        html += '<div class="envelope-list">';
                        
                        data.documents.forEach(doc => {
                            html += \`
                                <div class="envelope-item">
                                    <strong>名前:</strong> \${doc.name || '(名前なし)'}<br>
                                    <strong>ID:</strong> \${doc.documentId}<br>
                                    <strong>作成日時:</strong> \${formatDate(doc.createdDateTime)}<br>
                                    <button onclick="downloadDocument('\${doc.documentId}', '\${doc.name}')" 
                                            style="margin-top: 10px; padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;">
                                        ダウンロード
                                    </button>
                                </div>
                            \`;
                        });
                        
                        html += '</div>';
                        resultDiv.innerHTML = html;
                    }
                } else {
                    throw new Error(data.error || '不明なエラー');
                }
            } catch (error) {
                resultDiv.className = 'result error';
                resultDiv.innerHTML = \`<strong>❌ エラー:</strong> \${error.message}\`;
            } finally {
                btn.disabled = false;
                btnText.textContent = '文書リストを取得';
                resultDiv.style.display = 'block';
            }
        });

        // Navigator: 文書アップロード
        document.getElementById('navigatorUploadForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('navigatorUploadBtn');
            const btnText = btn.querySelector('.btn-text');
            const resultDiv = document.getElementById('navigatorUploadResult');
            
            btn.disabled = true;
            btnText.innerHTML = '<span class="loading"></span> アップロード中...';
            resultDiv.style.display = 'none';
            
            const fileInput = document.getElementById('navigatorFile');
            const file = fileInput.files[0];
            
            if (!file) {
                resultDiv.className = 'result error';
                resultDiv.innerHTML = '<strong>❌ エラー:</strong> ファイルを選択してください';
                resultDiv.style.display = 'block';
                btn.disabled = false;
                btnText.textContent = 'アップロード';
                return;
            }
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('name', file.name);
            
            try {
                const response = await fetch('/api/navigator/documents/upload', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    resultDiv.className = 'result success';
                    resultDiv.innerHTML = \`
                        <strong>✅ 成功!</strong><br>
                        \${data.message}<br>
                        <strong>Document ID:</strong> \${data.document_id}
                    \`;
                    e.target.reset();
                } else {
                    throw new Error(data.error || '不明なエラー');
                }
            } catch (error) {
                resultDiv.className = 'result error';
                resultDiv.innerHTML = \`<strong>❌ エラー:</strong> \${error.message}\`;
            } finally {
                btn.disabled = false;
                btnText.textContent = 'アップロード';
                resultDiv.style.display = 'block';
            }
        });

        // 文書ダウンロード関数
        async function downloadDocument(documentId, documentName) {
            try {
                const response = await fetch(\`/api/navigator/documents/\${documentId}/download\`);
                
                if (!response.ok) {
                    throw new Error('ダウンロードに失敗しました');
                }
                
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = documentName || \`document_\${documentId}.pdf\`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } catch (error) {
                alert(\`ダウンロードエラー: \${error.message}\`);
            }
        }

        function formatDate(dateString) {
            if (!dateString) return '-';
            const date = new Date(dateString);
            return date.toLocaleString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    </script>
</body>
</html>`;
}

/**
 * メインのリクエストハンドラー
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // OPTIONSリクエスト（CORS preflight）
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // ルーティング
    try {
      // ホームページ
      if (url.pathname === '/' && request.method === 'GET') {
        return new Response(getHTMLPage(), {
          headers: {
            'Content-Type': 'text/html;charset=UTF-8',
            ...corsHeaders,
          },
        });
      }

      // Envelope作成API
      if (url.pathname === '/api/create-envelope' && request.method === 'POST') {
        const body = await request.json() as {
          signer_email: string;
          signer_name: string;
          document_name?: string;
        };

        if (!body.signer_email || !body.signer_name) {
          return new Response(
            JSON.stringify({ error: '署名者のメールアドレスと名前が必要です' }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            }
          );
        }

        // アクセストークンを取得
        const accessToken = await getAccessToken(env);

        // Envelope定義を作成
        const documentBase64 = createSamplePDF();
        
        const envelopeDefinition = {
          emailSubject: '署名をお願いします - DocuSign App',
          documents: [
            {
              documentBase64,
              name: body.document_name || 'Sample Document',
              fileExtension: 'pdf',
              documentId: '1',
            },
          ],
          recipients: {
            signers: [
              {
                email: body.signer_email,
                name: body.signer_name,
                recipientId: '1',
                routingOrder: '1',
                tabs: {
                  signHereTabs: [
                    {
                      documentId: '1',
                      pageNumber: '1',
                      xPosition: '100',
                      yPosition: '150',
                    },
                  ],
                },
              },
            ],
          },
          status: 'sent',
        };

        // DocuSign APIを直接呼び出し
        const results = await callDocuSignAPI(
          env,
          accessToken,
          'POST',
          `/v2.1/accounts/${env.DOCUSIGN_ACCOUNT_ID}/envelopes`,
          envelopeDefinition
        );

        return new Response(
          JSON.stringify({
            success: true,
            envelope_id: results.envelopeId,
            status: results.status,
            message: `Envelopeが正常に作成されました（ID: ${results.envelopeId}）`,
          }),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      // Envelope情報取得API
      if (url.pathname.startsWith('/api/get-envelope/') && request.method === 'GET') {
        const envelopeId = url.pathname.split('/').pop();

        if (!envelopeId) {
          return new Response(
            JSON.stringify({ error: 'Envelope IDが必要です' }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            }
          );
        }

        // アクセストークンを取得
        const accessToken = await getAccessToken(env);

        // DocuSign APIを直接呼び出し
        const envelope = await callDocuSignAPI(
          env,
          accessToken,
          'GET',
          `/v2.1/accounts/${env.DOCUSIGN_ACCOUNT_ID}/envelopes/${envelopeId}`
        );

        return new Response(
          JSON.stringify({
            success: true,
            envelope_id: envelope.envelopeId,
            status: envelope.status,
            email_subject: envelope.emailSubject,
            created_date_time: envelope.createdDateTime,
            sent_date_time: envelope.sentDateTime,
            completed_date_time: envelope.completedDateTime,
            status_changed_date_time: envelope.statusChangedDateTime,
          }),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      // Envelopeリスト取得API
      if (url.pathname === '/api/list-envelopes' && request.method === 'GET') {
        // アクセストークンを取得
        const accessToken = await getAccessToken(env);

        const now = new Date();
        const fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

        // DocuSign APIを直接呼び出し
        const results = await callDocuSignAPI(
          env,
          accessToken,
          'GET',
          `/v2.1/accounts/${env.DOCUSIGN_ACCOUNT_ID}/envelopes?from_date=${fromDate}`
        );

        const envelopes = results.envelopes?.map((envelope: any) => ({
          envelope_id: envelope.envelopeId,
          status: envelope.status,
          email_subject: envelope.emailSubject,
          created_date_time: envelope.createdDateTime,
        })) || [];

        return new Response(
          JSON.stringify({
            success: true,
            envelopes,
            count: envelopes.length,
          }),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      // Navigator API: 文書一覧取得
      if (url.pathname === '/api/navigator/documents' && request.method === 'GET') {
        const accessToken = await getAccessToken(env);
        
        // 複数のエンドポイントパターンを試す
        const basePathWithoutRestapi = env.DOCUSIGN_BASE_PATH.replace('/restapi', '');
        const patterns = [
          // パターン1: /restapiを含める
          `${env.DOCUSIGN_BASE_PATH}/navigator/v1/accounts/${env.DOCUSIGN_ACCOUNT_ID}/documents`,
          // パターン2: /restapiを除く
          `${basePathWithoutRestapi}/navigator/v1/accounts/${env.DOCUSIGN_ACCOUNT_ID}/documents`,
          // パターン3: api-d.docusign.netを使用
          `https://api-d.docusign.net/navigator/v1/accounts/${env.DOCUSIGN_ACCOUNT_ID}/documents`,
        ];

        let lastError = '';
        
        for (const testUrl of patterns) {
          console.log('Trying Navigator API URL:', testUrl);
          
          try {
            const response = await fetch(testUrl, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            });

            console.log('Response status:', response.status);

            if (response.ok) {
              const data = await response.json() as { documents?: any[] };
              console.log('Success with URL:', testUrl);

              return new Response(
                JSON.stringify({
                  success: true,
                  documents: data.documents || [],
                  count: data.documents?.length || 0,
                  endpoint_used: testUrl,
                }),
                {
                  headers: { 'Content-Type': 'application/json', ...corsHeaders },
                }
              );
            } else {
              const errorText = await response.text();
              lastError = `${response.status}: ${errorText}`;
              console.log('Failed with URL:', testUrl, 'Error:', lastError);
            }
          } catch (error) {
            lastError = error instanceof Error ? error.message : 'Unknown error';
            console.log('Exception with URL:', testUrl, 'Error:', lastError);
          }
        }

        // すべてのパターンが失敗した場合
        throw new Error(`Navigator API error: All endpoint patterns failed. Last error: ${lastError}`);
      }
      // Navigator API: 文書ダウンロード
      if (url.pathname.startsWith('/api/navigator/documents/') && 
          url.pathname.endsWith('/download') && 
          request.method === 'GET') {
        const pathParts = url.pathname.split('/');
        const documentId = pathParts[pathParts.length - 2];

        if (!documentId) {
          return new Response(
            JSON.stringify({ error: 'Document IDが必要です' }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            }
          );
        }

        const accessToken = await getAccessToken(env);
        const navigatorBasePath = env.DOCUSIGN_BASE_PATH.replace('/restapi', '');

        const response = await fetch(
          `${navigatorBasePath}/navigator/v1/accounts/${env.DOCUSIGN_ACCOUNT_ID}/documents/${documentId}/content`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Navigator API error: ${response.status} ${errorText}`);
        }

        const documentData = await response.arrayBuffer();
        const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
        const contentDisposition = response.headers.get('Content-Disposition') || `attachment; filename="document_${documentId}.pdf"`;

        return new Response(documentData, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': contentDisposition,
            ...corsHeaders,
          },
        });
      }
      // Navigator API: 文書ダウンロード
      if (url.pathname.startsWith('/api/navigator/documents/') && 
          url.pathname.endsWith('/download') && 
          request.method === 'GET') {
        const pathParts = url.pathname.split('/');
        const documentId = pathParts[pathParts.length - 2];

        if (!documentId) {
          return new Response(
            JSON.stringify({ error: 'Document IDが必要です' }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            }
          );
        }

        const accessToken = await getAccessToken(env);
        
        // 複数のエンドポイントパターンを試す
        const basePathWithoutRestapi = env.DOCUSIGN_BASE_PATH.replace('/restapi', '');
        const patterns = [
          `${env.DOCUSIGN_BASE_PATH}/navigator/v1/accounts/${env.DOCUSIGN_ACCOUNT_ID}/documents/${documentId}/content`,
          `${basePathWithoutRestapi}/navigator/v1/accounts/${env.DOCUSIGN_ACCOUNT_ID}/documents/${documentId}/content`,
          `https://api-d.docusign.net/navigator/v1/accounts/${env.DOCUSIGN_ACCOUNT_ID}/documents/${documentId}/content`,
        ];

        let lastError = '';
        
        for (const testUrl of patterns) {
          console.log('Trying download URL:', testUrl);
          
          try {
            const response = await fetch(testUrl, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            });

            if (response.ok) {
              const documentData = await response.arrayBuffer();
              const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
              const contentDisposition = response.headers.get('Content-Disposition') || `attachment; filename="document_${documentId}.pdf"`;

              return new Response(documentData, {
                headers: {
                  'Content-Type': contentType,
                  'Content-Disposition': contentDisposition,
                  ...corsHeaders,
                },
              });
            } else {
              const errorText = await response.text();
              lastError = `${response.status}: ${errorText}`;
            }
          } catch (error) {
            lastError = error instanceof Error ? error.message : 'Unknown error';
          }
        }

        throw new Error(`Navigator API error: All endpoint patterns failed. Last error: ${lastError}`);
      }

      // Navigator API: 文書ダウンロード
      if (url.pathname.startsWith('/api/navigator/documents/') && 
          url.pathname.endsWith('/download') && 
          request.method === 'GET') {
        const pathParts = url.pathname.split('/');
        const documentId = pathParts[pathParts.length - 2];

        if (!documentId) {
          return new Response(
            JSON.stringify({ error: 'Document IDが必要です' }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            }
          );
        }

        const accessToken = await getAccessToken(env);
        const navigatorBasePath = env.DOCUSIGN_BASE_PATH.replace('/restapi', '');

        const response = await fetch(
          `${navigatorBasePath}/navigator/v1/accounts/${env.DOCUSIGN_ACCOUNT_ID}/documents/${documentId}/content`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Navigator API error: ${response.status} ${errorText}`);
        }

        const documentData = await response.arrayBuffer();
        const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
        const contentDisposition = response.headers.get('Content-Disposition') || `attachment; filename="document_${documentId}.pdf"`;

        return new Response(documentData, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': contentDisposition,
            ...corsHeaders,
          },
        });
      }

      // Navigator API: 文書アップロード
      if (url.pathname === '/api/navigator/documents/upload' && request.method === 'POST') {
        const accessToken = await getAccessToken(env);

        const formData = await request.formData();
        const file = formData.get('file');
        
        if (!file || typeof file === 'string') {
          return new Response(
            JSON.stringify({ error: 'ファイルが必要です' }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            }
          );
        }

        const documentName = (formData.get('name') as string) || (file as File).name;
        const fileBuffer = await (file as File).arrayBuffer();
        const fileBase64 = Buffer.from(fileBuffer).toString('base64');

        // 複数のエンドポイントパターンを試す
        const basePathWithoutRestapi = env.DOCUSIGN_BASE_PATH.replace('/restapi', '');
        const patterns = [
          `${env.DOCUSIGN_BASE_PATH}/navigator/v1/accounts/${env.DOCUSIGN_ACCOUNT_ID}/documents`,
          `${basePathWithoutRestapi}/navigator/v1/accounts/${env.DOCUSIGN_ACCOUNT_ID}/documents`,
          `https://api-d.docusign.net/navigator/v1/accounts/${env.DOCUSIGN_ACCOUNT_ID}/documents`,
        ];

        let lastError = '';
        
        for (const testUrl of patterns) {
          console.log('Trying upload URL:', testUrl);
          
          try {
            const uploadResponse = await fetch(testUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: documentName,
                fileExtension: (file as File).name.split('.').pop() || 'pdf',
                documentBase64: fileBase64,
              }),
            });

            console.log('Upload response status:', uploadResponse.status);

            if (uploadResponse.ok) {
              const uploadData = await uploadResponse.json() as { documentId: string };
              console.log('Success with URL:', testUrl);

              return new Response(
                JSON.stringify({
                  success: true,
                  document_id: uploadData.documentId,
                  message: '文書が正常にアップロードされました',
                  endpoint_used: testUrl,
                }),
                {
                  headers: { 'Content-Type': 'application/json', ...corsHeaders },
                }
              );
            } else {
              const errorText = await uploadResponse.text();
              lastError = `${uploadResponse.status}: ${errorText}`;
              console.log('Failed with URL:', testUrl, 'Error:', lastError);
            }
          } catch (error) {
            lastError = error instanceof Error ? error.message : 'Unknown error';
            console.log('Exception with URL:', testUrl, 'Error:', lastError);
          }
        }

        throw new Error(`Navigator API error: All endpoint patterns failed. Last error: ${lastError}`);
      }

      // 404 Not Found
      return new Response('Not Found', {
        status: 404,
        headers: corsHeaders,
      });
    } catch (error) {
      console.error('エラー:', error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : '不明なエラーが発生しました',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }
  },
};
