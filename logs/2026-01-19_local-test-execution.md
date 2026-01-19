# ローカルテスト実行記録

## 日時
2026年1月19日

## 作業概要
FastAPIとNext.jsフロントエンドの連携確認、ローカル環境でのテスト実行

## 実行手順

### 1. 環境確認
- Python環境: VirtualEnvironment (Python 3.10.12)
- Node.js: Next.js 16.1.2
- Xeno-Canto APIキー: 設定済み（.xenocantoapiファイル）

### 2. FastAPIサーバー起動
```bash
cd /root/toriStudy
/root/toriStudy/.venv/bin/pip install -r api/requirements.txt
nohup /root/toriStudy/.venv/bin/python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 > /tmp/uvicorn.log 2>&1 &
```

**起動確認:**
- ヘルスチェック: `http://localhost:8000/api/health`
- データ読み込み: mokuroku_parsed.json (1137件), mokuroku.pickle (692件)
- Xeno-Canto API v3: 設定済み

### 3. フロントエンド設定
`.env.local`に以下を追加:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 4. Next.js開発サーバー起動
```bash
cd /root/toriStudy/app
npm install
nohup npm run dev > /tmp/nextjs.log 2>&1 &
```

**サーバーURL:**
- フロントエンド: http://localhost:3000
- バックエンド: http://localhost:8000

## テスト結果

### APIエンドポイントテスト

#### GET /api/health
```json
{
  "status": "healthy",
  "data_loaded": {
    "mokuroku": true,
    "mokuroku_parsed": true
  },
  "rate_limiter": {
    "next_request_wait": 0
  },
  "xeno_canto_api": {
    "version": "v3",
    "api_key_configured": true
  }
}
```

#### GET /api/quiz/question
```json
{
  "question_id": "q_1768834930_3630",
  "audio_url": "https://xeno-canto.org/915205/download",
  "audio_source": "xeno-canto",
  "correct_answer": "ハシブトガラス",
  "choices": ["ハシボソガラス", "ニシコクマルガラス", "ハシブトガラス", "ワタリガラス"],
  "scientific_name": "Corvus macrorhynchos",
  "voice_type": "call",
  "location": "Meiji Jingu Shinkyo (Sacred Bridge) (near  Shibuya City), Tokyo",
  "family": "カラス科",
  "recordist": "Uku Paal",
  "license_url": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  "xc_id": "915205"
}
```

#### POST /api/quiz/answer
リクエスト:
```json
{
  "question_id": "q_1768834930_3630",
  "user_answer": "ハシブトガラス"
}
```

レスポンス:
```json
{
  "is_correct": true,
  "correct_answer": "ハシブトガラス",
  "message": "正解！🎉"
}
```

## 確認事項

### ✅ 正常動作
- FastAPIサーバーの起動
- mokurokuデータの読み込み
- Xeno-Canto API v3への接続
- 日本国内の音声データ取得
- クイズ問題の生成（4択、同一科からの選択肢）
- 回答の正誤判定
- クレジット情報の表示（録音者、ライセンス、XCカタログ番号）
- Next.jsフロントエンドの起動
- フロントエンドとバックエンドの連携

### 機能詳細
1. **レートリミッター**: 10秒間隔でXeno-Cantoへのリクエストを制限
2. **出題対象鳥リスト**: 37種（TARGET_BIRDS配列）
3. **選択肢生成**: 正解 + 同一科から3種をランダム選択
4. **クレジット表示**: Xeno-Canto利用規約に準拠

## 次回作業予定
- 本番環境（Railway）へのデプロイ確認
- Supabase連携の確認
- スコア保存機能のテスト
