#!/bin/bash
# ローカルテスト実行スクリプト

echo "==================================="
echo "鳥の鳴き声クイズアプリ - ローカルテスト"
echo "==================================="
echo ""

# FastAPIサーバーの起動
echo "1. FastAPIサーバーを起動しています..."
echo "   http://localhost:8000"
cd /root/toriStudy
python3 -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000 &
FASTAPI_PID=$!

# 起動待機
sleep 3

echo ""
echo "2. FastAPIサーバーのヘルスチェック..."
curl -s http://localhost:8000/api/health | python3 -m json.tool

echo ""
echo "==================================="
echo "サーバー起動完了！"
echo "==================================="
echo ""
echo "FastAPI: http://localhost:8000"
echo "FastAPI Docs: http://localhost:8000/docs"
echo ""
echo "次のステップ:"
echo "  別のターミナルで Next.js を起動してください:"
echo "  $ cd /root/toriStudy/app"
echo "  $ npm run dev"
echo ""
echo "終了するには Ctrl+C を押してください"
echo ""

# 待機
wait $FASTAPI_PID
