#!/usr/bin/env python3
"""
種番号リスト.xlsから種番号を抽出して、
mokuroku_parsed.jsonから該当する種を抽出し、
新しいJSONファイルを作成する
"""

import pandas as pd
import json
import re

# Excelファイルを読み込む
print("Excelファイルを読み込んでいます...")
df = pd.read_excel('/root/toriStudy/app/public/data/種番号ﾘｽﾄ.xls', header=None)

# データの最初の数行を表示
print("\n=== Excelファイルの内容（最初の10行）===")
print(df.head(10))

print("\n=== Excelファイルのshape ===")
print(f"行数: {len(df)}, 列数: {len(df.columns)}")

# 種番号を含む列を探す
species_numbers = set()

print("\n=== 種番号を抽出中... ===")
for col_idx in range(len(df.columns)):
    col_data = df.iloc[:, col_idx]
    for idx, value in enumerate(col_data):
        if pd.notna(value):
            # 数値として読み取れる場合
            if isinstance(value, (int, float)):
                # 1から2000の範囲の数値を種番号として扱う
                if 1 <= value <= 2000:
                    species_numbers.add(str(int(value)))
            # 文字列として読み取れる場合
            elif isinstance(value, str):
                # "123" のような純粋な数値文字列
                if value.strip().isdigit():
                    num = int(value.strip())
                    if 1 <= num <= 2000:
                        species_numbers.add(str(num))

print(f"\n抽出された種番号の数: {len(species_numbers)}")
print(f"最初の20個: {sorted(list(species_numbers)[:20], key=lambda x: int(x))}")

# mokuroku_parsed.jsonを読み込む
print("\n=== mokuroku_parsed.jsonを読み込んでいます... ===")
with open('/root/toriStudy/birdVoiceSearch/mokuroku_parsed.json', 'r', encoding='utf-8') as f:
    all_birds = json.load(f)

print(f"全鳥類データ数: {len(all_birds)}")

# 種番号リストに含まれる鳥のみを抽出
filtered_birds = []
for bird in all_birds:
    # numberから基本の種番号を取得（例: "123-1" -> "123"）
    base_number = bird['number'].split('-')[0]
    
    if base_number in species_numbers:
        filtered_birds.append(bird)

print(f"\n=== フィルタリング結果 ===")
print(f"抽出された鳥類データ数: {len(filtered_birds)}")

# 新しいJSONファイルとして保存
output_path = '/root/toriStudy/app/public/data/mokuroku_filtered.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(filtered_birds, f, ensure_ascii=False, indent=2)

print(f"\n✓ 新しいJSONファイルを作成しました: {output_path}")

# 最初の5件を表示
print("\n=== 抽出された鳥の最初の5件 ===")
for bird in filtered_birds[:5]:
    print(f"{bird['number']}. {bird['japanese_name']} ({bird['scientific_name']})")

# 統計情報
print("\n=== 統計情報 ===")
species_only = [b for b in filtered_birds if not b['is_subspecies']]
subspecies_only = [b for b in filtered_birds if b['is_subspecies']]
print(f"種のみ: {len(species_only)}")
print(f"亜種のみ: {len(subspecies_only)}")
print(f"合計: {len(filtered_birds)}")
