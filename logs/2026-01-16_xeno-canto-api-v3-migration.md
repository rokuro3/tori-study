# 2026-01-16 Xeno-Canto API v3 移行作業ログ

## 概要

Xeno-Canto API v2 から v3 への移行作業を実施。API v3 では認証キーが必須となった。

## 発見した問題

### API v2 の廃止

API v2 でリクエストを送信すると以下のエラーが返される：

```json
{
  "error": "server_error",
  "message": "Xeno-canto API v2 is no longer available. Visit https://xeno-canto.org/explore/api for API v3 documentation."
}
```

### API v3 の認証要件

API v3 では `key` パラメータが必須：

```json
{
  "error": "client_error",
  "message": "Missing or invalid 'key' parameter. Visit https://xeno-canto.org/account to retrieve your API key."
}
```

## 実施した変更

### 1. main.py の更新

- API エンドポイントを v2 から v3 に変更
- 環境変数 `XENO_CANTO_API_KEY` からキーを取得
- `python-dotenv` による `.env` ファイルサポート追加
- ヘルスチェックに API キー設定状況を追加

**変更前:**
```python
url = f"https://xeno-canto.org/api/2/recordings?query={encoded_query}"
```

**変更後:**
```python
url = f"https://xeno-canto.org/api/3/recordings?query={encoded_query}&key={XENO_CANTO_API_KEY}"
```

### 2. 新規ドキュメント作成

- `/docs/xeno-canto-api-setup.md` - APIキー取得・設定ガイド

### 3. Railway デプロイガイド更新

- APIキー取得手順を追加
- 環境変数設定に `XENO_CANTO_API_KEY` を追加
- ヘルスチェックレスポンス例を更新

### 4. 設定ファイル作成

- `/api/.gitignore` - `.env` ファイルを除外
- `/api/.env.example` - 環境変数のテンプレート

## ファイル変更一覧

| ファイル | 変更内容 |
|---------|---------|
| `/api/main.py` | API v3 対応、dotenv サポート追加 |
| `/docs/railway-deploy-guide.md` | APIキー設定手順追加 |
| `/docs/xeno-canto-api-setup.md` | 新規作成 |
| `/api/.gitignore` | 新規作成 |
| `/api/.env.example` | 新規作成 |

## 次のステップ

1. ユーザーは Xeno-Canto アカウントを作成
2. https://xeno-canto.org/account から API キーを取得
3. 環境変数 `XENO_CANTO_API_KEY` に設定
4. アプリケーションを起動してテスト

## ヘルスチェックの確認

APIキーが正しく設定されると、`/api/health` で以下のように表示される：

```json
{
  "status": "healthy",
  "xeno_canto_api": {
    "version": "v3",
    "api_key_configured": true
  }
}
```

## 備考

- Xeno-Canto の API キーは個人アカウントに紐づく
- API キーを公開リポジトリにコミットしないこと
- レートリミット（10秒間隔）は引き続き有効
