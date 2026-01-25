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

export const BADGES: Badge[] = [
  {
    type: 'bronze',
    name: '銅バッジ',
    description: '25%の種で正答率80%以上を達成',
    emoji: '🥉',
    threshold: 25,
    requiredAccuracy: 80,
  },
  {
    type: 'silver',
    name: '銀バッジ',
    description: '50%の種で正答率80%以上を達成',
    emoji: '🥈',
    threshold: 50,
    requiredAccuracy: 80,
  },
  {
    type: 'gold',
    name: '金バッジ',
    description: '75%の種で正答率80%以上を達成',
    emoji: '🥇',
    threshold: 75,
    requiredAccuracy: 80,
  },
  {
    type: 'platinum',
    name: 'プラチナバッジ',
    description: '100%の種で正答率80%以上を達成',
    emoji: '💎',
    threshold: 100,
    requiredAccuracy: 80,
  },
]

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
  isCorrect: boolean
) {
  const supabase = createClient()
  
  const { error } = await supabase.from('species_answers').insert({
    user_id: userId,
    species_name: speciesName,
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
