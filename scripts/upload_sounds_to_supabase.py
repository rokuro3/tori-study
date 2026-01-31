#!/usr/bin/env python3
"""
soundフォルダの音声ファイルをSupabase Storageにアップロードし、
audio_filesテーブルにデータを登録するスクリプト

使用方法:
1. 環境変数を設定:
   export SUPABASE_URL="your-supabase-url"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
2. スクリプトを実行:
   python scripts/upload_sounds_to_supabase.py
"""

import os
import json
from pathlib import Path
from supabase import create_client, Client
from urllib.parse import quote

# 設定
SOUND_DIR = Path(__file__).parent.parent / "sound"
SOUND_FILES_JSON = Path(__file__).parent.parent / "api" / "sound_files.json"
BUCKET_NAME = "bird-sounds"

def get_supabase_client() -> Client:
    """Supabaseクライアントを取得"""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        raise ValueError(
            "環境変数 SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください"
        )
    
    return create_client(url, key)

def ensure_bucket_exists(supabase: Client):
    """バケットが存在しない場合は作成"""
    try:
        buckets = supabase.storage.list_buckets()
        bucket_names = [b.name for b in buckets]
        
        if BUCKET_NAME not in bucket_names:
            print(f"バケット '{BUCKET_NAME}' を作成中...")
            supabase.storage.create_bucket(
                BUCKET_NAME, 
                options={"public": True}
            )
            print(f"バケット '{BUCKET_NAME}' を作成しました")
        else:
            print(f"バケット '{BUCKET_NAME}' は既に存在します")
    except Exception as e:
        print(f"バケット確認/作成中にエラー: {e}")

def load_sound_files_data() -> dict:
    """sound_files.jsonを読み込む"""
    if not SOUND_FILES_JSON.exists():
        raise FileNotFoundError(
            f"{SOUND_FILES_JSON} が見つかりません。\n"
            "まず python api/parse_sound_files.py を実行してください。"
        )
    
    with open(SOUND_FILES_JSON, 'r', encoding='utf-8') as f:
        return json.load(f)

def upload_audio_files(supabase: Client, sound_data: dict):
    """音声ファイルをアップロードしてDBに登録"""
    success_files = sound_data.get('success', [])
    
    if not success_files:
        print("アップロードする音声ファイルがありません")
        return
    
    print(f"\n{len(success_files)} 件の音声ファイルをアップロード中...\n")
    
    uploaded_count = 0
    skipped_count = 0
    error_count = 0
    
    for file_info in success_files:
        filename = file_info['filename']
        filepath = SOUND_DIR / filename
        
        if not filepath.exists():
            print(f"  ✗ ファイルが見つかりません: {filename}")
            error_count += 1
            continue
        
        # 既存チェック
        existing = supabase.table('audio_files').select('id').eq(
            'original_filename', filename
        ).execute()
        
        if existing.data:
            print(f"  ○ スキップ（既存）: {file_info['bird_name']}")
            skipped_count += 1
            continue
        
        try:
            # ファイルをアップロード
            storage_path = f"audio/{quote(filename)}"
            
            with open(filepath, 'rb') as f:
                file_content = f.read()
            
            # アップロード
            supabase.storage.from_(BUCKET_NAME).upload(
                path=storage_path,
                file=file_content,
                file_options={"content-type": "audio/mpeg"}
            )
            
            # 公開URLを取得
            public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(storage_path)
            
            # DBに登録
            supabase.table('audio_files').insert({
                'bird_name': file_info['bird_name'],
                'scientific_name': file_info.get('scientific_name'),
                'family': file_info.get('family'),
                'family_jp': file_info.get('family_jp'),
                'order_name': file_info.get('order'),
                'order_jp': file_info.get('order_jp'),
                'genus': file_info.get('genus'),
                'genus_jp': file_info.get('genus_jp'),
                'file_path': storage_path,
                'storage_url': public_url,
                'original_filename': filename,
                'is_active': True
            }).execute()
            
            print(f"  ✓ アップロード完了: {file_info['bird_name']} - {filename}")
            uploaded_count += 1
            
        except Exception as e:
            print(f"  ✗ エラー: {filename} - {e}")
            error_count += 1
    
    print(f"\n--- 結果 ---")
    print(f"アップロード成功: {uploaded_count}")
    print(f"スキップ（既存）: {skipped_count}")
    print(f"エラー: {error_count}")

def main():
    print("=" * 50)
    print("Supabase 音声ファイルアップロードスクリプト")
    print("=" * 50)
    
    # Supabaseクライアント取得
    print("\nSupabaseに接続中...")
    supabase = get_supabase_client()
    print("接続成功")
    
    # バケット確認/作成
    ensure_bucket_exists(supabase)
    
    # sound_files.json読み込み
    print("\n音声ファイル情報を読み込み中...")
    sound_data = load_sound_files_data()
    print(f"読み込み完了: {sound_data.get('total_success', 0)} 件")
    
    # アップロード実行
    upload_audio_files(supabase, sound_data)
    
    print("\n完了!")

if __name__ == "__main__":
    main()
