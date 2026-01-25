"""
soundフォルダの音声ファイルから鳥の名前を抽出してJSONファイルを生成するスクリプト
"""

import json
import re
from pathlib import Path
from typing import Optional, List, Dict


def extract_bird_name_from_filename(filename: str) -> Optional[str]:
    """
    ファイル名から鳥の名前を抽出
    例: "アオサギ　平塚博物館用.mp3" -> "アオサギ"
    例: "アオジ水辺の楽校20231105_084632アオジ　地鳴き.mp3" -> "アオジ"
    """
    # 拡張子を除去
    name_without_ext = filename.replace('.mp3', '').replace('.wav', '').replace('.ogg', '')
    
    # 最初の全角スペース、半角スペース、または日付/時刻パターンまでを抽出
    # パターン: カタカナで始まる鳥名
    match = re.match(r'^([ァ-ヶー]+)', name_without_ext)
    if match:
        return match.group(1)
    
    return None


def find_bird_in_mokuroku(bird_name: str, mokuroku_list: List[Dict]) -> Optional[Dict]:
    """
    目録データから鳥の情報を検索
    """
    # 亜種を除外して検索
    for bird in mokuroku_list:
        if not bird.get('is_subspecies', False) and bird.get('japanese_name') == bird_name:
            return {
                'japanese_name': bird['japanese_name'],
                'scientific_name': bird['scientific_name'],
                'family': bird['family'],
                'family_jp': bird['family_jp'],
                'order': bird['order'],
                'order_jp': bird['order_jp'],
                'genus': bird['genus'],
                'genus_jp': bird['genus_jp'],
            }
    
    # 亜種も含めて検索
    for bird in mokuroku_list:
        if bird.get('japanese_name') == bird_name:
            return {
                'japanese_name': bird['japanese_name'],
                'scientific_name': bird['scientific_name'],
                'family': bird['family'],
                'family_jp': bird['family_jp'],
                'order': bird['order'],
                'order_jp': bird['order_jp'],
                'genus': bird['genus'],
                'genus_jp': bird['genus_jp'],
            }
    
    return None


def parse_sound_files(sound_dir: Path, mokuroku_json_path: Path) -> List[Dict]:
    """
    soundフォルダの音声ファイルをパースして鳥の情報を生成
    """
    # 目録データの読み込み
    with open(mokuroku_json_path, 'r', encoding='utf-8') as f:
        mokuroku_list = json.load(f)
    
    # 音声ファイルをスキャン
    audio_files = []
    for ext in ['*.mp3', '*.wav', '*.ogg']:
        audio_files.extend(sound_dir.glob(ext))
    
    results = []
    not_found = []
    
    for audio_file in sorted(audio_files):
        bird_name = extract_bird_name_from_filename(audio_file.name)
        
        if bird_name:
            bird_info = find_bird_in_mokuroku(bird_name, mokuroku_list)
            
            if bird_info:
                results.append({
                    'filename': audio_file.name,
                    'filepath': str(audio_file.relative_to(sound_dir.parent)),
                    'bird_name': bird_name,
                    'scientific_name': bird_info['scientific_name'],
                    'family': bird_info['family'],
                    'family_jp': bird_info['family_jp'],
                    'order': bird_info['order'],
                    'order_jp': bird_info['order_jp'],
                    'genus': bird_info['genus'],
                    'genus_jp': bird_info['genus_jp'],
                })
                print(f"✓ {audio_file.name} -> {bird_name} ({bird_info['scientific_name']})")
            else:
                not_found.append({
                    'filename': audio_file.name,
                    'extracted_name': bird_name
                })
                print(f"✗ {audio_file.name} -> {bird_name} (目録に見つかりません)")
        else:
            not_found.append({
                'filename': audio_file.name,
                'extracted_name': None
            })
            print(f"✗ {audio_file.name} -> 鳥名を抽出できませんでした")
    
    return results, not_found


def main():
    """メイン処理"""
    # パスの設定
    base_dir = Path(__file__).resolve().parent.parent
    sound_dir = base_dir / "sound"
    mokuroku_json = base_dir / "birdVoiceSearch" / "mokuroku_parsed.json"
    output_json = base_dir / "api" / "sound_files.json"
    
    print(f"Sound directory: {sound_dir}")
    print(f"Mokuroku JSON: {mokuroku_json}")
    print(f"Output JSON: {output_json}")
    print()
    
    # 音声ファイルをパース
    results, not_found = parse_sound_files(sound_dir, mokuroku_json)
    
    # 結果を保存
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump({
            'success': results,
            'not_found': not_found,
            'total_success': len(results),
            'total_not_found': len(not_found)
        }, f, ensure_ascii=False, indent=2)
    
    print()
    print(f"結果を保存しました: {output_json}")
    print(f"成功: {len(results)}件")
    print(f"失敗: {len(not_found)}件")
    
    # 成功した鳥のリストを表示
    if results:
        print()
        print("利用可能な鳥:")
        unique_birds = sorted(set(r['bird_name'] for r in results))
        for bird in unique_birds:
            count = sum(1 for r in results if r['bird_name'] == bird)
            print(f"  - {bird} ({count}件)")


if __name__ == "__main__":
    main()
