# VOICEVOX Bird Test

VOICEVOX エンジンを使って、指定した鳥の名前の音声 (wav) を出力するテスト用プロジェクトです。

## 前提

- Node.js 18 以上
- VOICEVOX Engine が起動済み（既定: `http://127.0.0.1:50021`）

## セットアップ

```bash
cd voicevox-bird-test
npm install
```

## 実行

```bash
npm run speak -- メジロ
```

出力ファイルは既定で `voicevox-bird-test/output/<鳥名>.wav` です。

## オプション

```bash
VOICEVOX_URL=http://127.0.0.1:50021 VOICEVOX_SPEAKER=1 npm run speak -- カワセミ ./output/kawasemi.wav
```

- `VOICEVOX_URL`: VOICEVOX Engine のURL
- `VOICEVOX_SPEAKER`: 話者ID（数値）
- 第1引数: 読み上げる鳥名（必須）
- 第2引数: 出力先wavパス（任意）
