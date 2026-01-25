#!/bin/bash
# FastAPI サーバー状態確認スクリプト

echo "=========================================="
echo "  FastAPI サーバー状態確認"
echo "=========================================="
echo ""

# プロセス確認
PIDS=$(ps aux | grep "uvicorn api.main:app" | grep -v grep | awk '{print $2}')

if [ -z "$PIDS" ]; then
    echo "❌ FastAPIサーバーは起動していません"
    echo ""
    echo "起動するには:"
    echo "  ./start-fastapi.sh"
    echo ""
    echo "または:"
    echo "  cd /root/toriStudy"
    echo "  python3 -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000"
    exit 1
fi

echo "✓ FastAPIサーバーは起動しています"
echo ""
echo "プロセスID: $PIDS"
echo ""

# ヘルスチェック
echo "ヘルスチェック実行中..."
if command -v python3 &> /dev/null; then
    python3 -c "
import requests
try:
    r = requests.get('http://localhost:8000/api/health', timeout=5)
    print(f'\n✓ HTTPステータス: {r.status_code}')
    data = r.json()
    print(f'  ステータス: {data.get(\"status\")}')
    print(f'  利用可能な鳥: {data.get(\"available_birds_count\")}種類')
    print(f'  音声ソース: {data.get(\"audio_source\")}')
except Exception as e:
    print(f'\n❌ 接続エラー: {e}')
" 2>/dev/null || echo "⚠️  Python requestsモジュールがありません"
fi

echo ""
echo "=========================================="
echo "  URL情報"
echo "=========================================="
echo "  API: http://localhost:8000"
echo "  ドキュメント: http://localhost:8000/docs"
echo "  ヘルスチェック: http://localhost:8000/api/health"
echo ""
echo "停止するには:"
echo "  ./stop-fastapi.sh"
echo "  または Ctrl+C（フォアグラウンド起動の場合）"
