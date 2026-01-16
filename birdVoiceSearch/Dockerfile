# ベースイメージとしてPythonを使用
FROM python:3.10

# 作業ディレクトリを設定
WORKDIR /app

# 必要なパッケージをインストール
COPY requirements.txt .
RUN pip install --no-cache-dir --default-timeout=1000 -r requirements.txt

# アプリケーションのソースコードをコピー
COPY . .

# Streamlitの設定ファイルをコピー
COPY ./config.toml /root/.streamlit/config.toml

# アプリケーションを起動する
CMD ["streamlit", "run", "app.py", "--server.port=8501", "--server.address=0.0.0.0"]
