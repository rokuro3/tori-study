'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// 鳥類目録のデータ型
export interface BirdData {
  number: string
  scientific_name: string
  japanese_name: string
  genus: string
  genus_jp: string
  family: string
  family_jp: string
  order: string
  order_jp: string
  is_subspecies: boolean
}

interface BirdSelectorProps {
  onSelect: (bird: BirdData | null) => void
  selectedBird?: BirdData | null
  placeholder?: string
  disabled?: boolean
}

export default function BirdSelector({
  onSelect,
  selectedBird,
  placeholder = '鳥の名前を入力して検索...',
  disabled = false
}: BirdSelectorProps) {
  const [birds, setBirds] = useState<BirdData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [filteredBirds, setFilteredBirds] = useState<BirdData[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // 鳥類目録データを読み込み
  useEffect(() => {
    async function loadMokuroku() {
      try {
        const response = await fetch('/data/mokuroku.json')
        const data: BirdData[] = await response.json()
        // 亜種を除外し、種のみを表示
        const species = data.filter(bird => !bird.is_subspecies)
        setBirds(species)
      } catch (error) {
        console.error('鳥類目録の読み込みに失敗しました:', error)
      } finally {
        setLoading(false)
      }
    }
    loadMokuroku()
  }, [])

  // 選択済みの鳥がある場合、テキストを更新
  useEffect(() => {
    if (selectedBird) {
      setSearchText(selectedBird.japanese_name)
    }
  }, [selectedBird])

  // 検索フィルタリング
  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredBirds([])
      return
    }

    const query = searchText.toLowerCase()
    const filtered = birds.filter(bird => 
      bird.japanese_name.toLowerCase().includes(query) ||
      bird.scientific_name.toLowerCase().includes(query) ||
      bird.family_jp.includes(query) ||
      bird.order_jp.includes(query)
    ).slice(0, 50) // 最大50件表示

    setFilteredBirds(filtered)
    setHighlightedIndex(-1)
  }, [searchText, birds])

  // クリック外で閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ハイライトされた項目をスクロールで表示
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('li')
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({
          block: 'nearest'
        })
      }
    }
  }, [highlightedIndex])

  const handleSelect = useCallback((bird: BirdData) => {
    setSearchText(bird.japanese_name)
    setShowDropdown(false)
    onSelect(bird)
  }, [onSelect])

  const handleClear = useCallback(() => {
    setSearchText('')
    onSelect(null)
    inputRef.current?.focus()
  }, [onSelect])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showDropdown || filteredBirds.length === 0) {
      if (e.key === 'ArrowDown' && filteredBirds.length > 0) {
        setShowDropdown(true)
        setHighlightedIndex(0)
        e.preventDefault()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev < filteredBirds.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0)
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < filteredBirds.length) {
          handleSelect(filteredBirds[highlightedIndex])
        }
        break
      case 'Escape':
        setShowDropdown(false)
        break
    }
  }, [showDropdown, filteredBirds, highlightedIndex, handleSelect])

  if (loading) {
    return (
      <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500">
        目録データを読み込み中...
      </div>
    )
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value)
            setShowDropdown(true)
            if (selectedBird && e.target.value !== selectedBird.japanese_name) {
              onSelect(null)
            }
          }}
          onFocus={() => {
            if (searchText.trim() !== '' && filteredBirds.length > 0) {
              setShowDropdown(true)
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        {searchText && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
          >
            ✕
          </button>
        )}
      </div>

      {/* ドロップダウンリスト */}
      {showDropdown && filteredBirds.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-1 max-h-64 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg"
        >
          {filteredBirds.map((bird, index) => (
            <li
              key={bird.number}
              onClick={() => handleSelect(bird)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`px-3 py-2 cursor-pointer ${
                index === highlightedIndex
                  ? 'bg-green-100 dark:bg-green-900'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-medium text-gray-800 dark:text-white">
                    {bird.japanese_name}
                  </span>
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 italic">
                    {bird.scientific_name}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {bird.order_jp} &gt; {bird.family_jp}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* 検索結果なしの表示 */}
      {showDropdown && searchText.trim() !== '' && filteredBirds.length === 0 && (
        <div className="absolute z-50 w-full mt-1 px-3 py-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg text-center text-gray-500 dark:text-gray-400">
          該当する鳥が見つかりません
        </div>
      )}
    </div>
  )
}
