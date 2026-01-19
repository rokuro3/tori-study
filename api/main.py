"""
鳥の鳴き声クイズ API
FastAPIを使用した鳥の識別クイズのバックエンドサーバー
音声データはXeno-Cantoのみを使用（日本国内の音声限定）
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import pandas as pd
import requests
import random
import time
import threading
import os
from pathlib import Path
from datetime import datetime
from urllib.parse import quote

# ローカル開発用: .envファイルから環境変数を読み込む
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenvがインストールされていない場合はスキップ

# Xeno-Canto API v3 キー
# 1. 環境変数から取得
# 2. .xenocantoapiファイルから取得
XENO_CANTO_API_KEY = os.environ.get("XENO_CANTO_API_KEY", "")
if not XENO_CANTO_API_KEY:
    # .xenocantoapiファイルから読み込む
    api_key_file = Path(__file__).resolve().parent.parent / ".xenocantoapi"
    if api_key_file.exists():
        XENO_CANTO_API_KEY = api_key_file.read_text().strip()
        print(f"[Config] Loaded Xeno-Canto API key from {api_key_file}")

# アプリケーション初期化
app = FastAPI(
    title="鳥の鳴き声クイズ API",
    description="鳥の鳴き声を聞いて種名を当てるクイズアプリのAPI（Xeno-Canto使用）",
    version="1.0.0"
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番環境では適切に設定すること
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# データファイルのパス
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "birdVoiceSearch"

# グローバルデータの読み込み
mokuroku_data: Optional[pd.DataFrame] = None  # 旧形式（学名、種名のみ）
mokuroku_parsed: Optional[pd.DataFrame] = None  # 新形式（科名等の情報を含む）


# ============================================
# レートリミッター（Xeno-Canto用）
# ============================================
class RateLimiter:
    """
    Xeno-Canto APIへのリクエストを制限するレートリミッター
    10秒に1回のリクエストに制限
    """
    def __init__(self, min_interval: float = 10.0):
        self.min_interval = min_interval
        self.last_request_time: float = 0
        self.lock = threading.Lock()
    
    def wait_if_needed(self):
        """必要に応じて待機"""
        with self.lock:
            now = time.time()
            elapsed = now - self.last_request_time
            if elapsed < self.min_interval:
                wait_time = self.min_interval - elapsed
                print(f"[RateLimiter] Waiting {wait_time:.1f} seconds...")
                time.sleep(wait_time)
            self.last_request_time = time.time()
    
    def get_wait_time(self) -> float:
        """次のリクエストまでの待ち時間を取得"""
        with self.lock:
            now = time.time()
            elapsed = now - self.last_request_time
            if elapsed < self.min_interval:
                return self.min_interval - elapsed
            return 0


# レートリミッターインスタンス（10秒間隔）
xeno_canto_limiter = RateLimiter(min_interval=10.0)


# ============================================
# 出題対象の鳥リスト（37種）
# ============================================
TARGET_BIRDS = [
    'カイツブリ', 'カンムリカイツブリ', 'カワウ', 'アオサギ', 'ダイサギ', 'ミサゴ', 'トビ',
    'ノスリ', 'ヒドリガモ', 'クイナ', 'オオバン', 'ユリカモメ', 'ドバト', 'キジバト', 'コゲラ',
    'ヒバリ', 'ハクセキレイ', 'タヒバリ', 'ヒヨドリ', 'モズ', 'ジョウビタキ', 'シロハラ',
    'ツグミ', 'ガビチョウ', 'ウグイス', 'シジュウカラ', 'メジロ', 'ホオジロ', 'ホオアカ',
    'アオジ', 'カワラヒワ', 'ベニマシコ', 'シメ', 'スズメ', 'ムクドリ', 'ハシボソガラス',
    'ハシブトガラス'
]


def load_data():
    """データファイルを読み込む"""
    global mokuroku_data, mokuroku_parsed
    
    # JSONファイルを優先的に読み込む（pickle互換性問題を回避）
    mokuroku_parsed_json_path = DATA_DIR / "mokuroku_parsed.json"
    mokuroku_path = DATA_DIR / "mokuroku.pickle"
    mokuroku_parsed_path = DATA_DIR / "mokuroku_parsed.pickle"
    
    # mokuroku_parsed: JSONを優先
    if mokuroku_parsed_json_path.exists():
        mokuroku_parsed = pd.read_json(mokuroku_parsed_json_path)
        print(f"[Data] Loaded mokuroku_parsed.json: {len(mokuroku_parsed)} records")
    elif mokuroku_parsed_path.exists():
        try:
            mokuroku_parsed = pd.read_pickle(mokuroku_parsed_path)
            print(f"[Data] Loaded mokuroku_parsed.pickle: {len(mokuroku_parsed)} records")
        except Exception as e:
            print(f"[Data] Failed to load mokuroku_parsed.pickle: {e}")
    
    # mokuroku: pickleのみ（オプション）
    if mokuroku_path.exists():
        try:
            mokuroku_data = pd.read_pickle(mokuroku_path)
            print(f"[Data] Loaded mokuroku.pickle: {len(mokuroku_data)} records")
        except Exception as e:
            print(f"[Data] Failed to load mokuroku.pickle: {e}")


@app.on_event("startup")
async def startup_event():
    """アプリケーション起動時にデータを読み込む"""
    load_data()


# レスポンスモデル
class QuizQuestion(BaseModel):
    """クイズの問題"""
    question_id: str
    audio_url: str
    audio_source: str  # "xeno-canto"
    correct_answer: str
    choices: list[str]
    scientific_name: Optional[str] = None
    voice_type: Optional[str] = None
    location: Optional[str] = None
    family: Optional[str] = None  # 科名（日本語）
    # クレジット情報（Xeno-Canto利用規約に基づく表示用）
    recordist: Optional[str] = None  # 録音者名
    license_url: Optional[str] = None  # ライセンスURL
    xc_id: Optional[str] = None  # XCカタログ番号


class QuizAnswer(BaseModel):
    """クイズの回答"""
    question_id: str
    user_answer: str


class QuizResult(BaseModel):
    """クイズの結果"""
    is_correct: bool
    correct_answer: str
    message: str


class BirdInfo(BaseModel):
    """鳥の情報"""
    species_name: str
    scientific_name: Optional[str] = None
    family: Optional[str] = None
    order: Optional[str] = None
    audio_urls: list[dict]


class SearchParams(BaseModel):
    """検索パラメータ"""
    species_name: str
    voice_type: Optional[str] = None  # "call" or "song"
    limit: int = 5


# 一時的な問題保存用（本番ではRedisなどを使用）
quiz_sessions: dict[str, dict] = {}


def get_xeno_canto_recordings(scientific_name: str, voice_type: Optional[str] = None, 
                               limit: int = 5) -> list[dict]:
    """
    Xeno-Canto API v3から日本国内の音声データを取得
    レートリミット: 10秒に1回
    APIキーが必要（環境変数 XENO_CANTO_API_KEY）
    """
    # APIキーの確認
    if not XENO_CANTO_API_KEY:
        print("[Xeno-Canto] Warning: API key not set. Set XENO_CANTO_API_KEY environment variable.")
        return []
    
    # レートリミットの待機
    xeno_canto_limiter.wait_if_needed()
    
    # クエリ構築（日本国内の音声のみ）
    # API v3ではタグ形式が必須: gen:属名 sp:種名 cnt:japan
    # scientific_nameは "Genus species" または "Genus species subspecies" 形式
    parts = scientific_name.strip().split()
    if len(parts) >= 2:
        genus = parts[0]
        species = parts[1]
        query = f"gen:{genus} sp:{species} cnt:japan"
    else:
        # フォールバック: そのまま使用（属名のみの場合など）
        query = f"gen:{scientific_name} cnt:japan"
    
    if voice_type:
        query += f" type:{voice_type}"
    
    # URLエンコード
    encoded_query = quote(query)
    
    # API v3 エンドポイント（APIキーが必要）
    url = f"https://xeno-canto.org/api/3/recordings?query={encoded_query}&key={XENO_CANTO_API_KEY}"
    
    # ログではAPIキーを隠す
    log_url = f"https://xeno-canto.org/api/3/recordings?query={encoded_query}&key=***"
    print(f"[Xeno-Canto] Requesting: {log_url}")
    
    try:
        response = requests.get(url, timeout=20)
        
        # エラーレスポンスをチェック
        if response.status_code != 200:
            try:
                error_data = response.json()
                error_msg = error_data.get("message", "Unknown error")
                print(f"[Xeno-Canto] API error ({response.status_code}): {error_msg}")
            except:
                print(f"[Xeno-Canto] HTTP error: {response.status_code}")
            return []
        
        data = response.json()
        
        # エラーレスポンスの確認
        if "error" in data:
            print(f"[Xeno-Canto] API error: {data.get('message', 'Unknown error')}")
            return []
        
        recordings = []
        
        for rec in data.get("recordings", []):
            if len(recordings) >= limit:
                break
            
            file_url = rec.get("file", "")
            # HTTPSに変換
            if file_url.startswith("//"):
                file_url = "https:" + file_url
            
            license_url = rec.get("lic", "")
            if license_url.startswith("//"):
                license_url = "https:" + license_url
            
            # クレジット表示用の情報を含める
            recordings.append({
                "url": file_url,
                "location": rec.get("loc", ""),
                "type": rec.get("type", ""),
                "quality": rec.get("q", ""),
                "recordist": rec.get("rec", ""),
                "country": rec.get("cnt", ""),
                "license": license_url,
                "xc_id": rec.get("id", ""),  # XCカタログ番号
            })
        
        print(f"[Xeno-Canto] Found {len(recordings)} recordings for {scientific_name} in Japan")
        return recordings
    except requests.exceptions.Timeout:
        print(f"[Xeno-Canto] Request timeout for {scientific_name}")
        return []
    except requests.exceptions.RequestException as e:
        print(f"[Xeno-Canto] Request error: {e}")
        return []
    except Exception as e:
        print(f"[Xeno-Canto] Unexpected error: {e}")
        return []


def get_similar_species_by_family(family_jp: str, exclude_species: str, count: int = 3) -> list[str]:
    """
    同じ科から選択肢となる鳥を取得
    mokuroku_parsed.pickleを使用して科名に基づいて選択
    """
    if mokuroku_parsed is None:
        return []
    
    # 亜種を除外した種のみを対象
    species_df = mokuroku_parsed[~mokuroku_parsed['is_subspecies']]
    
    # 同じ科の鳥を取得
    same_family = species_df[
        (species_df['family_jp'] == family_jp) & 
        (species_df['japanese_name'] != exclude_species)
    ]
    
    similar_species = same_family['japanese_name'].tolist()
    
    # 同じ科に十分な数がいない場合
    if len(similar_species) < count:
        # 他の科からランダムに追加
        other_species = species_df[
            species_df['japanese_name'] != exclude_species
        ]['japanese_name'].tolist()
        
        additional_needed = count - len(similar_species)
        available = [s for s in other_species if s not in similar_species]
        if available:
            additional = random.sample(available, min(additional_needed, len(available)))
            similar_species.extend(additional)
    
    # 必要な数だけランダムに選択
    if len(similar_species) > count:
        similar_species = random.sample(similar_species, count)
    
    return similar_species


def get_bird_info_from_parsed(japanese_name: str) -> Optional[dict]:
    """
    mokuroku_parsed.pickleから鳥の情報を取得
    """
    if mokuroku_parsed is None:
        return None
    
    # 亜種を除外して検索
    species_df = mokuroku_parsed[~mokuroku_parsed['is_subspecies']]
    bird = species_df[species_df['japanese_name'] == japanese_name]
    
    if bird.empty:
        # 亜種も含めて検索
        bird = mokuroku_parsed[mokuroku_parsed['japanese_name'] == japanese_name]
    
    if bird.empty:
        return None
    
    row = bird.iloc[0]
    return {
        'japanese_name': row['japanese_name'],
        'scientific_name': row['scientific_name'],
        'family': row['family'],
        'family_jp': row['family_jp'],
        'order': row['order'],
        'order_jp': row['order_jp'],
        'genus': row['genus'],
        'genus_jp': row['genus_jp'],
    }


@app.get("/")
async def root():
    """ルートエンドポイント"""
    return {"message": "鳥の鳴き声クイズ API", "version": "1.0.0", "audio_source": "Xeno-Canto (Japan only)"}


@app.get("/api/health")
async def health_check():
    """ヘルスチェック"""
    return {
        "status": "healthy",
        "data_loaded": {
            "mokuroku": mokuroku_data is not None,
            "mokuroku_parsed": mokuroku_parsed is not None,
        },
        "rate_limiter": {
            "next_request_wait": xeno_canto_limiter.get_wait_time()
        },
        "xeno_canto_api": {
            "version": "v3",
            "api_key_configured": bool(XENO_CANTO_API_KEY)
        }
    }


@app.get("/api/species")
async def get_species_list():
    """利用可能な鳥の種名一覧を取得"""
    if mokuroku_parsed is None:
        raise HTTPException(status_code=500, detail="データが読み込まれていません")
    
    # 亜種を除外
    species_df = mokuroku_parsed[~mokuroku_parsed['is_subspecies']]
    species_list = species_df[["japanese_name", "scientific_name", "family_jp", "order_jp"]].to_dict(orient="records")
    return {"species": species_list, "count": len(species_list)}


@app.get("/api/families")
async def get_families_list():
    """科の一覧を取得"""
    if mokuroku_parsed is None:
        raise HTTPException(status_code=500, detail="データが読み込まれていません")
    
    species_df = mokuroku_parsed[~mokuroku_parsed['is_subspecies']]
    families = species_df.groupby(['family', 'family_jp']).size().reset_index(name='species_count')
    families_list = families.to_dict(orient="records")
    return {"families": families_list, "count": len(families_list)}


@app.get("/api/quiz/question")
async def get_quiz_question(
    voice_type: Optional[str] = None
):
    """
    クイズの問題を生成（科名に基づいた選択肢）
    日本国内のXeno-Canto音声のみを使用
    出題対象は TARGET_BIRDS リストに限定
    商用利用可能なライセンスのみ
    
    voice_type: "song", "call", または None（すべて）
    """
    if mokuroku_parsed is None:
        raise HTTPException(status_code=500, detail="データが読み込まれていません")
    
    # 亜種を除外し、出題対象の鳥のみをフィルタリング
    species_df = mokuroku_parsed[
        (~mokuroku_parsed['is_subspecies']) & 
        (mokuroku_parsed['japanese_name'].isin(TARGET_BIRDS))
    ]
    
    if len(species_df) == 0:
        raise HTTPException(status_code=500, detail="出題対象の鳥データが見つかりません")
    
    recordings = []
    selected_bird = None
    
    # Xeno-Cantoから日本国内の音声を検索（商用利用可能なもののみ）
    retry_count = 0
    max_retries = 5  # レートリミットがあるので少なめに
    tried_birds = set()  # 試行済みの鳥
    
    while not recordings and retry_count < max_retries:
        # まだ試していない鳥からランダムに選択
        available_birds = species_df[~species_df['japanese_name'].isin(tried_birds)]
        if len(available_birds) == 0:
            break  # すべての鳥を試した
        
        random_bird = available_birds.sample(n=1).iloc[0]
        correct_species = random_bird["japanese_name"]
        tried_birds.add(correct_species)
        scientific_name = random_bird["scientific_name"]
        family_jp = random_bird["family_jp"]
        
        print(f"[Quiz] Trying: {correct_species} ({scientific_name})")
        
        # Xeno-Cantoから日本国内の音声を取得（商用利用可能なもののみ）
        recordings = get_xeno_canto_recordings(
            scientific_name,
            voice_type=voice_type,
            limit=5
        )
        
        if recordings:
            selected_bird = random_bird
        
        retry_count += 1
    
    if not recordings or selected_bird is None:
        raise HTTPException(
            status_code=404, 
            detail="日本国内の音声データが見つかりませんでした。しばらく待ってから再度お試しください。"
        )
    
    correct_species = selected_bird["japanese_name"]
    scientific_name = selected_bird["scientific_name"]
    family_jp = selected_bird["family_jp"]
    
    # ランダムに1つの音声を選択
    selected_recording = random.choice(recordings)
    
    # 出題する鳥のリスト（TARGET_BIRDS）から不正解の選択肢を取得
    available_choices = [bird for bird in TARGET_BIRDS if bird != correct_species]
    wrong_choices = random.sample(available_choices, min(3, len(available_choices)))
    
    # 選択肢を作成（正解 + 不正解3つ）
    choices = [correct_species] + wrong_choices
    
    # 選択肢が4つに満たない場合は追加（念のため）
    while len(choices) < 4 and len(available_choices) > len(wrong_choices):
        additional = random.choice(available_choices)
        if additional not in choices:
            choices.append(additional)
    
    # シャッフル
    random.shuffle(choices)
    
    # 問題IDを生成
    question_id = f"q_{int(time.time())}_{random.randint(1000, 9999)}"
    
    # セッションに保存
    quiz_sessions[question_id] = {
        "correct_answer": correct_species,
        "scientific_name": scientific_name,
        "family_jp": family_jp,
        "created_at": datetime.now().isoformat(),
    }
    
    return QuizQuestion(
        question_id=question_id,
        audio_url=selected_recording["url"],
        audio_source="xeno-canto",
        correct_answer=correct_species,  # デバッグ用（本番では削除）
        choices=choices,
        scientific_name=scientific_name,
        voice_type=selected_recording.get("type"),
        location=selected_recording.get("location"),
        family=family_jp,
        # クレジット情報
        recordist=selected_recording.get("recordist"),
        license_url=selected_recording.get("license"),
        xc_id=selected_recording.get("xc_id"),
    )


@app.post("/api/quiz/answer")
async def submit_answer(answer: QuizAnswer):
    """クイズの回答を送信"""
    if answer.question_id not in quiz_sessions:
        raise HTTPException(status_code=404, detail="問題が見つかりません")
    
    session = quiz_sessions[answer.question_id]
    correct_answer = session["correct_answer"]
    is_correct = answer.user_answer == correct_answer
    
    return QuizResult(
        is_correct=is_correct,
        correct_answer=correct_answer,
        message="正解！🎉" if is_correct else f"残念... 正解は「{correct_answer}」でした",
    )


@app.post("/api/search")
async def search_bird(params: SearchParams):
    """鳥の情報を検索（Xeno-Cantoのみ）"""
    if mokuroku_parsed is None:
        raise HTTPException(status_code=500, detail="データが読み込まれていません")
    
    # 種名から鳥の情報を取得
    bird_info = get_bird_info_from_parsed(params.species_name)
    
    if not bird_info:
        raise HTTPException(status_code=404, detail="該当する鳥が見つかりません")
    
    scientific_name = bird_info["scientific_name"]
    
    audio_urls = []
    
    # Xeno-Cantoから検索（日本国内のみ）
    xc_recordings = get_xeno_canto_recordings(
        scientific_name,
        voice_type=params.voice_type,
        limit=params.limit
    )
    for rec in xc_recordings:
        audio_urls.append({
            "source": "xeno-canto",
            "url": rec["url"],
            "type": rec["type"],
            "location": rec["location"],
        })
    
    return BirdInfo(
        species_name=params.species_name,
        scientific_name=scientific_name,
        family=bird_info.get("family_jp"),
        order=bird_info.get("order_jp"),
        audio_urls=audio_urls,
    )


@app.get("/api/bird/{species_name}")
async def get_bird_detail(species_name: str):
    """鳥の詳細情報を取得"""
    bird_info = get_bird_info_from_parsed(species_name)
    
    if not bird_info:
        raise HTTPException(status_code=404, detail="該当する鳥が見つかりません")
    
    return bird_info


@app.get("/api/rate-limit/status")
async def get_rate_limit_status():
    """レートリミットの状態を取得"""
    wait_time = xeno_canto_limiter.get_wait_time()
    return {
        "xeno_canto": {
            "min_interval_seconds": xeno_canto_limiter.min_interval,
            "next_request_wait_seconds": wait_time,
            "ready": wait_time == 0
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
