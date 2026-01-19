# とりスタディ 🐦

鳥の鳴き声を聞いて種名を当てる学習アプリケーションです。

## 概要

「とりスタディ」は、鳥の識別能力を楽しく学習できるクイズアプリです。Xeno-Cantoから日本国内で録音された本物の鳥の鳴き声を使用し、実践的な学習体験を提供します。

### 主な機能

- 🎵 **本物の鳴き声**: Xeno-Cantoの日本国内録音データを使用
- 🎮 **4択クイズ**: 37種の鳥から出題
- 📊 **スコア記録**: ユーザーごとに成績を保存
- 🔐 **ユーザー認証**: Supabaseによる安全な認証
- 📱 **レスポンシブデザイン**: スマートフォンでも快適に利用可能

## 技術スタック

### フロントエンド
- **Next.js** 16.1.2 (App Router)
- **React** 19.2.3
- **TypeScript** 5.x
- **Tailwind CSS** 4.x
- **Supabase** (認証・データベース)

### バックエンド
- **FastAPI** 0.109.0
- **Python** 3.10+
- **Pandas** (データ処理)
- **Xeno-Canto API** v3 (音声データソース)

### インフラ
- **Vercel** (フロントエンド)
- **Railway** (バックエンド)
- **Supabase** (データベース)

## セットアップ

### 必要要件

- Python 3.10以上
- Node.js 18以上
- Git

### 1. リポジトリのクローン

```bash
git clone https://github.com/rokuro3/tori-study.git
cd tori-study
```

### 2. バックエンドのセットアップ

```bash
# 仮想環境の作成と有効化
python -m venv .venv
source .venv/bin/activate  # Windowsの場合: .venv\Scripts\activate

# 依存パッケージのインストール
pip install -r api/requirements.txt

# Xeno-Canto APIキーの設定
echo "your_api_key_here" > .xenocantoapi
```

**環境変数** (オプション):
```bash
# .envファイルを作成
XENO_CANTO_API_KEY=your_api_key_here
```

### 3. フロントエンドのセットアップ

```bash
cd app

# 依存パッケージのインストール
npm install

# 環境変数の設定
cp .env.local.example .env.local
```

**.env.local** の内容を編集:
```env
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# FastAPI バックエンドURL
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 開発サーバーの起動

### バックエンド

```bash
# プロジェクトルートで実行
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

サーバーは http://localhost:8000 で起動します。

### フロントエンド

```bash
cd app
npm run dev
```

サーバーは http://localhost:3000 で起動します。

## 出題対象の鳥（37種）

カイツブリ、カンムリカイツブリ、カワウ、アオサギ、ダイサギ、ミサゴ、トビ、ノスリ、ヒドリガモ、クイナ、オオバン、ユリカモメ、ドバト、キジバト、コゲラ、ヒバリ、ハクセキレイ、タヒバリ、ヒヨドリ、モズ、ジョウビタキ、シロハラ、ツグミ、ガビチョウ、ウグイス、シジュウカラ、メジロ、ホオジロ、ホオアカ、アオジ、カワラヒワ、ベニマシコ、シメ、スズメ、ムクドリ、ハシボソガラス、ハシブトガラス

## API エンドポイント

### GET /api/health
サーバーの健全性チェック

### GET /api/quiz/question
新しいクイズ問題を取得

**レスポンス例:**
```json
{
  "question_id": "q_1768835217_2501",
  "audio_url": "https://xeno-canto.org/992374/download",
  "audio_source": "xeno-canto",
  "correct_answer": "ウグイス",
  "choices": ["ジョウビタキ", "キジバト", "ウグイス", "ムクドリ"],
  "scientific_name": "Horornis diphone",
  "voice_type": "call",
  "location": "Karuizawa Yacho No Mori, Nagano",
  "family": "ウグイス科",
  "recordist": "Xavier Riera",
  "license_url": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  "xc_id": "992374"
}
```

### POST /api/quiz/answer
クイズの回答を送信

**リクエスト:**
```json
{
  "question_id": "q_1768835217_2501",
  "user_answer": "ウグイス"
}
```

**レスポンス:**
```json
{
  "is_correct": true,
  "correct_answer": "ウグイス",
  "message": "正解！🎉"
}
```

### GET /api/species
利用可能な鳥の種名一覧を取得

### POST /api/search
特定の鳥の音声データを検索

## デプロイ

詳細なデプロイ手順は以下のドキュメントを参照してください：

- [Railway デプロイガイド](docs/railway-deploy-guide.md)
- [インフラ構成](docs/infrastructure.md)
- [ローカル開発ガイド](docs/local-development-guide.md)

## レートリミット

Xeno-Canto APIへのリクエストは3秒に1回に制限されています。これにより、サービスに過度な負荷をかけることを防ぎます。

## ライセンスと帰属

### 音声データ
音声データは [Xeno-Canto](https://xeno-canto.org) から提供されています。各録音には以下の情報が含まれます：

- 録音者名
- ライセンス情報（主にCreative Commons）
- XCカタログ番号

### プロジェクトライセンス
MIT License

## 開発ログ

プロジェクトの開発過程は `logs/` ディレクトリに記録されています：

- [インフラ構築](logs/2026-01-15_infrastructure-setup.md)
- [画面実装](logs/2026-01-15_screen-implementation.md)
- [FastAPI実装](logs/2026-01-16_fastapi-implementation.md)
- [Xeno-Canto API v3 移行](logs/2026-01-16_xeno-canto-api-v3-migration.md)
- [ローカルテスト実行](logs/2026-01-19_local-test-execution.md)

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを開いて変更内容を議論してください。

## サポート

問題が発生した場合は、[Issues](https://github.com/rokuro3/tori-study/issues)で報告してください。

---

**Bird sounds from [xeno-canto.org](https://xeno-canto.org)**
