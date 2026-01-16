'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { signOut } from '@/lib/supabase/auth'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800">
      {/* ヘッダー */}
      <header className="p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="text-2xl">🐦</div>
          <nav className="flex gap-4">
            {loading ? (
              <span className="text-gray-400">...</span>
            ) : user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
                >
                  ログアウト
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
                >
                  ログイン
                </Link>
                <Link
                  href="/signup"
                  className="text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                >
                  新規登録
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex flex-col items-center justify-center px-4 py-16">
        <div className="text-center max-w-2xl">
          {/* ロゴ・タイトル */}
          <div className="text-8xl mb-6">🐦</div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-4">
            とりスタディ
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            鳥の鳴き声を聞いて、名前を当てよう！
          </p>

          {/* 説明 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl mb-3">🎧</div>
                <h3 className="font-bold text-gray-800 dark:text-white mb-2">聞く</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  鳥の鳴き声を再生
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">🤔</div>
                <h3 className="font-bold text-gray-800 dark:text-white mb-2">考える</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  4つの選択肢から選ぶ
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">📚</div>
                <h3 className="font-bold text-gray-800 dark:text-white mb-2">学ぶ</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  解説で知識を深める
                </p>
              </div>
            </div>
          </div>

          {/* スタートボタン */}
          <Link
            href="/quiz"
            className="inline-block py-4 px-12 bg-green-600 hover:bg-green-700 text-white text-xl font-bold rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            🎮 クイズを始める
          </Link>

          {/* サブテキスト */}
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-500">
            {user ? 'スコアは自動的に記録されます' : 'ログインするとスコアが記録されます'}
          </p>
        </div>
      </main>

      {/* フッター */}
      <footer className="p-8 text-center text-gray-500 dark:text-gray-600 text-sm">
        <p>© 2026 とりスタディ</p>
      </footer>
    </div>
  )
}
