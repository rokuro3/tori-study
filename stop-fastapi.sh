#!/bin/bash
# FastAPI サーバー停止スクリプト

echo "=========================================="
echo "  FastAPI サーバー停止"
echo "=========================================="
echo ""

# uvicornプロセスを検索
PIDS=$(ps aux | grep "uvicorn api.main:app" | grep -v grep | awk '{print $2}')

if [ -z "$PIDS" ]; then
    echo "✓ FastAPIサーバーは起動していません"
    exit 0
fi

echo "以下のプロセスを停止します:"
echo "$PIDS"
echo ""

# プロセスを停止
for PID in $PIDS; do
    echo "PID $PID を停止中..."
    kill $PID
done

sleep 1

# 確認
REMAINING=$(ps aux | grep "uvicorn api.main:app" | grep -v grep | awk '{print $2}')
if [ -z "$REMAINING" ]; then
    echo ""
    echo "✓ FastAPIサーバーを停止しました"
else
    echo ""
    echo "⚠️  一部のプロセスが残っています。強制終了する場合:"
    echo "  kill -9 $REMAINING"
fi
