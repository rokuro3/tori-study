'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { isAdmin } from '@/lib/supabase/admin'

export default function AdminPage() {
  const { user, loading } = useAuth()
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function checkAdmin() {
      if (!user) {
        setChecking(false)
        return
      }
      
      const adminStatus = await isAdmin()
      setIsAdminUser(adminStatus)
      setChecking(false)
    }
    
    if (!loading) {
      checkAdmin()
    }
  }, [user, loading])

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-gray-600 dark:text-gray-400">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            ログインが必要です
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            管理画面にアクセスするにはログインしてください。
          </p>
          <Link
            href="/login"
            className="inline-block py-3 px-8 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full"
          >
            ログイン
          </Link>
        </div>
      </div>
    )
  }

  if (!isAdminUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md">
          <div className="text-6xl mb-4">⛔</div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            アクセス権限がありません
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            このページは管理者のみアクセスできます。
          </p>
          <Link
            href="/"
            className="inline-block py-3 px-8 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full"
          >
            トップに戻る
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800">
      {/* ヘッダー */}
      <header className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-2xl">🐦</Link>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">
              管理画面
            </h1>
          </div>
          <nav className="flex gap-4">
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
      <main className="max-w-6xl mx-auto p-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* 音声管理カード */}
          <Link href="/admin/audio" className="block">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow">
              <div className="text-5xl mb-4">🎵</div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                音声ファイル管理
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                鳥の鳴き声ファイルのアップロード・編集・削除
              </p>
            </div>
          </Link>

          {/* 問題集管理カード */}
          <Link href="/admin/questionsets" className="block">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow">
              <div className="text-5xl mb-4">📝</div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                問題集管理
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                クイズ・学習用の問題集の作成・編集
              </p>
            </div>
          </Link>

          {/* ユーザー管理カード（将来的に） */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 opacity-50 cursor-not-allowed">
            <div className="text-5xl mb-4">👥</div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              ユーザー管理
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              （準備中）ユーザー情報の管理
            </p>
          </div>

          {/* 統計カード */}
          <Link href="/admin/stats" className="block">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow">
              <div className="text-5xl mb-4">📊</div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                統計情報
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                全ユーザーの正答率ランキングと誤答傾向を確認
              </p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  )
}
