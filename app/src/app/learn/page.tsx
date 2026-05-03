'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import {
  QuestionSet,
  QuestionSetWithItems,
  AudioFile,
  getPublicQuestionSets,
  getQuestionSetWithItems
} from '@/lib/supabase/admin'

type ViewMode = 'select' | 'learn'

// 鳥情報の型
interface BirdWithAudio {
  bird_name: string
  scientific_name: string | null
  family_jp: string | null
  audioFiles: AudioFile[]
}

interface PublicAudioSearchEntry {
  questionSetId: string
  questionSetName: string
  difficultyLevel: number
  audio: AudioFile
}

export default function LearnPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('select')
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([])
  const [selectedSet, setSelectedSet] = useState<QuestionSetWithItems | null>(null)
  const [audioSearchText, setAudioSearchText] = useState('')
  const [publicAudioEntries, setPublicAudioEntries] = useState<PublicAudioSearchEntry[]>([])
  const [loadingAudioIndex, setLoadingAudioIndex] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  async function loadPublicAudioEntries(sets: QuestionSet[]) {
    setLoadingAudioIndex(true)
    const detailedSets = await Promise.all(sets.map((set) => getQuestionSetWithItems(set.id)))

    const entries = detailedSets.flatMap((setWithItems) => {
      if (!setWithItems) return []

      return setWithItems.items
        .filter((item) => !!item.audio_file && item.audio_file.is_active)
        .map((item) => ({
          questionSetId: setWithItems.id,
          questionSetName: setWithItems.name,
          difficultyLevel: setWithItems.difficulty_level,
          audio: item.audio_file as AudioFile
        }))
    })

    setPublicAudioEntries(entries)
    setLoadingAudioIndex(false)
  }

  useEffect(() => {
    let cancelled = false

    getPublicQuestionSets().then(async (sets) => {
      if (cancelled) return

      setQuestionSets(sets)

      if (sets.length === 0) {
        setPublicAudioEntries([])
        setLoadingAudioIndex(false)
        setLoadingData(false)
        return
      }

      await loadPublicAudioEntries(sets)

      if (!cancelled) {
        setLoadingData(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  async function selectQuestionSet(set: QuestionSet) {
    setLoadingData(true)
    const setWithItems = await getQuestionSetWithItems(set.id)
    if (setWithItems) {
      setSelectedSet(setWithItems)
      setViewMode('learn')
    } else {
      alert('問題集の読み込みに失敗しました')
    }
    setLoadingData(false)
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

  const filteredAudioEntries = useMemo(() => {
    const text = audioSearchText.trim().toLowerCase()
    if (!text) return []

    const tokens = text.split(/\s+/).filter(Boolean)

    return publicAudioEntries
      .filter((entry) => {
        const target = [
          entry.audio.bird_name,
          entry.audio.scientific_name,
          entry.audio.family_jp,
          entry.audio.original_filename,
          entry.audio.description,
          entry.questionSetName
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return tokens.every((token) => target.includes(token))
      })
      .sort((a, b) => {
        if (a.audio.bird_name !== b.audio.bird_name) {
          return a.audio.bird_name.localeCompare(b.audio.bird_name, 'ja')
        }
        return a.questionSetName.localeCompare(b.questionSetName, 'ja')
      })
  }, [audioSearchText, publicAudioEntries])

  // 鳥ごとにグループ化
  function getBirdsFromItems(): BirdWithAudio[] {
    if (!selectedSet) return []
    
    const birdMap = new Map<string, BirdWithAudio>()
    
    for (const item of selectedSet.items) {
      if (!item.audio_file) continue
      
      const birdName = item.audio_file.bird_name
      if (!birdMap.has(birdName)) {
        birdMap.set(birdName, {
          bird_name: birdName,
          scientific_name: item.audio_file.scientific_name,
          family_jp: item.audio_file.family_jp,
          audioFiles: []
        })
      }
      birdMap.get(birdName)!.audioFiles.push(item.audio_file)
    }
    
    return Array.from(birdMap.values()).sort((a, b) => 
      a.bird_name.localeCompare(b.bird_name, 'ja')
    )
  }

  // 学習モード
  if (viewMode === 'learn' && selectedSet) {
    const birds = getBirdsFromItems()

    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
        {/* ヘッダー */}
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => {
                  setViewMode('select')
                  setSelectedSet(null)
                }}
                className="text-2xl hover:opacity-70"
              >
                ←
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                  {selectedSet.name}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  学習モード - {birds.length}種
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* 音声プレイヤー（非表示） */}
        <audio 
          ref={audioRef} 
          onEnded={() => setPlayingId(null)}
          className="hidden"
        />

        {/* メインコンテンツ */}
        <main className="max-w-4xl mx-auto p-6">
          {birds.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-600 dark:text-gray-400">
                この問題集には音声がまだ追加されていません
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {birds.map((bird) => (
                <div 
                  key={bird.bird_name}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden"
                >
                  {/* 鳥のヘッダー */}
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">🐦</div>
                      <div className="text-left flex-1">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                          {bird.bird_name}
                        </h2>
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          {bird.scientific_name && (
                            <span className="italic">{bird.scientific_name}</span>
                          )}
                          {bird.family_jp && (
                            <span>| {bird.family_jp}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {bird.audioFiles.length}件の音声
                      </span>
                    </div>
                  </div>

                  {/* 音声リスト（常時表示） */}
                  <div className="p-6 bg-gray-50 dark:bg-gray-750">
                    <div className="space-y-3">
                      {bird.audioFiles.map((audio, index) => (
                        <div 
                          key={audio.id}
                          className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl shadow"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <span className="text-gray-400 font-mono">{index + 1}</span>
                            <div className="flex-1">
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {audio.original_filename || `音声${index + 1}`}
                              </p>
                              {audio.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                  {audio.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handlePlayAudio(audio)}
                            className={`p-4 rounded-full transition-colors ${
                              playingId === audio.id
                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                            }`}
                          >
                            <span className="text-2xl">
                              {playingId === audio.id ? '⏹' : '▶'}
                            </span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    )
  }

  // 問題集選択画面
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
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

      {/* 音声プレイヤー（非表示） */}
      <audio
        ref={audioRef}
        onEnded={() => setPlayingId(null)}
        className="hidden"
      />

      {/* メインコンテンツ */}
      <main className="flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center max-w-2xl w-full">
          <div className="text-8xl mb-6">📚</div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-4">
            学習モード
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            問題集を選んで、鳥の鳴き声を学びましょう
          </p>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-5 mb-6 text-left">
            <label
              htmlFor="public-audio-search"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2"
            >
              公開問題集の音声を検索
            </label>
            <input
              id="public-audio-search"
              type="text"
              value={audioSearchText}
              onChange={(e) => setAudioSearchText(e.target.value)}
              placeholder="鳥名・学名・科名・ファイル名・説明で検索"
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {loadingAudioIndex ? (
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">検索インデックスを作成中...</p>
            ) : audioSearchText.trim() === '' ? (
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">キーワードを入力すると音声を絞り込めます。</p>
            ) : filteredAudioEntries.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">一致する音声が見つかりませんでした。</p>
            ) : (
              <div className="mt-4 space-y-3 max-h-80 overflow-y-auto pr-1">
                {filteredAudioEntries.slice(0, 30).map((entry) => (
                  <div
                    key={`${entry.questionSetId}-${entry.audio.id}`}
                    className="border border-gray-200 dark:border-gray-700 rounded-xl p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-100">{entry.audio.bird_name}</p>
                        {(entry.audio.scientific_name || entry.audio.family_jp) && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {entry.audio.scientific_name || ''}
                            {entry.audio.scientific_name && entry.audio.family_jp ? ' | ' : ''}
                            {entry.audio.family_jp || ''}
                          </p>
                        )}
                        {entry.audio.original_filename && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            ファイル名: {entry.audio.original_filename}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                          説明: {entry.audio.description || '無し'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          問題集: {entry.questionSetName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {'★'.repeat(entry.difficultyLevel)}{'☆'.repeat(3 - entry.difficultyLevel)}&nbsp;
                          {entry.difficultyLevel === 1 ? '初級' : entry.difficultyLevel === 2 ? '中級' : '上級'}
                        </p>
                      </div>
                      <button
                        onClick={() => handlePlayAudio(entry.audio)}
                        className={`shrink-0 px-3 py-2 rounded-lg text-sm text-white ${
                          playingId === entry.audio.id ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
                        }`}
                      >
                        {playingId === entry.audio.id ? '停止' : '再生'}
                      </button>
                    </div>
                    <div className="mt-3">
                      <button
                        onClick={() => {
                          const set = questionSets.find((item) => item.id === entry.questionSetId)
                          if (set) {
                            void selectQuestionSet(set)
                          }
                        }}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        この問題集を開く
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 問題集一覧 */}
          {loadingData ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">読み込み中...</p>
            </div>
          ) : questionSets.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-600 dark:text-gray-400">
                公開されている問題集がまだありません
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {questionSets.map((set) => (
                <button
                  key={set.id}
                  onClick={() => selectQuestionSet(set)}
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
        </div>
      </main>
    </div>
  )
}
