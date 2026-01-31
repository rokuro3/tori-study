# 2026-01-31 バックエンド（FastAPI）の廃止

## 概要
アーキテクチャをシンプル化するために、FastAPIバックエンドを廃止し、クイズ機能をフロントエンド＋Supabaseのみで動作するように変更しました。

## 変更内容

### 1. 新しいクイズロジックの実装
`app/src/lib/quiz/supabase-quiz.ts` を新規作成:
- `generateQuizQuestion(questionSetId?)`: 問題集またはすべての音声ファイルからランダムに問題を生成
- `checkAnswer(question, userAnswer)`: 回答判定（フロントエンドで実行）
- `getQuestionSetAudioCount(questionSetId)`: 問題集内の音声数を取得

### 2. クイズページの更新
`app/src/app/quiz/page.tsx`:
- FastAPIの`fetchQuizQuestion`から`generateQuizQuestion`に変更
- `submitQuizAnswer`を廃止し、`checkAnswer`でローカル判定
- URLパラメータ`questionSetId`と`name`をサポート（問題集選択ページから渡される）

### 3. DBスキーマの更新
`supabase/schema.sql`のaudio_filesテーブルに追加:
- `recordist`: 録音者
- `source_url`: ソースURL
- `license`: ライセンス情報

### 4. 型定義の更新
`app/src/lib/supabase/admin.ts`のAudioFileインターフェースを更新

### アーカイブに移動したファイル
```
archive/
├── fastapi/
│   ├── api/           # FastAPI本体
│   ├── start-fastapi.sh
│   ├── stop-fastapi.sh
│   └── check-fastapi.sh
└── frontend/
    ├── api.ts         # 旧FastAPIクライアント
    └── types.ts       # 旧型定義
```

## 新しいアーキテクチャ

```
[ユーザー] → [Next.js Frontend] → [Supabase]
                                   ├── Auth（認証）
                                   ├── Database（PostgreSQL）
                                   └── Storage（音声ファイル）
```

## 必要な設定

### 環境変数
`app/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Supabaseの設定
1. `bird-sounds`バケットの作成（パブリック）
2. `audio_files`テーブルの新しいカラム追加（recordist, source_url, license）
3. RLSポリシーの適用

## テスト方法

1. Next.jsを起動:
```bash
cd app && npm run dev
```

2. ブラウザで確認:
- http://localhost:3000/quiz/select - 問題集選択
- http://localhost:3000/quiz - クイズ（音声ファイルが必要）

## 注意事項
- クイズを動作させるにはSupabaseにaudio_filesテーブルのデータと、bird-soundsバケットへの音声ファイルのアップロードが必要です
- 管理画面（/admin/audio）から音声ファイルをアップロードできます
