// 鳥のデータ型
export type Bird = {
  id: string
  name: string
  name_en: string | null
  audio_url: string
  image_url: string | null
  description: string | null
}

// クイズの問題型（ローカル用）
export type QuizQuestion = {
  bird: Bird
  choices: string[]
  correctAnswer: string
}

// FastAPI用の型定義
export type ApiQuizQuestion = {
  question_id: string
  audio_url: string
  audio_source: string
  correct_answer: string
  choices: string[]
  scientific_name: string
  voice_type: string | null
  location: string | null
  family: string | null
  recordist: string | null
  license_url: string | null
  xc_id: string | null
}

export type ApiQuizAnswer = {
  question_id: string
  user_answer: string
}

export type ApiQuizResult = {
  is_correct: boolean
  correct_answer: string
  message: string
}

// サンプルの鳥データ（Supabaseにデータがない場合のフォールバック）
export const sampleBirds: Bird[] = [
  {
    id: '1',
    name: 'ウグイス',
    name_en: 'Japanese Bush Warbler',
    audio_url: '/audio/uguisu.mp3',
    image_url: null,
    description: '「ホーホケキョ」という鳴き声で有名な鳥。春を告げる鳥として親しまれています。',
  },
  {
    id: '2',
    name: 'メジロ',
    name_en: 'Japanese White-eye',
    audio_url: '/audio/mejiro.mp3',
    image_url: null,
    description: '目の周りの白いリングが特徴的な小鳥。花の蜜を好みます。',
  },
  {
    id: '3',
    name: 'シジュウカラ',
    name_en: 'Japanese Tit',
    audio_url: '/audio/shijukara.mp3',
    image_url: null,
    description: '「ツピツピツピ」という鳴き声が特徴。都市部でもよく見られます。',
  },
  {
    id: '4',
    name: 'ヒヨドリ',
    name_en: 'Brown-eared Bulbul',
    audio_url: '/audio/hiyodori.mp3',
    image_url: null,
    description: '「ヒーヨ、ヒーヨ」と鳴く。日本では一年中見られる留鳥です。',
  },
  {
    id: '5',
    name: 'スズメ',
    name_en: 'Eurasian Tree Sparrow',
    audio_url: '/audio/suzume.mp3',
    image_url: null,
    description: '日本で最も身近な野鳥の一つ。「チュンチュン」と鳴きます。',
  },
]

// 選択肢をシャッフルする関数
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// クイズ問題を生成する関数
export function generateQuizQuestion(birds: Bird[], currentBird: Bird): QuizQuestion {
  // 正解以外の鳥から3つランダムに選ぶ
  const otherBirds = birds.filter(b => b.id !== currentBird.id)
  const wrongChoices = shuffleArray(otherBirds).slice(0, 3).map(b => b.name)
  
  // 選択肢をシャッフル
  const choices = shuffleArray([currentBird.name, ...wrongChoices])
  
  return {
    bird: currentBird,
    choices,
    correctAnswer: currentBird.name,
  }
}
