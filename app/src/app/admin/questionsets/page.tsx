'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import {
  QuestionSet,
  QuestionSetWithItems,
  AudioFile,
  isAdmin,
  getQuestionSets,
  getQuestionSetWithItems,
  createQuestionSet,
  updateQuestionSet,
  deleteQuestionSet,
  addItemToQuestionSet,
  removeItemFromQuestionSet,
  getActiveAudioFiles
} from '@/lib/supabase/admin'

type ViewMode = 'list' | 'edit'

export default function QuestionSetsPage() {
  const { user, loading } = useAuth()
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [checking, setChecking] = useState(true)
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [showCreateModal, setShowCreateModal] = useState(false)
  
  // 編集用の状態
  const [editingSet, setEditingSet] = useState<QuestionSetWithItems | null>(null)
  const [availableAudioFiles, setAvailableAudioFiles] = useState<AudioFile[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // フォーム状態
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    difficulty_level: 1,
    is_public: true
  })

  useEffect(() => {
    async function checkAdmin() {
      if (!user) {
        setChecking(false)
        return
      }
      
      const adminStatus = await isAdmin()
      setIsAdminUser(adminStatus)
      setChecking(false)
      
      if (adminStatus) {
        loadQuestionSets()
      }
    }
    
    if (!loading) {
      checkAdmin()
    }
  }, [user, loading])

  async function loadQuestionSets() {
    setLoadingData(true)
    const sets = await getQuestionSets()
    setQuestionSets(sets)
    setLoadingData(false)
  }

  async function handleCreate() {
    if (!formData.name) {
      alert('問題集名を入力してください')
      return
    }

    const result = await createQuestionSet(
      formData.name,
      formData.description || null,
      formData.difficulty_level,
      formData.is_public
    )

    if (result) {
      setShowCreateModal(false)
      setFormData({
        name: '',
        description: '',
        difficulty_level: 1,
        is_public: true
      })
      loadQuestionSets()
    } else {
      alert('作成に失敗しました')
    }
  }

  async function handleDelete(set: QuestionSet) {
    if (!confirm(`「${set.name}」を削除しますか？\n含まれる問題も全て削除されます。`)) {
      return
    }

    const result = await deleteQuestionSet(set.id)
    if (result) {
      loadQuestionSets()
    } else {
      alert('削除に失敗しました')
    }
  }

  async function openEditMode(set: QuestionSet) {
    setLoadingData(true)
    
    const [setWithItems, audioFiles] = await Promise.all([
      getQuestionSetWithItems(set.id),
      getActiveAudioFiles()
    ])
    
    if (setWithItems) {
      setEditingSet(setWithItems)
      setAvailableAudioFiles(audioFiles)
      setViewMode('edit')
    } else {
      alert('問題集の読み込みに失敗しました')
    }
    
    setLoadingData(false)
  }

  async function handleAddAudio(audioFile: AudioFile) {
    if (!editingSet) return
    
    // 既に追加済みか確認
    const exists = editingSet.items.some(item => item.audio_file_id === audioFile.id)
    if (exists) {
      alert('この音声は既に追加されています')
      return
    }

    const result = await addItemToQuestionSet(
      editingSet.id,
      audioFile.id,
      editingSet.items.length
    )

    if (result) {
      // 再読み込み
      const updated = await getQuestionSetWithItems(editingSet.id)
      if (updated) {
        setEditingSet(updated)
      }
    } else {
      alert('追加に失敗しました')
    }
  }

  async function handleRemoveAudio(audioFileId: string) {
    if (!editingSet) return

    const result = await removeItemFromQuestionSet(editingSet.id, audioFileId)

    if (result) {
      // 再読み込み
      const updated = await getQuestionSetWithItems(editingSet.id)
      if (updated) {
        setEditingSet(updated)
      }
    } else {
      alert('削除に失敗しました')
    }
  }

  function handlePlayAudio(audioFile: AudioFile) {
    if (audioRef.current) {
      if (playingId === audioFile.id) {
        audioRef.current.pause()
        setPlayingId(null)
      } else {
        audioRef.current.src = audioFile.storage_url
        audioRef.current.play()
        setPlayingId(audioFile.id)
      }
    }
  }

  async function handleUpdateSet() {
    if (!editingSet) return

    const result = await updateQuestionSet(editingSet.id, {
      name: formData.name || editingSet.name,
      description: formData.description || editingSet.description,
      difficulty_level: formData.difficulty_level,
      is_public: formData.is_public
    })

    if (result) {
      loadQuestionSets()
      alert('更新しました')
    } else {
      alert('更新に失敗しました')
    }
  }

  function handleDownloadSetCSV() {
    if (!editingSet) return

    const items = editingSet.items || []
    if (items.length === 0) {
      alert('ダウンロードできる音声データがありません')
      return
    }

    const headers = ['問題集名', '鳥類名', '科名', '説明']
    const rows = items.map(item => {
      const audioFile = item.audio_file
      return [
        `"${editingSet.name.replace(/"/g, '""')}"`,
        `"${(audioFile?.bird_name || '').replace(/"/g, '""')}"`,
        `"${(audioFile?.family_jp || '').replace(/"/g, '""')}"`,
        `"${(audioFile?.description || '').replace(/"/g, '""')}"`
      ]
    })

    const csv = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(r => r.join(','))
    ].join('\n')

    const bom = new Uint8Array([0xEF, 0xBB, 0xBF])
    const blob = new Blob([bom, csv], { type: 'text/csv;charset=utf-8;' })

    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `questionset_${editingSet.name}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  async function handleDownloadCSV() {
    if (questionSets.length === 0) {
      alert('ダウンロードする問題集がありません')
      return
    }

    // CSVヘッダー（問題集内の音声情報）
    const headers = ['問題集名', '鳥類名', '科名', '説明']

    // CSVデータを生成（問題集ごとに音声を展開）
    const rows = (
      await Promise.all(
        questionSets.map(async (set) => {
          const setWithItems = await getQuestionSetWithItems(set.id)
          const items = setWithItems?.items || []

          return items.map(item => {
            const audioFile = item.audio_file
            return [
              `"${set.name.replace(/"/g, '""')}"`,
              `"${(audioFile?.bird_name || '').replace(/"/g, '""')}"`,
              `"${(audioFile?.family_jp || '').replace(/"/g, '""')}"`,
              `"${(audioFile?.description || '').replace(/"/g, '""')}"`
            ]
          })
        })
      )
    ).flat()

    if (rows.length === 0) {
      alert('ダウンロードできる音声データがありません')
      return
    }

    // CSV形式でファイルを生成
    const csv = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(r => r.join(','))
    ].join('\n')

    // BOMを追加（Excelでの文字化け対策）
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF])
    const blob = new Blob([bom, csv], { type: 'text/csv;charset=utf-8;' })
    
    // ダウンロード実行
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `questionsets_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // フィルタリング（追加可能な音声）
  const filteredAudioFiles = availableAudioFiles.filter(file => {
    const alreadyAdded = editingSet?.items.some(item => item.audio_file_id === file.id)
    const matchesSearch = file.bird_name.toLowerCase().includes(searchTerm.toLowerCase())
    return !alreadyAdded && matchesSearch
  })

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

  if (!user || !isAdminUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md">
          <div className="text-6xl mb-4">⛔</div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            アクセス権限がありません
          </h1>
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

  // 編集モード
  if (viewMode === 'edit' && editingSet) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800">
        {/* ヘッダー */}
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => {
                  setViewMode('list')
                  setEditingSet(null)
                }}
                className="text-2xl"
              >
                ←
              </button>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                問題集編集: {editingSet.name}
              </h1>
            </div>
            <button
              onClick={handleDownloadSetCSV}
              className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg"
              title="この問題集の音声一覧をCSVでダウンロード"
            >
              ⬇️ CSV
            </button>
          </div>
        </header>

        {/* 音声プレイヤー（非表示） */}
        <audio 
          ref={audioRef} 
          onEnded={() => setPlayingId(null)}
          className="hidden"
        />

        <main className="max-w-6xl mx-auto p-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* 左側: 問題集の音声一覧 */}
            <div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                📝 問題集の内容（{editingSet.items.length}件）
              </h2>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4">
                {editingSet.items.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    音声がまだ追加されていません
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {editingSet.items.map((item, index) => (
                      <li 
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-gray-400 text-sm">{index + 1}</span>
                          <div className="flex-1">
                            <div className="font-medium text-gray-800 dark:text-white">
                              {item.audio_file?.bird_name || '不明'}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {item.audio_file?.family_jp}
                              {item.audio_file?.family_jp && item.audio_file?.description && ' • '}
                              {item.audio_file?.description}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {item.audio_file && (
                            <button
                              onClick={() => handlePlayAudio(item.audio_file!)}
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg"
                            >
                              {playingId === item.audio_file.id ? '⏹️' : '▶️'}
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveAudio(item.audio_file_id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg"
                          >
                            ✕
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* 右側: 追加可能な音声 */}
            <div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                🎵 追加可能な音声
              </h2>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="鳥の名前で検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 max-h-[500px] overflow-y-auto">
                {filteredAudioFiles.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    追加可能な音声がありません
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {filteredAudioFiles.map((file) => (
                      <li 
                        key={file.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-800 dark:text-white">
                            {file.bird_name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {file.family_jp}
                            {file.family_jp && file.description && ' • '}
                            {file.description}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handlePlayAudio(file)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg"
                          >
                            {playingId === file.id ? '⏹️' : '▶️'}
                          </button>
                          <button
                            onClick={() => handleAddAudio(file)}
                            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900 rounded-lg"
                          >
                            ＋
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // リストモード
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800">
      {/* ヘッダー */}
      <header className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-2xl">🐦</Link>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">
              問題集管理
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadCSV}
              disabled={questionSets.length === 0}
              className="py-2 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-lg flex items-center gap-2"
              title="問題集の一覧をCSVでダウンロード"
            >
              ⬇️ CSV
            </button>
            <button
              onClick={() => {
                setFormData({
                  name: '',
                  description: '',
                  difficulty_level: 1,
                  is_public: true
                })
                setShowCreateModal(true)
              }}
              className="py-2 px-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg"
            >
              ＋ 新規作成
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-6xl mx-auto p-6">
        {loadingData ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">読み込み中...</p>
          </div>
        ) : questionSets.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-gray-600 dark:text-gray-400">
              問題集がまだありません
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {questionSets.map((set) => (
              <div 
                key={set.id} 
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                      {set.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {set.description || '説明なし'}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    set.is_public 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {set.is_public ? '公開' : '非公開'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    難易度:
                  </span>
                  <span className="text-yellow-500">
                    {'★'.repeat(set.difficulty_level)}{'☆'.repeat(3 - set.difficulty_level)}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEditMode(set)}
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(set)}
                    className="py-2 px-4 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 作成モーダル */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
                新規問題集作成
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    問題集名 *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="例: 初級編 - 身近な野鳥"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    説明
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    rows={3}
                    placeholder="この問題集の説明..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    難易度
                  </label>
                  <select
                    value={formData.difficulty_level}
                    onChange={(e) => setFormData({ ...formData, difficulty_level: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value={1}>★☆☆ 初級</option>
                    <option value={2}>★★☆ 中級</option>
                    <option value={3}>★★★ 上級</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_public"
                    checked={formData.is_public}
                    onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="is_public" className="text-sm text-gray-700 dark:text-gray-300">
                    公開する
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleCreate}
                  className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg disabled:opacity-50"
                  disabled={!formData.name}
                >
                  作成
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
