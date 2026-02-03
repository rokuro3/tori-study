#!/usr/bin/env python3
"""
mokuroku_unique.jsonとmokuroku_filtered_unique.jsonを合わせて
ユニークな種番号のみを持つ統合版を作成し、
元のmokuroku.jsonを置き換える
"""

import json
import csv

def merge_and_make_unique(birds1, birds2):
    """
    2つの鳥類リストを合わせてユニーク化
    種番号が同じ場合は最初のものを優先（亜種より種を優先）
    """
    unique_birds = {}
    
    # 両方のリストを結合
    all_birds = birds1 + birds2
    
    for bird in all_birds:
        number = bird['number']
        
        if number not in unique_birds:
            # 初めて見る種番号
            unique_birds[number] = bird
        else:
            # 既に存在する場合、亜種でない方を優先
            if bird['is_subspecies'] == False and unique_birds[number]['is_subspecies'] == True:
                unique_birds[number] = bird
    
    # 種番号順にソート
    result = sorted(unique_birds.values(), key=lambda x: (
        int(x['number'].split('-')[0]),  # 基本の種番号
        '-' in x['number'],              # 亜種かどうか（種を先に）
        x['number']                       # 完全な番号
    ))
    
    return result

# ファイルを読み込む
print("=== ファイルを読み込んでいます... ===")
with open('/root/toriStudy/app/public/data/mokuroku_unique.json', 'r', encoding='utf-8') as f:
    birds1 = json.load(f)
print(f"mokuroku_unique.json: {len(birds1)} 件")

with open('/root/toriStudy/app/public/data/mokuroku_filtered_unique.json', 'r', encoding='utf-8') as f:
    birds2 = json.load(f)
print(f"mokuroku_filtered_unique.json: {len(birds2)} 件")

# 合わせてユニーク化
print("\n=== マージしてユニーク化 ===")
merged_birds = merge_and_make_unique(birds1, birds2)

print(f"マージ後のユニークなデータ: {len(merged_birds)} 件")

# 統計
species = [b for b in merged_birds if not b['is_subspecies']]
subspecies = [b for b in merged_birds if b['is_subspecies']]
print(f"  種: {len(species)} 件")
print(f"  亜種: {len(subspecies)} 件")

# 元のmokuroku.jsonをバックアップ
import shutil
backup_path = '/root/toriStudy/app/public/data/mokuroku.json.backup'
shutil.copy('/root/toriStudy/app/public/data/mokuroku.json', backup_path)
print(f"\n✓ 元のmokuroku.jsonをバックアップ: {backup_path}")

# 新しいmokuroku.jsonとして保存
output_json = '/root/toriStudy/app/public/data/mokuroku.json'
with open(output_json, 'w', encoding='utf-8') as f:
    json.dump(merged_birds, f, ensure_ascii=False, indent=2)
print(f"✓ 新しいmokuroku.jsonを作成: {output_json}")

# CSV形式でも出力
output_csv = '/root/toriStudy/app/public/data/mokuroku.csv'
with open(output_csv, 'w', encoding='utf-8', newline='') as f:
    writer = csv.writer(f)
    # ヘッダー
    writer.writerow([
        '種番号',
        '和名',
        '学名',
        '属',
        '属（日本語）',
        '科',
        '科（日本語）',
        '目',
        '目（日本語）',
        '亜種'
    ])
    # データ
    for bird in merged_birds:
        writer.writerow([
            bird['number'],
            bird['japanese_name'],
            bird['scientific_name'],
            bird['genus'],
            bird['genus_jp'],
            bird['family'],
            bird['family_jp'],
            bird['order'],
            bird['order_jp'],
            '亜種' if bird['is_subspecies'] else '種'
        ])

print(f"✓ CSVファイルを作成: {output_csv}")

# 目別の統計
print("\n=== 目別の統計（種のみ） ===")
from collections import Counter
order_counter = Counter(bird['order_jp'] for bird in merged_birds if not bird['is_subspecies'])
for order, count in order_counter.most_common(10):
    print(f"  {order}: {count} 種")

print("\n=== 完了 ===")
print(f"統合版 mokuroku.json: {len(merged_birds)} 件")
print(f"CSV版 mokuroku.csv: {len(merged_birds)} 件")
print(f"\n最初の5件:")
for bird in merged_birds[:5]:
    subspecies_mark = " [亜種]" if bird['is_subspecies'] else ""
    print(f"  {bird['number']}. {bird['japanese_name']} ({bird['scientific_name']}){subspecies_mark}")
