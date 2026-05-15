# とりスタディ 🐦

鳥の鳴き声を聞いて種名を当てる学習アプリケーションです。

## 概要

「とりスタディ」は、鳥の識別能力を楽しく学習できるクイズアプリです。Xeno-Cantoから日本国内で録音された本物の鳥の鳴き声を使用し、実践的な学習体験を提供します。

## 主な機能

- 🎵 **複数の問題集**: 管理者が問題集を作成・管理
- 🎮 **4択クイズ**: 問題集またはランダムで出題
- 📚 **学習モード**: 鳥の音声を自由に聞いて学習
- 📊 **スコア記録**: ユーザーごとに成績を保存
- 🔐 **ユーザー認証**: Supabaseによる安全な認証
- 🏆 **バッジシステム**: 達成度に応じてバッジを授与
- 📱 **レスポンシブデザイン**: スマートフォンでも快適に利用可能

## 機能ページ

- **ホーム** (`/`): アプリケーションホーム
- **クイズ選択** (`/quiz/select`): クイズモード選択
- **クイズ実行** (`/quiz`): クイズの実行
- **学習モード** (`/learn`): 音声学習
- **ログイン** (`/login`): ユーザー認証
- **スコア表示** (`/score`): スコアとバッジ表示
- **更新履歴** (`/updates`): 機能追加の履歴
- **管理画面** (`/admin`): 管理者用ページ

## 技術スタック

### フロントエンド
- **Next.js** 16.1.2 (App Router)
- **React** 19.2.3
- **TypeScript** 5.x
- **Tailwind CSS** 4.x

### バックエンド・データベース
- **Supabase** (認証・データベース・ストレージ)

### その他
- **Git** (バージョン管理)

**ℹ️ 注**: FastAPI バックエンドは 2026年1月31日に廃止されました。クイズロジックはフロントエンド（Next.js）で実装されており、データ管理のみ Supabase を使用しています。

## クイックスタート

### 必要要件

- Node.js 18以上
- npm 8以上
- Git

### 1. リポジトリのクローン

```bash
git clone https://github.com/rokuro3/tori-study.git
cd tori-study
```

### 2. フロントエンドのセットアップ

```bash
cd app

# 依存パッケージのインストール
npm install

# 環境変数の設定
```

`.env.local` ファイルを作成し、以下を設定します:

```env
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Supabase の認証情報は、Supabase プロジェクトの「Settings」→「API」から取得できます。

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 にアクセス

## ドキュメント

詳細な情報については、以下のドキュメントを参照してください:

- [ローカル音声管理ツール仕様](docs/local-audio-manager.md) - 認証なし音声管理ツールの仕様
- [ローカル開発セットアップガイド](docs/local-setup-guide.md) - ローカル環境でのセットアップ手順
- [インフラ構成](docs/infrastructure.md) - 本番環境の構成
- [Railway デプロイガイド](docs/railway-deploy-guide.md) - Railway へのデプロイ手順

運用ルール: 機能追加を行った場合は、更新履歴ページ (`/updates`) に日付と内容を追記してください。

## ローカル専用ツール

Supabase 連携なしで音声管理だけを行いたい場合は、`local-audio-manager/` を使用してください。

```bash
docker compose -f local-audio-manager/compose.yaml up --build
```

ブラウザで `http://localhost:3000` を開いてください。

詳細は `local-audio-manager/README.md` を参照してください。

VOICEVOX で鳥名の音声出力を試す場合は、`voicevox-bird-test/` を使用してください。

```bash
cd voicevox-bird-test
npm install
npm run speak -- メジロ
```

## 開発ログ

プロジェクトの開発過程は `logs/` ディレクトリに記録されています。

## ライセンス

Copyright 2026 rokuro3

Apache License 2.0 — 詳細は [LICENSE](LICENSE) を参照してください。

### サードパーティライブラリ

本プロジェクトは以下のサードパーティライブラリを使用しています:

| ライブラリ | ライセンス | 備考 |
|-----------|-----------|------|
| Next.js, React, Supabase | MIT | |
| Tailwind CSS | MIT | |
| TypeScript, ESLint 関連 | Apache-2.0 | ビルド・開発ツール |
| sharp-libvips | LGPL-3.0-or-later | Next.js の画像最適化に内部使用（動的リンク） |
| lightningcss | MPL-2.0 | Tailwind CSS のビルドツールに内部使用 |
| Geist Font (via next/font) | SIL Open Font License 1.0 | |

### 音声データ

音声ファイルは [Xeno-Canto](https://xeno-canto.org) の録音者がアップロードしたものを使用しています。
各録音のライセンス（CC BY、CC BY-NC 等）は Xeno-Canto の各録音ページをご確認ください。

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを開いて変更内容を議論してください。

## サポート

問題が発生した場合は、[Issues](https://github.com/rokuro3/tori-study/issues)で報告してください。

