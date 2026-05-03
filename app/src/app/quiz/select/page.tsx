'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  QuestionSet,
  getPublicQuestionSets
} from '@/lib/supabase/admin'

export default function QuizSelectPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    let cancelled = false

    getPublicQuestionSets().then((sets) => {
      if (cancelled) return

      setQuestionSets(sets)
      setLoadingData(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  function startQuiz(setId: string | null, setName?: string) {
    if (setId) {
      const params = new URLSearchParams()
      params.append('questionSetId', setId)
      if (setName) params.append('name', setName)
      router.push(`/quiz?${params.toString()}`)
    } else {
      router.push('/quiz')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800">
      {/* ヘッダー */}
      <header className="p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="text-2xl">🐦</div>
          <nav>
            <Link
              href="/"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
            >
              トップに戻る
            </Link>
          </nav>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center max-w-2xl w-full">
          <div className="text-8xl mb-6">🎮</div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-4">
            クイズモード
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            問題集を選んでクイズに挑戦しましょう
          </p>

          {/* 全ての鳥からランダムで出題 */}
          <button
            onClick={() => startQuiz(null)}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-2xl shadow-xl p-6 mb-6 transition-all hover:shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <h2 className="text-xl font-bold mb-1">
                  🎲 ランダムチャレンジ
                </h2>
                <p className="text-sm opacity-90">
                  全ての鳥からランダムに出題
                </p>
              </div>
              <div className="text-3xl">→</div>
            </div>
          </button>

          {/* 問題集一覧 */}
          {loadingData ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">読み込み中...</p>
            </div>
          ) : questionSets.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              <p className="text-gray-600 dark:text-gray-400">
                問題集はまだ作成されていません。<br />
                ランダムチャレンジをお試しください。
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 text-left mb-2">
                または問題集から選択:
              </p>
              {questionSets.map((set) => (
                <button
                  key={set.id}
                  onClick={() => startQuiz(set.id, set.name)}
                  className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-shadow text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">
                        {set.name}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {set.description || '説明なし'}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-yellow-500">
                          {'★'.repeat(set.difficulty_level)}{'☆'.repeat(3 - set.difficulty_level)}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {set.difficulty_level === 1 ? '初級' : set.difficulty_level === 2 ? '中級' : '上級'}
                        </span>
                      </div>
                    </div>
                    <div className="text-3xl">→</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* サブテキスト */}
          <p className="mt-8 text-sm text-gray-500 dark:text-gray-500">
            {user ? 'スコアは自動的に記録されます' : 'ログインするとスコアが記録されます'}
          </p>
        </div>
      </main>
    </div>
  )
}
