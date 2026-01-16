# 作業ログ: FastAPI Xeno-Canto専用化とRailwayデプロイ準備

**日付**: 2026-01-16

## 実施内容

### 1. API変更: Xeno-Canto専用化
- Bird ResearchとSuntoryのデータソースを削除
- Xeno-Cantoのみを音声データソースとして使用
- 日本国内の音声のみ取得（`cnt:japan`パラメータ）

### 2. レートリミット機能
- Xeno-Canto APIへのリクエストを10秒に1回に制限
- `RateLimiter`クラスでスレッドセーフに実装
- `/api/rate-limit/status`エンドポイントで状態確認可能

### 3. Railwayデプロイ設定
- `railway.toml`を作成
- `Dockerfile`をプロジェクトルートに配置
- `requirements.txt`を必要最小限に整理

### 4. デプロイ手順書の作成
- `docs/railway-deploy-guide.md`を作成
- Railwayアカウント作成からデプロイまでの手順を記載
- 無料枠の制限、トラブルシューティング情報を含む

## 作成・更新ファイル一覧

| ファイル | 操作 | 説明 |
|---------|------|------|
| `api/main.py` | 更新 | Xeno-Canto専用化、エラーハンドリング改善 |
| `api/requirements.txt` | 更新 | 不要な依存関係を削除 |
| `Dockerfile` | 移動・更新 | プロジェクトルートに配置 |
| `railway.toml` | 新規作成 | Railwayデプロイ設定 |
| `docs/railway-deploy-guide.md` | 新規作成 | デプロイ手順書 |

## APIエンドポイント

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/` | GET | ルート |
| `/api/health` | GET | ヘルスチェック |
| `/api/species` | GET | 鳥の種名一覧 |
| `/api/families` | GET | 科の一覧 |
| `/api/quiz/question` | GET | クイズ問題生成（Xeno-Canto Japan） |
| `/api/quiz/answer` | POST | クイズ回答 |
| `/api/search` | POST | 鳥の音声検索 |
| `/api/bird/{species_name}` | GET | 鳥の詳細情報 |
| `/api/rate-limit/status` | GET | レートリミット状態 |

## Railwayデプロイ手順（概要）

1. GitHubにリポジトリをプッシュ
2. [Railway](https://railway.app/)でアカウント作成
3. 「Deploy from GitHub repo」でリポジトリを選択
4. 自動デプロイ開始
5. 「Generate Domain」で公開URLを取得

## 無料枠の制限

| リソース | 制限 |
|---------|------|
| 実行時間 | 月500時間 |
| メモリ | 512MB |
| クレジット | 月$5相当 |

## 注意事項

- Xeno-Canto APIは10秒に1回のレートリミットを設定
- 日本国内の音声が見つからない鳥も存在する
- クイズ生成時は最大5回リトライ（50秒かかる可能性あり）

## 次のステップ

- [ ] GitHubへのプッシュ
- [ ] Railwayでのデプロイ実施
- [ ] フロントエンド（Next.js）との連携
- [ ] Supabaseユーザー認証の統合
