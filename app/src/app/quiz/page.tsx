'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { ApiQuizQuestion } from '@/lib/quiz/types'
import { fetchQuizQuestion, submitQuizAnswer } from '@/lib/quiz/api'
import { 
  saveSpeciesAnswer, 
  saveQuizScore, 
  checkAndAwardBadges,
  BadgeType,
  BADGES 
} from '@/lib/score/badge'

const TOTAL_QUESTIONS = 5

// 回答履歴（クイズセッション内で種ごとの回答を追跡）
type AnswerRecord = {
  species: string
  isCorrect: boolean
}

export default function QuizPage() {
  const router = useRouter()
  const { user } = useAuth()
  const audioRef = useRef<HTMLAudioElement>(null)
  
  const [currentQuestion, setCurrentQuestion] = useState<ApiQuizQuestion | null>(null)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [score, setScore] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [gameFinished, setGameFinished] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [answerRecords, setAnswerRecords] = useState<AnswerRecord[]>([])
  const [newBadges, setNewBadges] = useState<BadgeType[]>([])
  const [savingScore, setSavingScore] = useState(false)

  // 新しい問題を取得
  const loadNewQuestion = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setSelectedAnswer(null)
    setShowResult(false)
    setIsPlaying(false)

    try {
      const question = await fetchQuizQuestion()
      setCurrentQuestion(question)
      setQuestionNumber(prev => prev + 1)
    } catch (err) {
      console.error('Failed to load question:', err)
      setError(err instanceof Error ? err.message : '問題の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 初回問題生成
  useEffect(() => {
    loadNewQuestion()
  }, [loadNewQuestion])

  // 音声再生
  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  // 回答処理
  const handleAnswer = async (answer: string) => {
    if (showResult || !currentQuestion) return
    
    setSelectedAnswer(answer)
    
    try {
      const result = await submitQuizAnswer({
        question_id: currentQuestion.question_id,
        user_answer: answer,
      })
      
      const correct = result.is_correct
      setIsCorrect(correct)
      setShowResult(true)
      
      if (correct) {
        setScore(prev => prev + 1)
      }
      
      // 回答履歴を記録
      setAnswerRecords(prev => [...prev, {
        species: currentQuestion.correct_answer,
        isCorrect: correct,
      }])
      
      // ユーザーがログインしている場合、種ごとの回答を保存
      if (user) {
        await saveSpeciesAnswer(user.id, currentQuestion.correct_answer, correct)
      }
    } catch (err) {
      console.error('Failed to submit answer:', err)
      // フォールバック: ローカルで判定
      const correct = answer === currentQuestion.correct_answer
      setIsCorrect(correct)
      setShowResult(true)
      if (correct) {
        setScore(prev => prev + 1)
      }
      
      // 回答履歴を記録
      setAnswerRecords(prev => [...prev, {
        species: currentQuestion.correct_answer,
        isCorrect: correct,
      }])
    }
  }

  // 次の問題へ
  const handleNext = () => {
    if (questionNumber >= TOTAL_QUESTIONS) {
      setGameFinished(true)
      saveScore()
    } else {
      loadNewQuestion()
    }
  }

  // スコア保存とバッジチェック
  const saveScore = async () => {
    if (!user) return
    
    setSavingScore(true)
    
    try {
      // クイズスコアを保存
      await saveQuizScore(user.id, score, TOTAL_QUESTIONS)
      
      // バッジをチェックして付与
      const awarded = await checkAndAwardBadges(user.id)
      if (awarded.length > 0) {
        setNewBadges(awarded)
      }
    } catch (err) {
      console.error('Failed to save score:', err)
    } finally {
      setSavingScore(false)
    }
  }

  // リトライ
  const handleRetry = () => {
    setQuestionNumber(0)
    setScore(0)
    setGameFinished(false)
    setAnswerRecords([])
    setNewBadges([])
    loadNewQuestion()
  }

  // ゲーム終了画面
  if (gameFinished) {
    const percentage = Math.round((score / TOTAL_QUESTIONS) * 100)
    let message = ''
    let emoji = ''
    
    if (percentage === 100) {
      message = '完璧！素晴らしい！'
      emoji = '🎉'
    } else if (percentage >= 80) {
      message = 'すごい！よくできました！'
      emoji = '👏'
    } else if (percentage >= 60) {
      message = 'よく頑張りました！'
      emoji = '😊'
    } else {
      message = 'もっと練習しましょう！'
      emoji = '💪'
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
            <div className="text-6xl mb-4">{emoji}</div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              クイズ終了！
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-6">
              {message}
            </p>
            
            <div className="bg-green-50 dark:bg-gray-700 rounded-xl p-6 mb-6">
              <div className="text-5xl font-bold text-green-600 dark:text-green-400">
                {score} / {TOTAL_QUESTIONS}
              </div>
              <div className="text-gray-600 dark:text-gray-400 mt-2">
                正解率: {percentage}%
              </div>
            </div>
            
            {/* 新しく獲得したバッジ */}
            {newBadges.length > 0 && (
              <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border-2 border-yellow-400">
                <div className="text-lg font-bold text-yellow-700 dark:text-yellow-300 mb-2">
                  🎊 新しいバッジを獲得！
                </div>
                <div className="flex justify-center gap-4">
                  {newBadges.map(badgeType => {
                    const badge = BADGES.find(b => b.type === badgeType)
                    return badge ? (
                      <div key={badgeType} className="text-center">
                        <div className="text-4xl">{badge.emoji}</div>
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {badge.name}
                        </div>
                      </div>
                    ) : null
                  })}
                </div>
              </div>
            )}
            
            {/* 回答履歴 */}
            {answerRecords.length > 0 && (
              <div className="mb-6 text-left">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  今回の結果:
                </h3>
                <div className="space-y-1">
                  {answerRecords.map((record, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-gray-700 rounded"
                    >
                      <span className="text-gray-800 dark:text-gray-200">
                        {index + 1}. {record.species}
                      </span>
                      <span className={record.isCorrect ? 'text-green-600' : 'text-red-600'}>
                        {record.isCorrect ? '⭕️' : '❌'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              <button
                onClick={handleRetry}
                className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
              >
                もう一度挑戦
              </button>
              <Link
                href="/score"
                className="block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-center"
              >
                📊 スコア・バッジを見る
              </Link>
              <button
                onClick={() => router.push('/')}
                className="w-full py-3 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-medium rounded-lg transition-colors"
              >
                ホームに戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ローディング画面
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-600 dark:text-gray-400">問題を取得中...</div>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            ※ 初回は10秒程度かかる場合があります
          </p>
        </div>
      </div>
    )
  }

  // エラー画面
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center max-w-md">
          <div className="text-4xl mb-4">😞</div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
            エラーが発生しました
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error}
          </p>
          <button
            onClick={loadNewQuestion}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
          >
            再試行
          </button>
        </div>
      </div>
    )
  }

  if (!currentQuestion) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
      <div className="max-w-md mx-auto">
        {/* 進捗バー */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>問題 {questionNumber} / {TOTAL_QUESTIONS}</span>
            <span>スコア: {score}</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${(questionNumber / TOTAL_QUESTIONS) * 100}%` }}
            />
          </div>
        </div>

        {/* クイズカード */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white text-center mb-6">
            この鳴き声は何の鳥？
          </h2>

          {/* 音声プレーヤー */}
          <div className="flex justify-center mb-4">
            <button
              onClick={playAudio}
              className="w-24 h-24 bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 rounded-full flex items-center justify-center transition-colors"
            >
              <span className="text-4xl">{isPlaying ? '🔊' : '🔇'}</span>
            </button>
            <audio
              ref={audioRef}
              src={currentQuestion.audio_url}
              onEnded={() => setIsPlaying(false)}
              onError={() => setIsPlaying(false)}
            />
          </div>

          <p className="text-center text-gray-600 dark:text-gray-400 mb-6 text-sm">
            ボタンをタップして鳴き声を聞いてください
          </p>

          {/* 選択肢 */}
          <div className="space-y-3">
            {currentQuestion.choices.map((choice, index) => {
              let buttonStyle = 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              
              if (showResult) {
                if (choice === currentQuestion.correct_answer) {
                  buttonStyle = 'bg-green-500 text-white'
                } else if (choice === selectedAnswer && !isCorrect) {
                  buttonStyle = 'bg-red-500 text-white'
                } else {
                  buttonStyle = 'bg-gray-100 dark:bg-gray-700 opacity-50'
                }
              } else if (selectedAnswer === choice) {
                buttonStyle = 'bg-green-200 dark:bg-green-800'
              }

              return (
                <button
                  key={index}
                  onClick={() => handleAnswer(choice)}
                  disabled={showResult}
                  className={`w-full py-4 px-4 rounded-xl font-medium transition-all ${buttonStyle}`}
                >
                  {choice}
                </button>
              )
            })}
          </div>

          {/* 結果表示 */}
          {showResult && (
            <div className="mt-6">
              <div className={`p-4 rounded-xl ${isCorrect ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                <div className="text-center">
                  <span className="text-2xl">{isCorrect ? '⭕️' : '❌'}</span>
                  <p className={`font-bold mt-2 ${isCorrect ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                    {isCorrect ? '正解！' : `不正解... 答えは「${currentQuestion.correct_answer}」`}
                  </p>
                  {currentQuestion.scientific_name && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      学名: {currentQuestion.scientific_name}
                    </p>
                  )}
                  {currentQuestion.family && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      科: {currentQuestion.family}
                    </p>
                  )}
                </div>
              </div>

              {/* クレジット表示 (Xeno-Canto Terms of Use準拠) */}
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-xs text-gray-500 dark:text-gray-400">
                <p className="font-medium mb-1">📢 音声クレジット</p>
                <p>
                  録音者: {currentQuestion.recordist || 'Unknown'}
                  {currentQuestion.xc_id && (
                    <> | <a 
                      href={`https://xeno-canto.org/${currentQuestion.xc_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 dark:text-green-400 hover:underline"
                    >
                      XC{currentQuestion.xc_id}
                    </a></>
                  )}
                </p>
                {currentQuestion.license_url && (
                  <p>
                    <a 
                      href={currentQuestion.license_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 dark:text-green-400 hover:underline"
                    >
                      ライセンス情報
                    </a>
                  </p>
                )}
              </div>
              
              <button
                onClick={handleNext}
                className="w-full mt-4 py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
              >
                {questionNumber >= TOTAL_QUESTIONS ? '結果を見る' : '次の問題へ'}
              </button>
            </div>
          )}
        </div>

        {/* Xeno-Canto帰属表示 */}
        <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-500">
          Bird sounds from <a 
            href="https://xeno-canto.org" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-green-600 dark:text-green-400 hover:underline"
          >xeno-canto.org</a>
        </p>
      </div>
    </div>
  )
}
