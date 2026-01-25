# バッジシステム実装ログ

## 日付: 2026-01-19

## 実装内容

### 1. データベーススキーマの作成
- **ファイル**: `supabase/schema.sql`
- **作成したテーブル**:
  - `scores`: クイズスコア履歴
  - `species_answers`: 種ごとの回答履歴（バッジ計算用）
  - `user_badges`: ユーザーが獲得したバッジ
- **RLSポリシー**: ユーザーは自分のデータのみアクセス可能
- **ビュー**: `species_accuracy` - 種ごとの正答率を計算

### 2. バッジ計算ロジックの実装
- **ファイル**: `app/src/lib/score/badge.ts`
- **バッジ定義**:
  | バッジ | 条件 |
  |--------|------|
  | 🥉 銅バッジ | 25%の種（5種）で正答率80%以上 |
  | 🥈 銀バッジ | 50%の種（10種）で正答率80%以上 |
  | 🥇 金バッジ | 75%の種（15種）で正答率80%以上 |
  | 💎 プラチナバッジ | 100%の種（20種）で正答率80%以上 |

- **主要関数**:
  - `saveSpeciesAnswer()`: 種ごとの回答を保存
  - `saveQuizScore()`: クイズスコアを保存
  - `getSpeciesAccuracies()`: 種ごとの正答率を取得
  - `checkAndAwardBadges()`: バッジ獲得条件をチェックして付与
  - `getUserStats()`: ユーザー統計を取得

### 3. スコア・バッジ表示ページの作成
- **ファイル**: `app/src/app/score/page.tsx`
- **表示内容**:
  - 全体の成績（クイズ回数、正答数、正答率）
  - バッジコレクション（獲得済み・未獲得）
  - 次のバッジまでの進捗
  - 種ごとの正答率リスト

### 4. クイズページの更新
- **ファイル**: `app/src/app/quiz/page.tsx`
- **追加機能**:
  - 回答ごとに種の正答を記録
  - クイズ終了時にバッジ獲得チェック
  - 新しく獲得したバッジの表示
  - 今回の結果表示（種名と正誤）
  - スコアページへのリンク追加

### 5. ホームページの更新
- **ファイル**: `app/src/app/page.tsx`
- **追加**: ログインユーザー向けに「🏆 スコアを見る」ボタン追加

## 次のステップ

### Supabaseでのテーブル作成
ユーザーは`supabase/schema.sql`の内容をSupabaseのSQL Editorで実行する必要があります：

1. Supabaseダッシュボードにログイン
2. プロジェクトを選択
3. 左メニューから「SQL Editor」を選択
4. 「New query」をクリック
5. `schema.sql`の内容をコピー＆ペースト
6. 「Run」をクリック

## 動作確認

- FastAPI: http://localhost:8000
- Next.js: http://localhost:3000 または http://localhost:3001

## 技術スタック
- Backend: FastAPI + ローカル音声ファイル
- Frontend: Next.js + TypeScript + Tailwind CSS
- Database: Supabase (PostgreSQL)
- Authentication: Supabase Auth
