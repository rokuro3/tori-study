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
  TOTAL_SPECIES,
  getAllQuestionSetStats,
  QuestionSetStats,
  SpeciesAccuracy,
  getSpeciesAudioFiles,
  AudioFile
} from '@/lib/score/badge'

type PageMode = 'main' | 'species-detail'

export default function ScorePage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [questionSetStats, setQuestionSetStats] = useState<QuestionSetStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pageMode, setPageMode] = useState<PageMode>('main')
  const [selectedSpecies, setSelectedSpecies] = useState<SpeciesAccuracy | null>(null)

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
      
      // 問題集別バッジを取得
      const qsStats = await getAllQuestionSetStats(user.id)
      setQuestionSetStats(qsStats)
    } catch (err) {
      console.error('Failed to load stats:', err)
      setError('統計データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleSpeciesClick = (species: SpeciesAccuracy) => {
    setSelectedSpecies(species)
    setPageMode('species-detail')
  }

  const handleBackToMain = () => {
    setPageMode('main')
    setSelectedSpecies(null)
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

  if (pageMode === 'species-detail' && selectedSpecies) {
    return <SpeciesDetailPage species={selectedSpecies} onBack={handleBackToMain} />
  }

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
            {profile?.username && (
              <span className="font-medium">{profile.username}</span>
            )}
            {profile?.username && user?.email && ' • '}
            {user?.email && <span className="text-gray-500 dark:text-gray-500">{user.email}</span>}
          </p>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
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

        {/* 問題集別バッジ */}
        <QuestionSetBadgesSection questionSetStats={questionSetStats} />

        {/* 種ごとの正答率 */}
        <SpeciesListSection 
          speciesAccuracies={stats.speciesAccuracies} 
          onSpeciesClick={handleSpeciesClick}
        />

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

/**
 * 問題集別バッジセクション
 */
function QuestionSetBadgesSection({ questionSetStats }: { questionSetStats: QuestionSetStats[] }) {
  const activeQS = questionSetStats.filter(qs => qs.totalAudioFiles > 0)
  
  if (activeQS.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
          📚 問題集別バッジ
        </h2>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-2">📝</div>
          <p>問題集がまだありません</p>
          <p className="text-sm mt-1">管理画面で問題集を作成してください</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
        📚 問題集別バッジ
      </h2>
      
      <div className="space-y-4">
        {activeQS.map((qs) => (
          <div key={qs.questionSetId} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="mb-3">
              <div className="font-medium text-gray-800 dark:text-white text-lg mb-2">
                {qs.questionSetName}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <span>正解音声: {qs.correctAudioFiles} / {qs.totalAudioFiles}</span>
                <span className="font-bold text-green-600 dark:text-green-400">達成率: {qs.successRate}%</span>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {BADGES.map((badge) => {
                const earned = qs.earnedBadges.includes(badge.type)
                return (
                  <div key={badge.type} className={`text-center p-3 rounded-lg transition-all ${
                    earned 
                      ? 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20' 
                      : 'bg-gray-50 dark:bg-gray-700'
                  }`}>
                    <div className={`text-3xl mb-1 ${earned ? '' : 'opacity-30'}`}>
                      {badge.emoji}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {earned ? '取得済' : `${badge.threshold}%`}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * 種ごとのリスト表示
 */
function SpeciesListSection({
  speciesAccuracies,
  onSpeciesClick,
}: {
  speciesAccuracies: SpeciesAccuracy[]
  onSpeciesClick: (species: SpeciesAccuracy) => void
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
        🐦 種ごとの成績
      </h2>
      
      {speciesAccuracies.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-2">📝</div>
          <p>まだ回答履歴がありません</p>
          <p className="text-sm">クイズに挑戦して記録を作りましょう！</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {speciesAccuracies.map((species) => (
            <button
              key={species.species_name}
              onClick={() => onSpeciesClick(species)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left"
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
              <div className="flex items-center gap-2">
                <div className={`text-lg font-bold ${
                  species.accuracy_percent >= 80 
                    ? 'text-green-600 dark:text-green-400' 
                    : species.accuracy_percent >= 50 
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-red-600 dark:text-red-400'
                }`}>
                  {species.accuracy_percent}%
                </div>
                <span className="text-gray-400">→</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * 種ごとの詳細ページ
 */
function SpeciesDetailPage({
  species,
  onBack,
}: {
  species: SpeciesAccuracy
  onBack: () => void
}) {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([])
  const [loadingAudio, setLoadingAudio] = useState(true)
  const [playingId, setPlayingId] = useState<string | null>(null)

  useEffect(() => {
    loadAudioFiles()
  }, [species.species_name])

  const loadAudioFiles = async () => {
    try {
      const files = await getSpeciesAudioFiles(species.species_name)
      setAudioFiles(files)
    } catch (err) {
      console.error('Failed to load audio files:', err)
    } finally {
      setLoadingAudio(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 mb-6 font-medium"
        >
          ← スコア画面に戻る
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
          <div className="text-center mb-6">
            <div className="text-5xl mb-4">🐦</div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
              {species.species_name}
            </h1>
            <div className={`text-2xl font-bold ${
              species.accuracy_percent >= 80 
                ? 'text-green-600 dark:text-green-400' 
                : species.accuracy_percent >= 50 
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-red-600 dark:text-red-400'
            }`}>
              {species.accuracy_percent}%
            </div>
          </div>

          {/* 統計情報 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-gray-700 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {species.total_answers}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">回答数</div>
            </div>
            <div className="bg-green-50 dark:bg-gray-700 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {species.correct_answers}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">正解数</div>
            </div>
          </div>

          {/* 音声ファイル一覧 */}
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
              🔊 音声ファイル
            </h2>
            
            {loadingAudio ? (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                <p className="text-gray-500 dark:text-gray-400 mt-2">読み込み中...</p>
              </div>
            ) : audioFiles.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 text-center">
                <div className="text-4xl mb-3">🔊</div>
                <p className="text-gray-600 dark:text-gray-400">
                  この種の音声ファイルはありません
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {audioFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <button
                      onClick={() => {
                        const audio = new Audio(file.storage_url)
                        setPlayingId(file.id)
                        audio.play().catch(err => console.error('Play error:', err))
                        audio.addEventListener('ended', () => setPlayingId(null))
                      }}
                      className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors"
                    >
                      {playingId === file.id ? '⏸' : '▶'}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 dark:text-white truncate">
                        {file.original_filename || file.file_path.split('/').pop() || 'Unknown'}
                      </div>
                      {file.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {file.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 戻るボタン */}
        <button
          onClick={onBack}
          className="w-full py-4 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors"
        >
          ← スコア画面に戻る
        </button>
      </div>
    </div>
  )
}
