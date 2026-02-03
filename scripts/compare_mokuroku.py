#!/usr/bin/env python3
"""
mokuroku.jsonとmokuroku_filtered.jsonの差分を分析する
"""

import json

# 両方のファイルを読み込む
print("=== ファイルを読み込んでいます... ===")
with open('/root/toriStudy/app/public/data/mokuroku.json', 'r', encoding='utf-8') as f:
    original_birds = json.load(f)

with open('/root/toriStudy/app/public/data/mokuroku_filtered.json', 'r', encoding='utf-8') as f:
    filtered_birds = json.load(f)

print(f"元のファイル (mokuroku.json): {len(original_birds)} 件")
print(f"フィルター後 (mokuroku_filtered.json): {len(filtered_birds)} 件")
print(f"差分: {len(original_birds) - len(filtered_birds)} 件が削除")

# 種番号のセットを作成
original_numbers = {bird['number'] for bird in original_birds}
filtered_numbers = {bird['number'] for bird in filtered_birds}

# 削除された種番号
removed_numbers = original_numbers - filtered_numbers
# 新しく追加された種番号（あれば）
added_numbers = filtered_numbers - original_numbers

print(f"\n=== 削除された種番号の数: {len(removed_numbers)} ===")
if len(removed_numbers) > 0:
    # 削除された鳥の詳細
    removed_birds = [bird for bird in original_birds if bird['number'] in removed_numbers]
    
    # 種番号順にソート
    removed_birds.sort(key=lambda x: (int(x['number'].split('-')[0]), x['number']))
    
    print("\n削除された鳥（最初の20件）:")
    for bird in removed_birds[:20]:
        subspecies_mark = " [亜種]" if bird['is_subspecies'] else ""
        print(f"  {bird['number']}. {bird['japanese_name']} ({bird['scientific_name']}){subspecies_mark}")
    
    if len(removed_birds) > 20:
        print(f"  ... 他 {len(removed_birds) - 20} 件")
    
    # 削除された鳥の統計
    removed_species = [b for b in removed_birds if not b['is_subspecies']]
    removed_subspecies = [b for b in removed_birds if b['is_subspecies']]
    print(f"\n  種: {len(removed_species)} 件")
    print(f"  亜種: {len(removed_subspecies)} 件")

print(f"\n=== 追加された種番号の数: {len(added_numbers)} ===")
if len(added_numbers) > 0:
    added_birds = [bird for bird in filtered_birds if bird['number'] in added_numbers]
    added_birds.sort(key=lambda x: (int(x['number'].split('-')[0]), x['number']))
    
    print("\n追加された鳥:")
    for bird in added_birds:
        subspecies_mark = " [亜種]" if bird['is_subspecies'] else ""
        print(f"  {bird['number']}. {bird['japanese_name']} ({bird['scientific_name']}){subspecies_mark}")

# データの整合性チェック
print("\n=== データの整合性チェック ===")
original_unique = len(set(bird['number'] for bird in original_birds))
filtered_unique = len(set(bird['number'] for bird in filtered_birds))
print(f"元のファイル: {original_unique} 個のユニークな種番号")
print(f"フィルター後: {filtered_unique} 個のユニークな種番号")

# 目・科別の統計
print("\n=== 目別の統計（フィルター後） ===")
from collections import Counter
order_counter = Counter(bird['order_jp'] for bird in filtered_birds if not bird['is_subspecies'])
for order, count in order_counter.most_common(10):
    print(f"  {order}: {count} 種")

print("\n✓ 差分分析が完了しました")
print(f"\n比較結果:")
print(f"  元のmokuroku.json: {len(original_birds)} 件")
print(f"  新しいmokuroku_filtered.json: {len(filtered_birds)} 件")
print(f"  削除: {len(removed_numbers)} 件")
print(f"  追加: {len(added_numbers)} 件")
