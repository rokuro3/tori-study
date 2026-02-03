#!/usr/bin/env python3
"""
mokuroku.jsonとmokuroku_filtered.jsonから
ユニークな種番号のみを持つバージョンを作成する
"""

import json

def make_unique(birds, filename):
    """
    種番号ごとに最初のエントリのみを残す
    （亜種でない種を優先、なければ最初の亜種）
    """
    unique_birds = {}
    
    for bird in birds:
        number = bird['number']
        
        if number not in unique_birds:
            # 初めて見る種番号
            unique_birds[number] = bird
        else:
            # 既に存在する場合、亜種でない方を優先
            if bird['is_subspecies'] == False and unique_birds[number]['is_subspecies'] == True:
                unique_birds[number] = bird
    
    # リストに変換（元の順序を保持）
    result = list(unique_birds.values())
    
    print(f"\n{filename}:")
    print(f"  元のデータ: {len(birds)} 件")
    print(f"  ユニーク化後: {len(result)} 件")
    print(f"  削除された重複: {len(birds) - len(result)} 件")
    
    # 統計
    species = [b for b in result if not b['is_subspecies']]
    subspecies = [b for b in result if b['is_subspecies']]
    print(f"  種: {len(species)} 件")
    print(f"  亜種: {len(subspecies)} 件")
    
    return result

# 元のmokuroku.jsonを読み込んでユニーク化
print("=== 元のmokuroku.jsonをユニーク化 ===")
with open('/root/toriStudy/app/public/data/mokuroku.json', 'r', encoding='utf-8') as f:
    original_birds = json.load(f)

unique_original = make_unique(original_birds, "mokuroku.json")

# 出力
output_path = '/root/toriStudy/app/public/data/mokuroku_unique.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(unique_original, f, ensure_ascii=False, indent=2)
print(f"\n✓ 作成: {output_path}")

# フィルター後のmokuroku_filtered.jsonをユニーク化
print("\n=== mokuroku_filtered.jsonをユニーク化 ===")
with open('/root/toriStudy/app/public/data/mokuroku_filtered.json', 'r', encoding='utf-8') as f:
    filtered_birds = json.load(f)

unique_filtered = make_unique(filtered_birds, "mokuroku_filtered.json")

# 出力
output_path2 = '/root/toriStudy/app/public/data/mokuroku_filtered_unique.json'
with open(output_path2, 'w', encoding='utf-8') as f:
    json.dump(unique_filtered, f, ensure_ascii=False, indent=2)
print(f"\n✓ 作成: {output_path2}")

print("\n=== 完了 ===")
print(f"mokuroku_unique.json: {len(unique_original)} 件")
print(f"mokuroku_filtered_unique.json: {len(unique_filtered)} 件")
