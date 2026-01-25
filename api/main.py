"""
鳥の鳴き声クイズ API (ローカル音声版)
FastAPIを使用した鳥の識別クイズのバックエンドサーバー
音声データはsoundフォルダの音声ファイルを使用
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List, Dict
import json
import random
import time
import os
from pathlib import Path
from datetime import datetime

# アプリケーション初期化
app = FastAPI(
    title="鳥の鳴き声クイズ API (ローカル音声版)",
    description="鳥の鳴き声を聞いて種名を当てるクイズアプリのAPI（ローカル音声使用）",
    version="2.0.0"
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
SOUND_DIR = BASE_DIR / "sound"
SOUND_FILES_JSON = BASE_DIR / "api" / "sound_files.json"

# グローバルデータの読み込み
sound_files_data: Optional[Dict] = None


def load_data():
    """データファイルを読み込む"""
    global sound_files_data
    
    if SOUND_FILES_JSON.exists():
        with open(SOUND_FILES_JSON, 'r', encoding='utf-8') as f:
            sound_files_data = json.load(f)
        print(f"[Data] Loaded sound_files.json: {sound_files_data.get('total_success', 0)} audio files")
    else:
        print(f"[Data] Warning: sound_files.json not found at {SOUND_FILES_JSON}")
        print(f"[Data] Please run: python api/parse_sound_files.py")


@app.on_event("startup")
async def startup_event():
    """アプリケーション起動時にデータを読み込む"""
    load_data()


# レスポンスモデル
class QuizQuestion(BaseModel):
    """クイズの問題"""
    question_id: str
    audio_url: str
    audio_source: str  # "local"
    correct_answer: str
    choices: List[str]
    scientific_name: Optional[str] = None
    family: Optional[str] = None  # 科名（日本語）


class QuizAnswer(BaseModel):
    """クイズの回答"""
    question_id: str
    user_answer: str


class QuizResult(BaseModel):
    """クイズの結果"""
    is_correct: bool
    correct_answer: str
    message: str
    scientific_name: Optional[str] = None
    family: Optional[str] = None


class BirdInfo(BaseModel):
    """鳥の情報"""
    species_name: str
    scientific_name: Optional[str] = None
    family: Optional[str] = None
    order: Optional[str] = None
    audio_count: int


# 一時的な問題保存用（本番ではRedisなどを使用）
quiz_sessions: Dict[str, Dict] = {}


def get_available_birds() -> List[str]:
    """利用可能な鳥のリストを取得"""
    if not sound_files_data:
        return []
    
    success_files = sound_files_data.get('success', [])
    unique_birds = sorted(set(f['bird_name'] for f in success_files))
    return unique_birds


def get_audio_files_for_bird(bird_name: str) -> List[Dict]:
    """指定した鳥の音声ファイルを取得"""
    if not sound_files_data:
        return []
    
    success_files = sound_files_data.get('success', [])
    return [f for f in success_files if f['bird_name'] == bird_name]


def get_bird_info(bird_name: str) -> Optional[Dict]:
    """鳥の情報を取得"""
    audio_files = get_audio_files_for_bird(bird_name)
    if not audio_files:
        return None
    
    # 最初のファイルから情報を取得
    first_file = audio_files[0]
    return {
        'bird_name': first_file['bird_name'],
        'scientific_name': first_file['scientific_name'],
        'family': first_file['family'],
        'family_jp': first_file['family_jp'],
        'order': first_file['order'],
        'order_jp': first_file['order_jp'],
        'genus': first_file['genus'],
        'genus_jp': first_file['genus_jp'],
    }


@app.get("/")
async def root():
    """ルートエンドポイント"""
    available_birds = get_available_birds()
    return {
        "message": "鳥の鳴き声クイズ API (ローカル音声版)",
        "version": "2.0.0",
        "audio_source": "local",
        "available_birds_count": len(available_birds)
    }


@app.get("/api/health")
async def health_check():
    """ヘルスチェック"""
    available_birds = get_available_birds()
    return {
        "status": "healthy",
        "data_loaded": sound_files_data is not None,
        "available_birds_count": len(available_birds),
        "audio_source": "local"
    }


@app.get("/api/species")
async def get_species_list():
    """利用可能な鳥の種名一覧を取得"""
    if not sound_files_data:
        raise HTTPException(status_code=500, detail="データが読み込まれていません")
    
    available_birds = get_available_birds()
    species_list = []
    
    for bird_name in available_birds:
        bird_info = get_bird_info(bird_name)
        if bird_info:
            audio_files = get_audio_files_for_bird(bird_name)
            species_list.append({
                "japanese_name": bird_name,
                "scientific_name": bird_info['scientific_name'],
                "family_jp": bird_info['family_jp'],
                "order_jp": bird_info['order_jp'],
                "audio_count": len(audio_files)
            })
    
    return {"species": species_list, "count": len(species_list)}


@app.get("/api/quiz/question")
async def get_quiz_question():
    """
    クイズの問題を生成
    soundフォルダの音声ファイルを使用
    選択肢は正解の鳥の名前を含む4択
    """
    if not sound_files_data:
        raise HTTPException(status_code=500, detail="データが読み込まれていません")
    
    available_birds = get_available_birds()
    
    if len(available_birds) < 4:
        raise HTTPException(
            status_code=500,
            detail="出題には最低4種類の鳥が必要です"
        )
    
    # ランダムに正解の鳥を選択
    correct_bird = random.choice(available_birds)
    audio_files = get_audio_files_for_bird(correct_bird)
    
    if not audio_files:
        raise HTTPException(status_code=500, detail="音声ファイルが見つかりません")
    
    # ランダムに1つの音声を選択
    selected_file = random.choice(audio_files)
    
    # 鳥の情報を取得
    bird_info = get_bird_info(correct_bird)
    
    # 不正解の選択肢を作成（正解以外からランダムに3つ）
    other_birds = [b for b in available_birds if b != correct_bird]
    wrong_choices = random.sample(other_birds, min(3, len(other_birds)))
    
    # 選択肢を作成（正解 + 不正解3つ）
    choices = [correct_bird] + wrong_choices
    random.shuffle(choices)
    
    # 問題IDを生成
    question_id = f"q_{int(time.time())}_{random.randint(1000, 9999)}"
    
    # セッションに保存
    quiz_sessions[question_id] = {
        "correct_answer": correct_bird,
        "scientific_name": bird_info['scientific_name'] if bird_info else None,
        "family_jp": bird_info['family_jp'] if bird_info else None,
        "created_at": datetime.now().isoformat(),
    }
    
    # 音声ファイルのURL（相対パス）
    audio_url = f"/audio/{selected_file['filename']}"
    
    return QuizQuestion(
        question_id=question_id,
        audio_url=audio_url,
        audio_source="local",
        correct_answer=correct_bird,  # デバッグ用（本番では削除）
        choices=choices,
        scientific_name=bird_info['scientific_name'] if bird_info else None,
        family=bird_info['family_jp'] if bird_info else None,
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
        scientific_name=session.get("scientific_name"),
        family=session.get("family_jp"),
    )


@app.get("/api/bird/{species_name}")
async def get_bird_detail(species_name: str):
    """鳥の詳細情報を取得"""
    bird_info = get_bird_info(species_name)
    
    if not bird_info:
        raise HTTPException(status_code=404, detail="該当する鳥が見つかりません")
    
    audio_files = get_audio_files_for_bird(species_name)
    
    return BirdInfo(
        species_name=species_name,
        scientific_name=bird_info['scientific_name'],
        family=bird_info['family_jp'],
        order=bird_info['order_jp'],
        audio_count=len(audio_files)
    )


# 静的ファイル（音声ファイル）を配信
# 注意: StaticFilesは全てのAPIエンドポイントの後にマウントする
# soundディレクトリが存在する場合のみマウント
if SOUND_DIR.exists():
    app.mount("/audio", StaticFiles(directory=str(SOUND_DIR)), name="audio")
else:
    print(f"Warning: Sound directory not found at {SOUND_DIR}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
