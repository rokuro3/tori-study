import { createClient } from '@/lib/supabase/client'
import { AudioFile } from '@/lib/supabase/admin'

// クイズ問題の型
export interface QuizQuestion {
  questionId: string
  audioFile: AudioFile
  choices: string[]
  correctAnswer: string
}

// クイズ結果の型
export interface QuizResult {
  isCorrect: boolean
  correctAnswer: string
  message: string
}

/**
 * 音声ファイルからランダムに1件取得し、クイズ問題を生成
 * @param questionSetId 問題集ID（省略時は全音声から）
 */
export async function generateQuizQuestion(questionSetId?: string): Promise<QuizQuestion> {
  const supabase = createClient()
  
  let audioFiles: AudioFile[] = []
  
  if (questionSetId) {
    // 問題集から音声を取得
    const { data, error } = await supabase
      .from('question_set_items')
      .select(`
        audio_files(*)
      `)
      .eq('question_set_id', questionSetId)
    
    if (error) {
      console.error('Error fetching question set items:', error)
      throw new Error('問題集の取得に失敗しました')
    }
    
    // データを AudioFile[] に変換
    audioFiles = (data || [])
      .map(item => {
        const audioFile = item.audio_files
        if (audioFile && typeof audioFile === 'object' && !Array.isArray(audioFile)) {
          return audioFile as AudioFile
        }
        return null
      })
      .filter((file): file is AudioFile => file !== null && file.is_active)
  } else {
    // 全ての有効な音声ファイルを取得
    const { data, error } = await supabase
      .from('audio_files')
      .select('*')
      .eq('is_active', true)
    
    if (error) {
      console.error('Error fetching audio files:', error)
      throw new Error('音声ファイルの取得に失敗しました')
    }
    
    audioFiles = data || []
  }
  
  if (audioFiles.length === 0) {
    throw new Error('利用可能な音声ファイルがありません')
  }
  
  // ランダムに1件選択
  const randomIndex = Math.floor(Math.random() * audioFiles.length)
  const selectedFile = audioFiles[randomIndex]
  
  // 選択肢を生成（正解 + ダミー3つ）
  const choices = generateChoices(selectedFile.bird_name, audioFiles)
  
  return {
    questionId: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    audioFile: selectedFile,
    choices: choices,
    correctAnswer: selectedFile.bird_name
  }
}

/**
 * 選択肢を生成（正解1つ + ダミー3つ、合計4つ）
 */
function generateChoices(correctAnswer: string, allFiles: AudioFile[]): string[] {
  // ユニークな鳥名リストを作成
  const uniqueBirdNames = Array.from(new Set(allFiles.map(f => f.bird_name)))
  
  // 正解を除いた候補リスト
  const candidates = uniqueBirdNames.filter(name => name !== correctAnswer)
  
  // シャッフルしてダミー選択肢を3つ取得
  const shuffled = candidates.sort(() => Math.random() - 0.5)
  const dummies = shuffled.slice(0, 3)
  
  // 正解とダミーを合わせてシャッフル
  const choices = [correctAnswer, ...dummies]
  return choices.sort(() => Math.random() - 0.5)
}

/**
 * 回答を判定
 */
export function checkAnswer(question: QuizQuestion, userAnswer: string): QuizResult {
  const isCorrect = userAnswer === question.correctAnswer
  
  return {
    isCorrect,
    correctAnswer: question.correctAnswer,
    message: isCorrect ? '正解！' : `不正解... 答えは「${question.correctAnswer}」`
  }
}

/**
 * 問題集の音声ファイル数を取得
 */
export async function getQuestionSetAudioCount(questionSetId: string): Promise<number> {
  const supabase = createClient()
  
  const { count, error } = await supabase
    .from('question_set_items')
    .select('*', { count: 'exact', head: true })
    .eq('question_set_id', questionSetId)
  
  if (error) {
    console.error('Error getting count:', error)
    return 0
  }
  
  return count || 0
}
