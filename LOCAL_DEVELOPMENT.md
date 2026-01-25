# 鳥の鳴き声クイズアプリ - ローカル開発ガイド

## プロジェクト概要
鳥の鳴き声を聞いて種名を当てるクイズアプリです。
音声データはローカルの `sound` フォルダから提供されます。

## 技術スタック
- **バックエンド**: FastAPI (Python)
- **フロントエンド**: Next.js (TypeScript, React)
- **認証・DB**: Supabase
- **音声データ**: ローカル音声ファイル（20種類）

## ローカル開発環境のセットアップ

### 前提条件
- Python 3.10+
- Node.js 18+
- npm

### 1. バックエンド（FastAPI）のセットアップ

```bash
# 依存関係のインストール
cd /root/toriStudy/api
pip3 install -r requirements.txt

# 音声ファイルのパース（初回のみ）
python3 parse_sound_files.py

# サーバーの起動
cd /root/toriStudy
python3 -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

サーバーが起動したら、以下のURLで確認できます:
- API ルート: http://localhost:8000
- API ドキュメント: http://localhost:8000/docs
- ヘルスチェック: http://localhost:8000/api/health

### 2. フロントエンド（Next.js）のセットアップ

別のターミナルで:

```bash
# 依存関係のインストール
cd /root/toriStudy/app
npm install

# 開発サーバーの起動
npm run dev
```

ブラウザで http://localhost:3000 にアクセス

### 3. 環境変数の設定

#### バックエンド（`/root/toriStudy/api/.env`）
```env
# 現在は不要（ローカル音声を使用）
```

#### フロントエンド（`/root/toriStudy/app/.env.local`）
```env
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# FastAPI バックエンドURL
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 利用可能な鳥の種類

現在、以下の20種類の鳥の音声データが利用可能です:

1. アオサギ
2. アオジ
3. ウグイス
4. カワラヒワ
5. ガビチョウ
6. キジバト
7. コゲラ
8. コジュケイ
9. シジュウカラ
10. スズメ
11. ツグミ
12. トビ
13. ハシブトガラス
14. ハシボソガラス
15. ヒバリ
16. ヒヨドリ
17. ホオジロ
18. ムクドリ
19. メジロ
20. モズ

## APIエンドポイント

### クイズ関連
- `GET /api/quiz/question` - クイズ問題を取得
- `POST /api/quiz/answer` - クイズの回答を送信

### 情報取得
- `GET /api/health` - ヘルスチェック
- `GET /api/species` - 利用可能な鳥の一覧
- `GET /api/bird/{species_name}` - 特定の鳥の詳細情報

### 音声ファイル
- `GET /audio/{filename}` - 音声ファイルを取得

## テスト

### APIテスト
```bash
# ヘルスチェック
curl http://localhost:8000/api/health

# クイズ問題取得
curl http://localhost:8000/api/quiz/question

# 鳥の一覧取得
curl http://localhost:8000/api/species
```

### Pythonでのテスト
```python
import requests

# ヘルスチェック
response = requests.get('http://localhost:8000/api/health')
print(response.json())

# クイズ問題取得
response = requests.get('http://localhost:8000/api/quiz/question')
question = response.json()
print(f"問題: {question['choices']}")
print(f"音声URL: {question['audio_url']}")
```

## トラブルシューティング

### FastAPIが起動しない
```bash
# 依存関係を再インストール
pip3 install -r api/requirements.txt
```

### 音声データが見つからない
```bash
# 音声ファイルを再パース
python3 api/parse_sound_files.py
```

### ポートが既に使用されている
```bash
# プロセスを確認
ps aux | grep uvicorn

# プロセスを終了
kill <PID>
```

### Next.jsが起動しない
```bash
# node_modulesを削除して再インストール
cd app
rm -rf node_modules
npm install
```

## ディレクトリ構造

```
/root/toriStudy/
├── api/                    # FastAPI バックエンド
│   ├── main.py            # メインAPIファイル
│   ├── parse_sound_files.py  # 音声ファイル解析スクリプト
│   ├── sound_files.json   # 音声ファイル情報
│   └── requirements.txt   # Python依存関係
├── app/                   # Next.js フロントエンド
│   ├── src/
│   │   ├── app/          # ページコンポーネント
│   │   ├── contexts/     # React Context
│   │   └── lib/          # ユーティリティ
│   ├── package.json
│   └── .env.local        # 環境変数
├── sound/                 # 音声ファイル
│   └── *.mp3             # 鳥の鳴き声（20種類）
├── birdVoiceSearch/       # 鳥類目録データ
│   └── mokuroku_parsed.json
├── logs/                  # 作業ログ
└── docs/                  # ドキュメント
```

## 開発の流れ

1. **音声ファイルの追加**
   - `sound/` フォルダに新しい音声ファイルを追加
   - ファイル名は「鳥名　説明.mp3」形式
   - `python3 api/parse_sound_files.py` を実行

2. **APIの開発**
   - `api/main.py` を編集
   - FastAPIサーバーは自動リロード（`--reload` オプション）

3. **フロントエンドの開発**
   - `app/src/` 以下を編集
   - Next.jsは自動リロード

## 参考リンク

- [FastAPI公式ドキュメント](https://fastapi.tiangolo.com/)
- [Next.js公式ドキュメント](https://nextjs.org/docs)
- [Supabase公式ドキュメント](https://supabase.com/docs)

## ライセンス
このプロジェクトの音声データは教育目的で使用されています。
