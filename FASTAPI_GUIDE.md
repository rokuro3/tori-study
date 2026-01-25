# FastAPI サーバー 簡単起動ガイド

## 現在の状態
✅ **FastAPIサーバーは既に起動しています！**
- URL: http://localhost:8000
- APIドキュメント: http://localhost:8000/docs

---

## 基本的な操作

### 1. サーバーの状態を確認
```bash
cd /root/toriStudy
./check-fastapi.sh
```

### 2. サーバーを起動（停止している場合）
```bash
cd /root/toriStudy
./start-fastapi.sh
```

### 3. サーバーを停止
```bash
cd /root/toriStudy
./stop-fastapi.sh
```

---

## 手動で起動する方法

### 方法1: フォアグラウンドで起動（推奨）
```bash
cd /root/toriStudy
python3 -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```
- **利点**: ログがリアルタイムで表示される
- **停止方法**: `Ctrl+C` を押す
- **`--reload`**: コードを変更すると自動的に再起動

### 方法2: バックグラウンドで起動
```bash
cd /root/toriStudy
python3 -m uvicorn api.main:app --host 0.0.0.0 --port 8000 &
```
- **利点**: ターミナルを占有しない
- **停止方法**: `./stop-fastapi.sh` または `kill <PID>`

---

## Next.js（フロントエンド）と一緒に使う

### ターミナル1: FastAPI
```bash
cd /root/toriStudy
./start-fastapi.sh
```

### ターミナル2: Next.js
```bash
cd /root/toriStudy/app
npm run dev
```

これで以下のURLにアクセスできます：
- **フロントエンド**: http://localhost:3000
- **バックエンドAPI**: http://localhost:8000
- **APIドキュメント**: http://localhost:8000/docs

---

## トラブルシューティング

### ポートが既に使用されている
```bash
# FastAPIサーバーを停止
./stop-fastapi.sh

# または、プロセスを確認して手動で停止
ps aux | grep uvicorn
kill <PID>
```

### サーバーが起動しない
```bash
# 依存関係を再インストール
cd /root/toriStudy/api
pip3 install -r requirements.txt

# 音声ファイルを再パース
python3 parse_sound_files.py
```

### モジュールが見つからない
```bash
# uvicornがインストールされているか確認
python3 -m uvicorn --version

# インストールされていない場合
pip3 install uvicorn[standard]
```

---

## よく使うコマンド

### APIをテスト
```bash
# ヘルスチェック
curl http://localhost:8000/api/health

# クイズ問題を取得
curl http://localhost:8000/api/quiz/question

# 鳥の一覧を取得
curl http://localhost:8000/api/species
```

### ログを確認
サーバーをフォアグラウンドで起動している場合、ターミナルにリアルタイムでログが表示されます。

---

## 便利なスクリプト

プロジェクトのルートディレクトリ（`/root/toriStudy`）に以下のスクリプトが用意されています：

| スクリプト | 説明 |
|-----------|------|
| `./start-fastapi.sh` | サーバーを起動 |
| `./stop-fastapi.sh` | サーバーを停止 |
| `./check-fastapi.sh` | サーバーの状態を確認 |
| `./test-local.sh` | ローカルテスト実行 |

---

## 開発時の推奨ワークフロー

1. **FastAPIを起動**（ターミナル1）
   ```bash
   cd /root/toriStudy
   python3 -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Next.jsを起動**（ターミナル2）
   ```bash
   cd /root/toriStudy/app
   npm run dev
   ```

3. **ブラウザでアクセス**
   - http://localhost:3000 でアプリを開く
   - http://localhost:8000/docs でAPI仕様を確認

4. **コードを編集**
   - FastAPIのコードを変更すると自動的に再起動（`--reload`オプション）
   - Next.jsのコードを変更すると自動的にリロード

5. **終了時**
   - 各ターミナルで `Ctrl+C` を押す

---

## その他の情報

詳細なドキュメント：
- [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) - 開発ガイド
- [logs/2026-01-25_local-audio-implementation.md](logs/2026-01-25_local-audio-implementation.md) - 実装ログ
