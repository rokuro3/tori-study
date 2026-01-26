# 2026-01-26 本番環境音声再生問題の修正

## 実施日
2026年1月26日

## 問題
本番環境（Railway）で音声が再生されない

## 原因分析

### 1. URLエンコードの二重エンコード問題

**サーバー側（api/main.py）** で音声ファイルのURLをエンコードしていなかったため、
フロントエンド側で `encodeURI()` を使用していた。

しかし、サーバー側でエンコードを追加した後、フロントエンド側でも `encodeURI()` が残っていたため、
二重エンコードが発生していた。

例:
- サーバー側: `/audio/%E3%82%AD%E3%82%B8%E3%83%90%E3%83%88...`
- フロントエンド側で再エンコード: `/audio/%25E3%2582%25AD%25E3%2582%25B8...`
  （`%` が `%25` にエンコードされてしまう）

### 2. デバッグ情報の不足

ヘルスチェックエンドポイントで音声ディレクトリの状態が確認できなかった。

## 修正内容

### 1. api/main.py

#### パス設定のデバッグ出力追加
```python
# デバッグ用: パス情報を出力
print(f"[Config] BASE_DIR: {BASE_DIR}")
print(f"[Config] SOUND_DIR: {SOUND_DIR} (exists: {SOUND_DIR.exists()})")
print(f"[Config] SOUND_FILES_JSON: {SOUND_FILES_JSON} (exists: {SOUND_FILES_JSON.exists()})")
```

#### ヘルスチェックに詳細情報追加
```python
@app.get("/api/health")
async def health_check():
    """ヘルスチェック"""
    available_birds = get_available_birds()
    
    # 音声ディレクトリの状態を確認
    sound_dir_exists = SOUND_DIR.exists()
    audio_files_count = 0
    if sound_dir_exists:
        audio_files_count = len(list(SOUND_DIR.glob("*.mp3")))
    
    return {
        "status": "healthy",
        "data_loaded": sound_files_data is not None,
        "available_birds_count": len(available_birds),
        "audio_source": "local",
        "sound_dir": str(SOUND_DIR),
        "sound_dir_exists": sound_dir_exists,
        "audio_files_count": audio_files_count,
    }
```

#### 音声URLのサーバー側エンコード
```python
from urllib.parse import quote

# クイズ問題生成時
encoded_filename = quote(selected_file['filename'], safe='')
audio_url = f"/audio/{encoded_filename}"
```

### 2. app/src/lib/quiz/api.ts

フロントエンド側での二重エンコードを防止：
```typescript
// 音声URLを完全なURLに変換（サーバー側で既にエンコード済み）
if (data.audio_url) {
  const absoluteUrl = data.audio_url.startsWith('/')
    ? `${API_BASE_URL}${data.audio_url}`
    : data.audio_url
  // サーバー側でURLエンコード済みのため、再エンコードしない
  data.audio_url = absoluteUrl
}
```

## テスト結果

### ローカル環境
1. **ヘルスチェック**: ✅ 成功
```json
{
  "status": "healthy",
  "data_loaded": true,
  "available_birds_count": 20,
  "audio_source": "local",
  "sound_dir": "/root/toriStudy/sound",
  "sound_dir_exists": true,
  "audio_files_count": 20
}
```

2. **音声ファイルのURL取得**: ✅ 成功
```
/audio/%E3%82%AD%E3%82%B8%E3%83%90%E3%83%88%E3%80%80...mp3
```

3. **音声ファイルの配信**: ✅ 成功
```
HTTP/1.1 200 OK
content-type: audio/mpeg
content-length: 161726
```

## 本番環境へのデプロイ

修正を本番環境に反映するには、以下のコマンドでデプロイ：

```bash
git add -A
git commit -m "fix: 音声URLのエンコード問題を修正"
git push origin main
```

Railwayが自動的に再デプロイします。

## 確認方法

1. 本番環境のヘルスチェックを確認:
   ```
   curl https://your-railway-domain.up.railway.app/api/health
   ```

2. `sound_dir_exists: true` と `audio_files_count: 20` を確認

3. ブラウザでクイズページを開き、音声が再生されることを確認

## 注意点

- Dockerfileで `sound/` フォルダがコピーされていることを確認済み
- `api/sound_files.json` が `api/` ディレクトリと一緒にコピーされることを確認済み
