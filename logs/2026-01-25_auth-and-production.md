# 2026-01-25 ユーザー認証変更と本番環境設定

## 実施日
2026年1月25日

## 作業内容

### 1. ユーザー認証の変更（メール認証スキップ）

#### 修正ファイル
- [app/src/lib/supabase/auth.ts](../app/src/lib/supabase/auth.ts)
- [app/src/app/signup/page.tsx](../app/src/app/signup/page.tsx)

#### 変更内容
1. **サインアップ後の自動ログイン機能追加**
   - サインアップ成功後、自動的にログインを試行
   - 成功した場合、直接クイズページにリダイレクト

2. **成功メッセージの変更**
   - メール確認の案内を削除
   - 「登録完了」メッセージに変更

#### Supabase側の設定
メール確認を完全にスキップするには、Supabaseダッシュボードで設定が必要：
- Authentication → Providers → Email → Confirm email を OFF

詳細: [docs/supabase-email-auth-disable.md](../docs/supabase-email-auth-disable.md)

### 2. 音声ファイルの本番環境配置ドキュメント作成

#### 作成ファイル
- [docs/audio-files-production.md](../docs/audio-files-production.md)

#### 内容
1. **Railway（現在の構成）**
   - soundフォルダをリポジトリに含めてデプロイ
   - FastAPI StaticFilesで配信

2. **Supabase Storage（推奨）**
   - 50-200ファイル程度の中規模向け
   - アップロードスクリプト例

3. **専用CDN（大規模向け）**
   - AWS S3 + CloudFront
   - Cloudflare R2

### 3. 音声再生エラーの修正（前回からの継続）

#### 修正内容
- 音声URLのエンコード処理追加
- 相対パスを絶対URLに変換

#### 修正ファイル
- [app/src/lib/quiz/api.ts](../app/src/lib/quiz/api.ts)

```typescript
// 音声URLを完全なURLにし、スペース等をエンコード
if (data.audio_url) {
  const absoluteUrl = data.audio_url.startsWith('/')
    ? `${API_BASE_URL}${data.audio_url}`
    : data.audio_url
  data.audio_url = encodeURI(absoluteUrl)
}
```

## 現在の状態

### FastAPIサーバー
- ✅ 起動中（ポート8000）
- ✅ 音声ファイル配信正常
- ✅ クイズAPI正常

### 次のステップ

1. **Supabaseダッシュボードでメール確認を無効化**
   - Authentication → Providers → Email → Confirm email を OFF

2. **Next.jsを再起動してテスト**
   ```bash
   cd /root/toriStudy/app
   npm run dev
   ```

3. **動作確認**
   - 新規登録 → 自動ログイン → クイズページ
   - 音声再生

## ファイル変更一覧

| ファイル | 変更内容 |
|---------|---------|
| app/src/lib/supabase/auth.ts | サインアップ後自動ログイン追加 |
| app/src/app/signup/page.tsx | 自動ログイン対応、メッセージ変更 |
| app/src/lib/quiz/api.ts | 音声URLエンコード追加 |
| docs/supabase-email-auth-disable.md | 新規作成 |
| docs/audio-files-production.md | 新規作成 |

## 本番環境の推奨構成

### 小規模（現在: 20ファイル）
```
sound/フォルダをリポジトリに含める
FastAPI StaticFilesで配信
Railway無料プランで対応可能
```

### 将来拡張時
```
Supabase Storageに移行
音声ファイルをSupabaseにアップロード
APIからStorageのURLを返す
```
