'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import {
  AudioFile,
  isAdmin,
  getAudioFiles,
  addAudioFile,
  updateAudioFile,
  deleteAudioFile
} from '@/lib/supabase/admin'
import BirdSelector, { BirdData } from '@/components/BirdSelector'

export default function AudioManagementPage() {
  const { user, loading } = useAuth()
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [checking, setChecking] = useState(true)
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingFile, setEditingFile] = useState<AudioFile | null>(null)
  const [uploadProgress, setUploadProgress] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const audioRef = useRef<HTMLAudioElement>(null)

  // フォーム状態
  const [formData, setFormData] = useState({
    bird_name: '',
    scientific_name: '',
    family_jp: '',
    order_jp: '',
    genus_jp: '',
    description: ''
  })
  const [selectedBird, setSelectedBird] = useState<BirdData | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

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
        loadAudioFiles()
      }
    }
    
    if (!loading) {
      checkAdmin()
    }
  }, [user, loading])

  async function loadAudioFiles() {
    setLoadingFiles(true)
    const files = await getAudioFiles()
    setAudioFiles(files)
    setLoadingFiles(false)
  }

  function handlePlayAudio(file: AudioFile) {
    if (audioRef.current) {
      if (playingId === file.id) {
        audioRef.current.pause()
        setPlayingId(null)
      } else {
        audioRef.current.src = file.storage_url
        audioRef.current.play()
        setPlayingId(file.id)
      }
    }
  }

  async function handleUpload() {
    if (!selectedFile || !formData.bird_name) {
      alert('鳥の名前とファイルを選択してください')
      return
    }

    setUploadProgress(true)
    
    const result = await addAudioFile(selectedFile, formData.bird_name, {
      scientific_name: formData.scientific_name || null,
      family_jp: formData.family_jp || null,
      order_jp: formData.order_jp || null,
      genus_jp: formData.genus_jp || null,
      description: formData.description || null
    })

    setUploadProgress(false)

    if (result) {
      setShowUploadModal(false)
      setFormData({
        bird_name: '',
        scientific_name: '',
        family_jp: '',
        order_jp: '',
        genus_jp: '',
        description: ''
      })
      setSelectedFile(null)
      loadAudioFiles()
    } else {
      alert('アップロードに失敗しました')
    }
  }

  async function handleUpdate() {
    if (!editingFile) return

    const result = await updateAudioFile(editingFile.id, {
      bird_name: formData.bird_name,
      scientific_name: formData.scientific_name || null,
      family_jp: formData.family_jp || null,
      order_jp: formData.order_jp || null,
      genus_jp: formData.genus_jp || null,
      description: formData.description || null
    })

    if (result) {
      setShowEditModal(false)
      setEditingFile(null)
      loadAudioFiles()
    } else {
      alert('更新に失敗しました')
    }
  }

  async function handleDelete(file: AudioFile) {
    if (!confirm(`「${file.bird_name}」の音声ファイルを削除しますか？`)) {
      return
    }

    const result = await deleteAudioFile(file.id)
    if (result) {
      loadAudioFiles()
    } else {
      alert('削除に失敗しました')
    }
  }

  function openEditModal(file: AudioFile) {
    setEditingFile(file)
    setFormData({
      bird_name: file.bird_name,
      scientific_name: file.scientific_name || '',
      family_jp: file.family_jp || '',
      order_jp: file.order_jp || '',
      genus_jp: file.genus_jp || '',
      description: file.description || ''
    })
    // 編集モーダルでは選択状態をリセット
    setSelectedBird(null)
    setShowEditModal(true)
  }

  // 鳥類目録から選択時に自動入力
  function handleBirdSelect(bird: BirdData | null) {
    setSelectedBird(bird)
    if (bird) {
      setFormData(prev => ({
        ...prev,
        bird_name: bird.japanese_name,
        scientific_name: bird.scientific_name,
        family_jp: bird.family_jp,
        order_jp: bird.order_jp,
        genus_jp: bird.genus_jp
      }))
    }
  }

  // フィルタリング
  const filteredFiles = audioFiles.filter(file => 
    file.bird_name.toLowerCase().includes(filter.toLowerCase()) ||
    (file.scientific_name && file.scientific_name.toLowerCase().includes(filter.toLowerCase()))
  )

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800">
      {/* ヘッダー */}
      <header className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-2xl">🐦</Link>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">
              音声ファイル管理
            </h1>
          </div>
          <button
            onClick={() => {
              setFormData({
                bird_name: '',
                scientific_name: '',
                family_jp: '',
                order_jp: '',
                genus_jp: '',
                description: ''
              })
              setSelectedFile(null)
              setSelectedBird(null)
              setShowUploadModal(true)
            }}
            className="py-2 px-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg"
          >
            ＋ 新規アップロード
          </button>
        </div>
      </header>

      {/* 音声プレイヤー（非表示） */}
      <audio 
        ref={audioRef} 
        onEnded={() => setPlayingId(null)}
        className="hidden"
      />

      {/* メインコンテンツ */}
      <main className="max-w-6xl mx-auto p-6">
        {/* 検索フィルター */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="鳥の名前で検索..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full md:w-64 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* ファイル一覧 */}
        {loadingFiles ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">読み込み中...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
            <div className="text-6xl mb-4">📁</div>
            <p className="text-gray-600 dark:text-gray-400">
              {filter ? '該当する音声ファイルがありません' : '音声ファイルがまだありません'}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">鳥の名前</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 hidden md:table-cell">学名</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 hidden md:table-cell">科</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 hidden md:table-cell">状態</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600 dark:text-gray-300">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredFiles.map((file) => (
                  <tr key={file.id} className={!file.is_active ? 'opacity-50' : ''}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800 dark:text-white">{file.bird_name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                        {file.original_filename}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hidden md:table-cell">
                      {file.scientific_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hidden md:table-cell">
                      {file.family_jp || '-'}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        file.is_active 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {file.is_active ? '有効' : '無効'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handlePlayAudio(file)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg"
                          title="再生"
                        >
                          {playingId === file.id ? '⏹️' : '▶️'}
                        </button>
                        <button
                          onClick={() => openEditModal(file)}
                          className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900 rounded-lg"
                          title="編集"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(file)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg"
                          title="削除"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          全 {filteredFiles.length} 件
        </div>
      </main>

      {/* アップロードモーダル */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
                新規音声ファイルアップロード
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    音声ファイル *
                  </label>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    鳥の名前 * （目録から選択）
                  </label>
                  <BirdSelector
                    onSelect={handleBirdSelect}
                    selectedBird={selectedBird}
                    placeholder="鳥の名前を入力して検索..."
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    目録から選択すると学名・科・目などが自動入力されます
                  </p>
                </div>

                {/* 自動入力される情報（読み取り専用表示） */}
                {selectedBird && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="text-sm text-green-800 dark:text-green-200 font-medium mb-2">
                      ✓ 目録から自動入力
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">学名:</span>{' '}
                        <span className="italic">{formData.scientific_name}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">目:</span>{' '}
                        {formData.order_jp}
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">科:</span>{' '}
                        {formData.family_jp}
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">属:</span>{' '}
                        {formData.genus_jp}
                      </div>
                    </div>
                  </div>
                )}

                {/* 目録にない場合の手動入力オプション */}
                {!selectedBird && formData.bird_name && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="text-sm text-yellow-800 dark:text-yellow-200">
                      目録に該当する鳥が見つからない場合は、以下に手動で入力してください
                    </div>
                  </div>
                )}

                {/* 手動入力フィールド（目録から選択されていない場合のみ編集可能） */}
                <div className={selectedBird ? 'hidden' : ''}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      学名
                    </label>
                    <input
                      type="text"
                      value={formData.scientific_name}
                      onChange={(e) => setFormData({ ...formData, scientific_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      placeholder="例: Passer montanus"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        科（日本語）
                      </label>
                      <input
                        type="text"
                        value={formData.family_jp}
                        onChange={(e) => setFormData({ ...formData, family_jp: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        placeholder="例: スズメ科"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        目（日本語）
                      </label>
                      <input
                        type="text"
                        value={formData.order_jp}
                        onChange={(e) => setFormData({ ...formData, order_jp: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        placeholder="例: スズメ目"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      属（日本語）
                    </label>
                    <input
                      type="text"
                      value={formData.genus_jp}
                      onChange={(e) => setFormData({ ...formData, genus_jp: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      placeholder="例: スズメ属"
                    />
                  </div>
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
                    placeholder="この音声についての説明..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  disabled={uploadProgress}
                >
                  キャンセル
                </button>
                <button
                  onClick={handleUpload}
                  className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg disabled:opacity-50"
                  disabled={uploadProgress || !selectedFile || !formData.bird_name}
                >
                  {uploadProgress ? 'アップロード中...' : 'アップロード'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 編集モーダル */}
      {showEditModal && editingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
                音声ファイル編集
              </h2>
              
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  ファイル: {editingFile.original_filename}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    鳥の名前 *（目録から選択または手動入力）
                  </label>
                  <BirdSelector
                    onSelect={handleBirdSelect}
                    selectedBird={selectedBird}
                    placeholder="鳥の名前を入力して検索..."
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    目録から選択すると学名・科・目などが自動入力されます
                  </p>
                </div>

                {/* 自動入力された情報の表示 */}
                {selectedBird && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="text-sm text-green-800 dark:text-green-200 font-medium mb-2">
                      ✓ 目録から自動入力
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">学名:</span>{' '}
                        <span className="italic">{formData.scientific_name}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">目:</span>{' '}
                        {formData.order_jp}
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">科:</span>{' '}
                        {formData.family_jp}
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">属:</span>{' '}
                        {formData.genus_jp}
                      </div>
                    </div>
                  </div>
                )}

                {/* 手動入力フィールド */}
                {!selectedBird && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        学名
                      </label>
                      <input
                        type="text"
                        value={formData.scientific_name}
                        onChange={(e) => setFormData({ ...formData, scientific_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          科（日本語）
                        </label>
                        <input
                          type="text"
                          value={formData.family_jp}
                          onChange={(e) => setFormData({ ...formData, family_jp: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          目（日本語）
                        </label>
                        <input
                          type="text"
                          value={formData.order_jp}
                          onChange={(e) => setFormData({ ...formData, order_jp: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        属（日本語）
                      </label>
                      <input
                        type="text"
                        value={formData.genus_jp}
                        onChange={(e) => setFormData({ ...formData, genus_jp: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    説明
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingFile(null)
                    setSelectedBird(null)
                  }}
                  className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleUpdate}
                  className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg disabled:opacity-50"
                  disabled={!formData.bird_name}
                >
                  更新
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
