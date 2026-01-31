"""
mokuroku8.csvを解析して、構造化されたデータに変換するスクリプト
"""

import re
import pandas as pd
import json
from pathlib import Path


def parse_mokuroku8(file_path: str) -> pd.DataFrame:
    """
    mokuroku8.csvを解析して、各種に対して目、科、属、学名、和名の情報を持つDataFrameを作成
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    records = []
    current_order = ""
    current_order_jp = ""
    current_family = ""
    current_family_jp = ""
    current_genus = ""
    current_genus_jp = ""
    
    # 正規表現パターン
    order_pattern = re.compile(r'^Order\s+(\w+)\s+(.+)$')
    family_pattern = re.compile(r'^Family\s+(\w+)\s+(.+)$')
    genus_pattern = re.compile(r'^([A-Z]{2,})\s+(.+)$')
    species_pattern = re.compile(r'^(\d+)\.\s+([A-Z][a-z]+\s+[a-z]+)\s+(.+)$')
    subspecies_pattern = re.compile(r'^(\d+-\d+)\.\s+([A-Z][a-z]+\s+[a-z]+\s+[a-z]+)\s+(.+)$')
    subspecies_unknown_pattern = re.compile(r'^(\d+-U)\.\s+([A-Z][a-z]+\s+[a-z]+\s+ssp\.)\s+(.+)$')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Order (目) の解析
        order_match = order_pattern.match(line)
        if order_match:
            current_order = order_match.group(1)
            current_order_jp = order_match.group(2)
            continue
        
        # Family (科) の解析
        family_match = family_pattern.match(line)
        if family_match:
            current_family = family_match.group(1)
            current_family_jp = family_match.group(2)
            continue
        
        # Genus (属) の解析
        genus_match = genus_pattern.match(line)
        if genus_match and not line.startswith('Part') and not line.startswith('Order') and not line.startswith('Family'):
            # 既に解析済みの行をスキップ
            if any(c.islower() for c in genus_match.group(1)):
                continue
            current_genus = genus_match.group(1)
            current_genus_jp = genus_match.group(2)
            continue
        
        # Species (種) の解析
        species_match = species_pattern.match(line)
        if species_match:
            number = species_match.group(1)
            scientific_name = species_match.group(2)
            japanese_name = species_match.group(3)
            
            records.append({
                'number': number,
                'scientific_name': scientific_name,
                'japanese_name': japanese_name,
                'genus': current_genus,
                'genus_jp': current_genus_jp,
                'family': current_family,
                'family_jp': current_family_jp,
                'order': current_order,
                'order_jp': current_order_jp,
                'is_subspecies': False
            })
            continue
        
        # Subspecies (亜種) の解析
        subspecies_match = subspecies_pattern.match(line)
        if subspecies_match:
            number = subspecies_match.group(1)
            scientific_name = subspecies_match.group(2)
            japanese_name = subspecies_match.group(3)
            
            records.append({
                'number': number,
                'scientific_name': scientific_name,
                'japanese_name': japanese_name,
                'genus': current_genus,
                'genus_jp': current_genus_jp,
                'family': current_family,
                'family_jp': current_family_jp,
                'order': current_order,
                'order_jp': current_order_jp,
                'is_subspecies': True
            })
            continue
        
        # 亜種不明の解析
        subspecies_unknown_match = subspecies_unknown_pattern.match(line)
        if subspecies_unknown_match:
            continue  # 亜種不明はスキップ
    
    df = pd.DataFrame(records)
    return df


def main():
    # ファイルパス
    base_dir = Path(__file__).resolve().parent.parent
    input_file = base_dir / "birdVoiceSearch" / "mokuroku8.csv"
    output_pickle = base_dir / "birdVoiceSearch" / "mokuroku_parsed.pickle"
    output_json = base_dir / "birdVoiceSearch" / "mokuroku_parsed.json"
    
    print(f"Parsing {input_file}...")
    df = parse_mokuroku8(str(input_file))
    
    print(f"Total records: {len(df)}")
    print(f"Species (not subspecies): {len(df[~df['is_subspecies']])}")
    print(f"Subspecies: {len(df[df['is_subspecies']])}")
    print(f"\nFamilies: {df['family_jp'].nunique()}")
    print(f"Orders: {df['order_jp'].nunique()}")
    
    # サンプル出力
    print("\nSample data:")
    print(df.head(10))
    
    # 科ごとの種数
    print("\nSpecies count by family (top 10):")
    family_counts = df[~df['is_subspecies']].groupby('family_jp').size().sort_values(ascending=False)
    print(family_counts.head(10))
    
    # 保存
    df.to_pickle(output_pickle)
    print(f"\nSaved to {output_pickle}")
    
    # JSON形式でも保存
    df.to_json(output_json, orient='records', force_ascii=False, indent=2)
    print(f"Saved to {output_json}")
    
    return df


if __name__ == "__main__":
    main()
