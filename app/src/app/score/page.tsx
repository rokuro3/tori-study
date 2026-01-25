'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { 
  getUserStats, 
  UserStats, 
  BADGES, 
  Badge,
  BadgeType,
  TOTAL_SPECIES 
} from '@/lib/score/badge'

export default function ScorePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push('/login')
      return
    }

    loadStats()
  }, [user, authLoading, router])

  const loadStats = async () => {
    if (!user) return

    try {
      const userStats = await getUserStats(user.id)
      setStats(userStats)
    } catch (err) {
      console.error('Failed to load stats:', err)
      setError('統計データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-600 dark:text-gray-400">読み込み中...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center max-w-md">
          <div className="text-4xl mb-4">😞</div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
            エラーが発生しました
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={loadStats}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
          >
            再試行
          </button>
        </div>
      </div>
    )
  }

  if (!stats) return null

  const highAccuracyCount = stats.speciesAccuracies.filter(a => a.accuracy_percent >= 80).length

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
            📊 スコア・バッジ
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            あなたの学習成果を確認しましょう
          </p>
        </div>

        {/* 全体統計 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
            📈 全体の成績
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 dark:bg-gray-700 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {stats.totalQuizzes}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">クイズ回数</div>
            </div>
            <div className="bg-blue-50 dark:bg-gray-700 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {stats.overallAccuracy}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">全体正答率</div>
            </div>
            <div className="bg-purple-50 dark:bg-gray-700 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {stats.totalCorrect}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">正解数</div>
            </div>
            <div className="bg-orange-50 dark:bg-gray-700 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                {highAccuracyCount}/{TOTAL_SPECIES}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">マスターした種</div>
            </div>
          </div>
        </div>

        {/* バッジ一覧 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
            🏆 バッジコレクション
          </h2>
          
          {/* 獲得済みバッジのみ表示 */}
          {stats.earnedBadges.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 mb-4">
              {BADGES.filter(badge => stats.earnedBadges.includes(badge.type)).map((badge) => {
                const requiredCount = Math.ceil(TOTAL_SPECIES * (badge.threshold / 100))
                
                return (
                  <div
                    key={badge.type}
                    className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-400 rounded-xl p-4 text-center"
                  >
                    <div className="text-4xl mb-2">
                      {badge.emoji}
                    </div>
                    <div className="font-bold text-gray-800 dark:text-white">
                      {badge.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {requiredCount}種で80%以上達成
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
                      ✓ 獲得済み
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400 mb-4">
              <div className="text-4xl mb-2">🎁</div>
              <p>まだバッジを獲得していません</p>
              <p className="text-sm mt-1">クイズを続けて隠されたバッジを発見しよう！</p>
            </div>
          )}

          {/* 未獲得バッジのヒント（詳細は隠す） */}
          {stats.earnedBadges.length < BADGES.length && (
            <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">❓</span>
                <div>
                  <div className="font-medium text-gray-700 dark:text-gray-300">
                    隠されたバッジ: {BADGES.length - stats.earnedBadges.length}個
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    学習を続けて条件を達成すると獲得できます
                  </div>
                </div>
              </div>
              
              {/* 進捗バー（次のバッジの詳細は隠す） */}
              {stats.nextBadge && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      次のバッジまでの進捗
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {stats.progressToNextBadge}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500"
                      style={{ width: `${stats.progressToNextBadge}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 種ごとの正答率 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
            🐦 種ごとの成績
          </h2>
          
          {stats.speciesAccuracies.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-2">📝</div>
              <p>まだ回答履歴がありません</p>
              <p className="text-sm">クイズに挑戦して記録を作りましょう！</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {stats.speciesAccuracies.map((species) => (
                <div
                  key={species.species_name}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-lg ${species.accuracy_percent >= 80 ? '✅' : '📌'}`}>
                      {species.accuracy_percent >= 80 ? '✅' : '📌'}
                    </span>
                    <div>
                      <div className="font-medium text-gray-800 dark:text-white">
                        {species.species_name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {species.correct_answers}/{species.total_answers}回正解
                      </div>
                    </div>
                  </div>
                  <div className={`text-lg font-bold ${
                    species.accuracy_percent >= 80 
                      ? 'text-green-600 dark:text-green-400' 
                      : species.accuracy_percent >= 50 
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-red-600 dark:text-red-400'
                  }`}>
                    {species.accuracy_percent}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* アクションボタン */}
        <div className="space-y-3">
          <Link
            href="/quiz"
            className="block w-full py-4 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl text-center transition-colors"
          >
            🎯 クイズに挑戦
          </Link>
          <Link
            href="/"
            className="block w-full py-4 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-medium rounded-xl text-center transition-colors"
          >
            🏠 ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  )
}
