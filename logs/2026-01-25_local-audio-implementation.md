# 2026-01-25 ローカル音声対応とテスト実施

## 実施日
2026年1月25日

## 作業内容

### 1. soundフォルダの音声ファイル解析
- `api/parse_sound_files.py` スクリプトを作成
- soundフォルダ内の20個の音声ファイルを解析
- ファイル名から鳥の名前を自動抽出（カタカナパターンマッチング）
- 鳥類目録（mokuroku_parsed.json）と照合して科名等の情報を取得
- 結果を `api/sound_files.json` に保存

#### 解析結果
- 成功: 20種類の鳥の音声ファイル
- 失敗: 0件

#### 利用可能な鳥のリスト
- アオサギ、アオジ、ウグイス、カワラヒワ、ガビチョウ
- キジバト、コゲラ、コジュケイ、シジュウカラ、スズメ
- ツグミ、トビ、ハシブトガラス、ハシボソガラス、ヒバリ
- ヒヨドリ、ホオジロ、ムクドリ、メジロ、モズ

### 2. FastAPIのローカル音声版への移行
- `api/main_local.py` を新規作成
- Xeno-Canto APIからローカル音声ファイルへの切り替え
- `/audio` エンドポイントで静的ファイルを配信
- `sound_files.json` から音声データを読み込み
- クイズ問題生成ロジックを更新

#### 主要な変更点
1. **音声ソース**: Xeno-Canto API → soundフォルダの音声ファイル
2. **レートリミット**: 不要（ローカルファイルのため）
3. **クレジット表示**: 不要（自前の音声のため）
4. **音声URL**: 外部URL → `/audio/{filename}` 形式

#### APIエンドポイント
- `GET /`: ルート
- `GET /api/health`: ヘルスチェック
- `GET /api/species`: 利用可能な鳥の一覧
- `GET /api/quiz/question`: クイズ問題取得
- `POST /api/quiz/answer`: クイズ回答送信
- `GET /api/bird/{species_name}`: 鳥の詳細情報

### 3. 依存関係のインストール
```bash
pip3 install -r api/requirements.txt
```

#### インストールされたパッケージ
- fastapi==0.109.0
- uvicorn[standard]==0.27.0
- pandas==2.1.4
- numpy==1.26.3
- requests==2.31.0
- python-dotenv==1.0.0

### 4. ローカルテスト実行
#### FastAPIサーバーの起動
```bash
cd /root/toriStudy
python3 -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```

#### テスト結果
1. **ヘルスチェック**: ✅ 成功
```json
{
  "status": "healthy",
  "data_loaded": true,
  "available_birds_count": 20,
  "audio_source": "local"
}
```

2. **クイズ問題取得**: ✅ 成功
```json
{
  "question_id": "q_1769346918_5439",
  "audio_url": "/audio/ホオジロ　地鳴き　a211215_075432　チチチ.mp3",
  "audio_source": "local",
  "correct_answer": "ホオジロ",
  "choices": ["ホオジロ", "コジュケイ", "トビ", "アオサギ"],
  "scientific_name": "Emberiza cioides",
  "family": "ホオジロ科"
}
```

### 5. フロントエンド設定
- 環境変数 `NEXT_PUBLIC_API_URL=http://localhost:8000` が既に設定済み
- Next.jsの依存関係インストール済み

### 6. テスト用スクリプト作成
- `test-local.sh`: ローカルテスト実行用スクリプト
  - FastAPIサーバー起動
  - ヘルスチェック
  - 使用方法の表示

## 次のステップ

### フロントエンド（Next.js）の起動とテスト
別のターミナルで以下を実行:
```bash
cd /root/toriStudy/app
npm run dev
```

ブラウザで http://localhost:3000 にアクセスしてテスト

### 確認項目
- [ ] クイズページで音声が再生されるか
- [ ] 選択肢が正しく表示されるか
- [ ] 回答送信が正常に動作するか
- [ ] スコアが正しく計算されるか
- [ ] ユーザー認証が正常に動作するか

## 技術的な注意点

### 音声ファイルの配信
- FastAPIの `StaticFiles` を使用して `/audio` パスで配信
- CORS設定により、Next.jsからのアクセスが可能

### データ構造
- `sound_files.json`: 音声ファイルと鳥の情報のマッピング
- 鳥類目録データを使用して科名等の情報を補完

### バックアップ
- 元のXeno-Canto版は `api/main_xeno_canto.py.bak` として保存

## トラブルシューティング

### FastAPIが起動しない場合
```bash
pip3 install -r api/requirements.txt
```

### 音声データが見つからない場合
```bash
python3 api/parse_sound_files.py
```

### ポートが既に使用されている場合
```bash
# プロセスを確認
ps aux | grep uvicorn
# プロセスを終了
kill <PID>
```

## 改善点・今後の課題

1. **音声データの追加**: より多くの鳥の音声を追加
2. **パフォーマンス最適化**: 音声ファイルのキャッシング
3. **エラーハンドリング**: より詳細なエラーメッセージ
4. **テストカバレッジ**: ユニットテストの追加
5. **デプロイ**: Railway等へのデプロイ手順の確立

## 参考
- FastAPI公式ドキュメント: https://fastapi.tiangolo.com/
- Next.js公式ドキュメント: https://nextjs.org/docs
