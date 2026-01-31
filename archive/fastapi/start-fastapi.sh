#!/bin/bash
# FastAPI サーバー起動スクリプト

echo "=========================================="
echo "  FastAPI サーバー起動"
echo "=========================================="
echo ""

# プロジェクトディレクトリに移動
cd /root/toriStudy

# 既存のプロセスを確認
echo "既存のuvicornプロセスを確認中..."
EXISTING_PID=$(ps aux | grep "uvicorn api.main:app" | grep -v grep | awk '{print $2}')

if [ ! -z "$EXISTING_PID" ]; then
    echo "⚠️  既にFastAPIサーバーが起動しています (PID: $EXISTING_PID)"
    echo ""
    echo "以下のコマンドで停止できます:"
    echo "  kill $EXISTING_PID"
    echo ""
    echo "または、このスクリプトを再実行して新しいサーバーを起動してください"
    read -p "既存のサーバーを停止して再起動しますか? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "既存のサーバーを停止中..."
        kill $EXISTING_PID
        sleep 2
    else
        echo "起動をキャンセルしました"
        exit 0
    fi
fi

echo "FastAPIサーバーを起動しています..."
echo ""

# サーバーを起動
python3 -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

# 注: このスクリプトは Ctrl+C で停止できます
