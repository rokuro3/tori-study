# Python 3.11をベースイメージとして使用
FROM python:3.11-slim

# ビルドキャッシュ無効化用
ARG CACHEBUST=1

# 作業ディレクトリを設定
WORKDIR /app

# 必要なシステムパッケージをインストール
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 依存関係ファイルをコピー
COPY api/requirements.txt .

# Pythonパッケージをインストール
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコードをコピー
COPY api/ ./api/
COPY start.py ./

# データファイルをコピー（JSONを使用、pickle互換性問題を回避）
COPY birdVoiceSearch/mokuroku_parsed.json ./birdVoiceSearch/

# 音声ファイルをコピー
COPY sound/ ./sound/

# 環境変数を設定
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# ポートを公開
EXPOSE 8000

# アプリケーションを起動
CMD ["python", "start.py"]
