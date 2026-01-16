import streamlit as st
import pandas as pd
import requests
import os
import pickle

# ファイルのパスを指定
suntory_pickle_path = "output_suntory.pickle"
bird_research_pickle_path = "output_bird_research.pickle"
mokuroku_path = 'mokuroku.pickle'

# 各データの読み込み
suntory_data = pd.read_pickle(suntory_pickle_path)
bird_research_data = pd.read_pickle(bird_research_pickle_path)
mokuroku_data = pd.read_pickle(mokuroku_path)
st.write(suntory_data.head())

# StreamlitアプリのUI
st.title("鳥の音声検索アプリ")

# サイドバーでオプションを追加
with st.sidebar:
    st.header("オプション")
    japan_only = st.checkbox("日本国内の音声に絞る")
    display_count = st.slider("表示数", min_value=1, max_value=50, value=5)
    st.write("声の種類")
    voice_type = st.radio("声の種類を選択してください", ("地鳴き（call）", "さえずり（song）"))
# すべてのデータを1つのリストにまとめる
all_names = pd.concat([mokuroku_data["種名"], suntory_data["名前"], bird_research_data["名前"]])
selected_species = st.selectbox("種名を選択してください", all_names.unique())
st.write(f"選択された種名は:{selected_species}")

# 検索結果を表示する関数
def display_results(species_name, japan_only, display_count, voice_type):
    download_urls = []  # ダウンロード用URLのリスト
    
    # Suntory検索結果
    st.subheader("Suntoryの検索結果")
    suntory_result = suntory_data[suntory_data["名前"] == species_name]

    if not suntory_result.empty:
        suntory_url = suntory_result.iloc[0]["URL"]
        suntory_chirp = suntory_result.iloc[0]["地鳴き"]
        suntory_sing = suntory_result.iloc[0]["さえずり"]
        # 種類の表示形式を決定
        types = []
        if suntory_chirp:
            types.append("地鳴き")
        if suntory_sing:
            types.append("さえずり")
        if types:
            st.write(f"種類: {', '.join(types)}")
        else:
            st.write("種類: なし")
        # 結果を表示    
        st.write(f"サイトURL: {suntory_url}")
    else:
        st.write("該当する鳥の情報が見つかりませんでした。")

    # Bird Research検索結果
    st.subheader("Bird Researchの検索結果")
    
    bird_research_result = bird_research_data[bird_research_data["名前"] == species_name]

    if not bird_research_result.empty:
        for _, row in bird_research_result.iterrows():
            st.write(f"場所: {row['場所']}")
            st.write(f"種類: {row['種類']}")
            st.write(f"音声リンク:{row['ファイルURL']}")
            st.audio(row['ファイルURL'])
            download_urls.append(row['ファイルURL'])  # ダウンロードURLを追加
    else:
        st.write("該当するデータが見つかりませんでした。")

    # Xeno-Canto検索結果
    st.subheader("Xeno-Cantoの検索結果")
    xenocant_result = mokuroku_data[mokuroku_data["種名"] == species_name]

    if not xenocant_result.empty:
        scientific_name = xenocant_result.iloc[0]["学名"]
        st.write(f"選択された鳥の学名は: {scientific_name}")

        # URLを構築
        query = scientific_name
        if japan_only:
            query += " +cnt:japan"
        if voice_type == "地鳴き（call）": 
            query += " +type:call" 
        elif voice_type == "さえずり（song）":
            query += " +type:song"
        query = query.replace(" ", "%20")
        st.write(f"Xeno-Cantoの検索結果ページ：https://xeno-canto.org/explore?query={query}")

        url = f"https://xeno-canto.org/api/2/recordings?query={query}"
        
        response = requests.get(url)
        data = response.json()

        if data['recordings']:
            recordings = data['recordings'][:display_count]
            for recording in recordings:
                st.write(f"場所: {recording['loc']}")
                st.write(f"種類：{recording['type']}")
                st.write(f"音声リンク：{recording['file']}")
                st.audio(recording['file'])
                download_urls.append(recording['file'])  # ダウンロードURLを追加
        else:
            st.write("結果が見つかりませんでした。")
    else:
        st.write("該当する鳥の情報が見つかりませんでした。")

    # 一括ダウンロードボタンを表示
    if st.button("一括ダウンロードのbatを作成"):
        # バッチファイルを生成
        bat_content = ""
        for url in download_urls:
            bat_content += f"curl -O {url}\n"
            bat_content += f"timeout /t 5\n"
        
        bat_content += "echo end\npause\n"
        
        # バッチファイルを保存
        with open("download_files.bat", "w") as bat_file:
            bat_file.write(bat_content)
        
        # バッチファイルの内容をStreamlitでダウンロード
        with open("download_files.bat", "rb") as bat_file:
            btn = st.download_button(
                label="バッチファイルをダウンロード",
                data=bat_file,
                file_name="download_files.bat",
                mime="application/octet-stream"
            )

# 選択ボックスの値が変更されたときに結果を更新
if selected_species:
    display_results(selected_species, japan_only, display_count, voice_type)
