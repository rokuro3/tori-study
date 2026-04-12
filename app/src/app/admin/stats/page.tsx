'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { isAdmin } from '@/lib/supabase/admin'
import {
  AudioRankingItem,
  GlobalQuizStats,
  SpeciesRankingItem,
  getGlobalQuizStats,
} from '@/lib/admin/global-stats'

function AccuracyBadge({ value }: { value: number }) {
  const color = value >= 80
    ? 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30'
    : value >= 50
      ? 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/30'
      : 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30'

  return (
    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${color}`}>
      {value}%
    </span>
  )
}

function ConfusionList({ items }: { items: Array<{ mistaken_for: string; count: number }> }) {
  if (items.length === 0) {
    return <p className="text-xs text-gray-500 dark:text-gray-500">誤答先データなし</p>
  }

  return (
    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
      {items.slice(0, 3).map((item, idx) => (
        <p key={`${item.mistaken_for}-${idx}`}>
          {idx + 1}. {item.mistaken_for} ({item.count}回)
        </p>
      ))}
    </div>
  )
}

function SpeciesRankingTable({
  title,
  rows,
  showConfusions,
}: {
  title: string
  rows: SpeciesRankingItem[]
  showConfusions: boolean
}) {
  return (
    <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-5">
      <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">データがありません</p>
      ) : (
        <div className="space-y-3">
          {rows.map((item, idx) => (
            <div key={`${item.species_name}-${idx}`} className="border border-gray-200 dark:border-gray-700 rounded-xl p-3">
              <div className="flex justify-between items-center gap-3 mb-2">
                <p className="text-sm font-medium text-gray-800 dark:text-white">
                  {idx + 1}. {item.species_name}
                </p>
                <AccuracyBadge value={item.accuracy_percent} />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                正解 {item.correct_answers} / 回答 {item.total_answers}
              </p>
              {showConfusions && <ConfusionList items={item.top_confusions} />}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function AudioRankingTable({
  title,
  rows,
  showConfusions,
}: {
  title: string
  rows: AudioRankingItem[]
  showConfusions: boolean
}) {
  return (
    <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-5">
      <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">データがありません</p>
      ) : (
        <div className="space-y-3">
          {rows.map((item, idx) => (
            <div key={`${item.audio_file_id}-${idx}`} className="border border-gray-200 dark:border-gray-700 rounded-xl p-3">
              <div className="flex justify-between items-center gap-3 mb-2">
                <p className="text-sm font-medium text-gray-800 dark:text-white">
                  {idx + 1}. {item.label}
                </p>
                <AccuracyBadge value={item.accuracy_percent} />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                正解 {item.correct_answers} / 回答 {item.total_answers}
              </p>
              {showConfusions && <ConfusionList items={item.top_confusions} />}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default function AdminStatsPage() {
  const { user, loading } = useAuth()
  const [checking, setChecking] = useState(true)
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [stats, setStats] = useState<GlobalQuizStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      if (!user) {
        setChecking(false)
        return
      }

      const admin = await isAdmin()
      setIsAdminUser(admin)
      setChecking(false)

      if (!admin) return

      try {
        const data = await getGlobalQuizStats()
        setStats(data)
      } catch (err) {
        const message = err instanceof Error ? err.message : '統計取得に失敗しました'
        setError(message)
      }
    }

    if (!loading) {
      init()
    }
  }, [user, loading])

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">読み込み中...</p>
      </div>
    )
  }

  if (!user || !isAdminUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
        <div className="text-center bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">アクセス権限がありません</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-5">このページは管理者のみ閲覧できます。</p>
          <Link href="/admin" className="inline-block py-3 px-7 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full">
            管理画面に戻る
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800">
      <header className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-2xl">📊</Link>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">全ユーザー統計</h1>
          </div>
          <Link href="/admin" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white">
            管理画面に戻る
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-5">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-2">集計概要</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            全期間の回答データを集計しています。対象回答数: {stats?.totalAnswers ?? 0}
          </p>
          {error && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </section>

        {stats && (
          <div className="grid lg:grid-cols-2 gap-6">
            <SpeciesRankingTable
              title="全期間の正答率が低い種類 Top10"
              rows={stats.lowAccuracySpeciesTop10}
              showConfusions={true}
            />
            <AudioRankingTable
              title="全期間の正答率が低い音声 Top10"
              rows={stats.lowAccuracyAudioTop10}
              showConfusions={true}
            />
            <SpeciesRankingTable
              title="全期間の正答率が高い種類 Top10"
              rows={stats.highAccuracySpeciesTop10}
              showConfusions={false}
            />
            <AudioRankingTable
              title="全期間の正答率が高い音声 Top10"
              rows={stats.highAccuracyAudioTop10}
              showConfusions={false}
            />
          </div>
        )}
      </main>
    </div>
  )
}
