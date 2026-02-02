import { createClient } from '@/lib/supabase/client'

// 利用可能な鳥の種類数（soundフォルダの20種類）
export const TOTAL_SPECIES = 20

// バッジの種類
export type BadgeType = 'bronze' | 'silver' | 'gold' | 'platinum'

export type Badge = {
  type: BadgeType
  name: string
  description: string
  emoji: string
  threshold: number // 必要な種類数の割合（%）
  requiredAccuracy: number // 必要な正答率（%）
}

// バッジ取得状態
export type BadgeState = {
  badge: Badge
  earned: boolean
  earnedAt?: string
}

// 問題集別統計
export type QuestionSetStats = {
  questionSetId: string
  questionSetName: string
  totalAudioFiles: number
  correctAudioFiles: number
  successRate: number
  earnedBadges: BadgeType[]
}

export const BADGES: Badge[] = [
  {
    type: 'bronze',
    name: '銅バッジ',
    description: '問題集の60%の音声で正解',
    emoji: '🥉',
    threshold: 60,
    requiredAccuracy: 0,
  },
  {
    type: 'silver',
    name: '銀バッジ',
    description: '問題集の70%の音声で正解',
    emoji: '🥈',
    threshold: 70,
    requiredAccuracy: 0,
  },
  {
    type: 'gold',
    name: '金バッジ',
    description: '問題集の80%の音声で正解',
    emoji: '🥇',
    threshold: 80,
    requiredAccuracy: 0,
  },
  {
    type: 'platinum',
    name: 'プラチナバッジ',
    description: '問題集の100%の音声で正解（全音声制覇）',
    emoji: '💎',
    threshold: 100,
    requiredAccuracy: 0,
  },
]

// 音声ファイルデータ
export type AudioFile = {
  id: string
  bird_name: string
  file_path: string
  storage_url: string
  original_filename: string | null
  description: string | null
}

// 種ごとの正答率データ
export type SpeciesAccuracy = {
  species_name: string
  total_answers: number
  correct_answers: number
  accuracy_percent: number
}

// ユーザーのスコア統計
export type UserStats = {
  totalQuizzes: number
  totalCorrect: number
  totalQuestions: number
  overallAccuracy: number
  speciesAccuracies: SpeciesAccuracy[]
  earnedBadges: BadgeType[]
  nextBadge: Badge | null
  progressToNextBadge: number
}

/**
 * 種ごとの回答を保存
 */
export async function saveSpeciesAnswer(
  userId: string,
  speciesName: string,
  audioFileId: string,
  isCorrect: boolean
) {
  const supabase = createClient()
  
  const { error } = await supabase.from('species_answers').insert({
    user_id: userId,
    species_name: speciesName,
    audio_file_id: audioFileId,
    is_correct: isCorrect,
  })
  
  if (error) {
    console.error('Failed to save species answer:', error.message, error.code, error.details)
    // テーブルが存在しない場合のエラーメッセージ
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      console.warn('species_answers テーブルが存在しません。supabase/schema.sql を実行してください。')
    }
  }
  
  return { error }
}

/**
 * クイズのスコアを保存
 */
export async function saveQuizScore(
  userId: string,
  score: number,
  totalQuestions: number
) {
  const supabase = createClient()
  
  const { error } = await supabase.from('scores').insert({
    user_id: userId,
    score: score,
    total_questions: totalQuestions,
    correct_answers: score,
  })
  
  if (error) {
    console.error('Failed to save quiz score:', error)
  }
  
  return { error }
}

/**
 * ユーザーの種ごとの正答率を取得
 */
export async function getSpeciesAccuracies(userId: string): Promise<SpeciesAccuracy[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('species_answers')
    .select('species_name, is_correct')
    .eq('user_id', userId)
  
  if (error || !data) {
    console.error('Failed to get species accuracies:', error)
    return []
  }
  
  // 種ごとに集計
  const speciesMap = new Map<string, { correct: number; total: number }>()
  
  for (const answer of data) {
    const current = speciesMap.get(answer.species_name) || { correct: 0, total: 0 }
    current.total++
    if (answer.is_correct) {
      current.correct++
    }
    speciesMap.set(answer.species_name, current)
  }
  
  // 正答率を計算
  const accuracies: SpeciesAccuracy[] = []
  for (const [species_name, stats] of speciesMap) {
    accuracies.push({
      species_name,
      total_answers: stats.total,
      correct_answers: stats.correct,
      accuracy_percent: Math.round((stats.correct / stats.total) * 100 * 10) / 10,
    })
  }
  
  return accuracies.sort((a, b) => b.accuracy_percent - a.accuracy_percent)
}

/**
 * 獲得済みバッジを取得
 */
export async function getEarnedBadges(userId: string): Promise<BadgeType[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('user_badges')
    .select('badge_type')
    .eq('user_id', userId)
  
  if (error || !data) {
    console.error('Failed to get earned badges:', error)
    return []
  }
  
  return data.map(d => d.badge_type as BadgeType)
}

/**
 * バッジを付与
 */
export async function awardBadge(userId: string, badgeType: BadgeType) {
  const supabase = createClient()
  
  const { error } = await supabase.from('user_badges').upsert({
    user_id: userId,
    badge_type: badgeType,
  }, {
    onConflict: 'user_id,badge_type',
  })
  
  if (error) {
    console.error('Failed to award badge:', error)
  }
  
  return { error }
}

/**
 * バッジの獲得条件をチェックして付与
 */
export async function checkAndAwardBadges(userId: string): Promise<BadgeType[]> {
  const accuracies = await getSpeciesAccuracies(userId)
  const earnedBadges = await getEarnedBadges(userId)
  const newBadges: BadgeType[] = []
  
  // 正答率80%以上の種をカウント
  const highAccuracySpecies = accuracies.filter(a => a.accuracy_percent >= 80)
  const highAccuracyCount = highAccuracySpecies.length
  
  for (const badge of BADGES) {
    // 必要な種の数を計算
    const requiredCount = Math.ceil(TOTAL_SPECIES * (badge.threshold / 100))
    
    // 条件を満たしていて、まだ獲得していない場合
    if (highAccuracyCount >= requiredCount && !earnedBadges.includes(badge.type)) {
      await awardBadge(userId, badge.type)
      newBadges.push(badge.type)
    }
  }
  
  return newBadges
}

/**
 * ユーザーの統計情報を取得
 */
export async function getUserStats(userId: string): Promise<UserStats> {
  const supabase = createClient()
  
  // スコア履歴を取得
  const { data: scores } = await supabase
    .from('scores')
    .select('score, total_questions')
    .eq('user_id', userId)
  
  const totalQuizzes = scores?.length || 0
  const totalCorrect = scores?.reduce((sum, s) => sum + s.score, 0) || 0
  const totalQuestions = scores?.reduce((sum, s) => sum + s.total_questions, 0) || 0
  const overallAccuracy = totalQuestions > 0 
    ? Math.round((totalCorrect / totalQuestions) * 100 * 10) / 10 
    : 0
  
  // 種ごとの正答率
  const speciesAccuracies = await getSpeciesAccuracies(userId)
  
  // 獲得済みバッジ
  const earnedBadges = await getEarnedBadges(userId)
  
  // 次のバッジと進捗を計算
  const highAccuracyCount = speciesAccuracies.filter(a => a.accuracy_percent >= 80).length
  let nextBadge: Badge | null = null
  let progressToNextBadge = 0
  
  for (const badge of BADGES) {
    if (!earnedBadges.includes(badge.type)) {
      nextBadge = badge
      const requiredCount = Math.ceil(TOTAL_SPECIES * (badge.threshold / 100))
      progressToNextBadge = Math.min(100, Math.round((highAccuracyCount / requiredCount) * 100))
      break
    }
  }
  
  return {
    totalQuizzes,
    totalCorrect,
    totalQuestions,
    overallAccuracy,
    speciesAccuracies,
    earnedBadges,
    nextBadge,
    progressToNextBadge,
  }
}
/**
 * 問題集別のバッジを取得
 */
export async function getQuestionSetBadges(userId: string, questionSetId: string): Promise<BadgeType[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('user_badges')
    .select('badge_type')
    .eq('user_id', userId)
    .eq('question_set_id', questionSetId)
  
  if (error || !data) {
    console.error('Failed to get question set badges:', error)
    return []
  }
  
  return data.map(d => d.badge_type as BadgeType)
}

/**
 * 問題集別バッジを付与
 */
export async function awardQuestionSetBadge(userId: string, questionSetId: string, badgeType: BadgeType) {
  const supabase = createClient()
  
  const { error } = await supabase.from('user_badges').upsert({
    user_id: userId,
    badge_type: badgeType,
    question_set_id: questionSetId,
  }, {
    onConflict: 'user_id,badge_type,question_set_id',
  })
  
  if (error) {
    console.error('Failed to award question set badge:', error)
  }
  
  return { error }
}

/**
 * 問題集別のバッジ獲得条件をチェック
 * 音声ファイル単位での正解実績に基づいてバッジを付与
 */
export async function checkAndAwardQuestionSetBadges(
  userId: string, 
  questionSetId: string
): Promise<BadgeType[]> {
  const supabase = createClient()
  
  // 問題集内の音声ファイルIDを取得
  const { data: items } = await supabase
    .from('question_set_items')
    .select('audio_file_id')
    .eq('question_set_id', questionSetId)
  
  if (!items || items.length === 0) return []
  
  const audioFileIds = items.map(item => item.audio_file_id)
  const totalAudioCount = audioFileIds.length
  
  // ユーザーが正解した音声ファイルIDを取得（一度でも正解したもの）
  const { data: correctAnswers } = await supabase
    .from('species_answers')
    .select('audio_file_id')
    .eq('user_id', userId)
    .eq('is_correct', true)
    .in('audio_file_id', audioFileIds)
  
  // 重複を除去してユニークな正解音声数を取得
  const uniqueCorrectAudioIds = new Set(correctAnswers?.map(a => a.audio_file_id) || [])
  const correctCount = uniqueCorrectAudioIds.size
  
  // 成功率を計算
  const successRate = (correctCount / totalAudioCount) * 100
  
  const earnedBadges = await getQuestionSetBadges(userId, questionSetId)
  const newBadges: BadgeType[] = []
  
  // バッジ判定（60% / 70% / 80% / 100%）
  if (successRate >= 60 && !earnedBadges.includes('bronze')) {
    await awardQuestionSetBadge(userId, questionSetId, 'bronze')
    newBadges.push('bronze')
  }
  
  if (successRate >= 70 && !earnedBadges.includes('silver')) {
    await awardQuestionSetBadge(userId, questionSetId, 'silver')
    newBadges.push('silver')
  }
  
  if (successRate >= 80 && !earnedBadges.includes('gold')) {
    await awardQuestionSetBadge(userId, questionSetId, 'gold')
    newBadges.push('gold')
  }
  
  if (successRate >= 100 && !earnedBadges.includes('platinum')) {
    await awardQuestionSetBadge(userId, questionSetId, 'platinum')
    newBadges.push('platinum')
  }
  
  return newBadges
}

/**
 * 問題集別の統計情報を取得
 */
export async function getQuestionSetStats(userId: string, questionSetId: string): Promise<QuestionSetStats | null> {
  const supabase = createClient()
  
  // 問題集情報を取得
  const { data: questionSet } = await supabase
    .from('question_sets')
    .select('id, name')
    .eq('id', questionSetId)
    .single()
  
  if (!questionSet) return null
  
  // 問題集内の音声ファイルIDを取得
  const { data: items } = await supabase
    .from('question_set_items')
    .select('audio_file_id')
    .eq('question_set_id', questionSetId)
  
  const audioFileIds = items?.map(item => item.audio_file_id) || []
  const totalAudioFiles = audioFileIds.length
  
  if (totalAudioFiles === 0) {
    return {
      questionSetId,
      questionSetName: questionSet.name,
      totalAudioFiles: 0,
      correctAudioFiles: 0,
      successRate: 0,
      earnedBadges: [],
    }
  }
  
  // ユーザーが正解した音声ファイルIDを取得（一度でも正解したもの）
  const { data: correctAnswers } = await supabase
    .from('species_answers')
    .select('audio_file_id')
    .eq('user_id', userId)
    .eq('is_correct', true)
    .in('audio_file_id', audioFileIds)
  
  // 重複を除去してユニークな正解音声数を取得
  const uniqueCorrectAudioIds = new Set(correctAnswers?.map(a => a.audio_file_id) || [])
  const correctAudioFiles = uniqueCorrectAudioIds.size
  
  const successRate = Math.round((correctAudioFiles / totalAudioFiles) * 100 * 10) / 10
  
  const earnedBadges = await getQuestionSetBadges(userId, questionSetId)
  
  return {
    questionSetId,
    questionSetName: questionSet.name,
    totalAudioFiles,
    correctAudioFiles,
    successRate,
    earnedBadges,
  }
}

/**
 * 全ての問題集別統計を取得
 */
export async function getAllQuestionSetStats(userId: string): Promise<QuestionSetStats[]> {
  const supabase = createClient()
  
  // 公開問題集一覧を取得
  const { data: questionSets } = await supabase
    .from('question_sets')
    .select('id, name')
    .eq('is_public', true)
  
  if (!questionSets) return []
  
  const stats: QuestionSetStats[] = []
  for (const qs of questionSets) {
    const stat = await getQuestionSetStats(userId, qs.id)
    if (stat) {
      stats.push(stat)
    }
  }
  
  return stats
}

/**
 * 種ごとの音声ファイルを取得
 */
export async function getSpeciesAudioFiles(speciesName: string): Promise<AudioFile[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('audio_files')
    .select('id, bird_name, file_path, storage_url, original_filename, description')
    .eq('bird_name', speciesName)
    .eq('is_active', true)
    .order('file_path', { ascending: true })
  
  if (error || !data) {
    console.error('Failed to get species audio files:', error)
    return []
  }
  
  return data as AudioFile[]
}
