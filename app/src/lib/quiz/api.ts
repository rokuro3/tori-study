import { ApiQuizQuestion, ApiQuizAnswer, ApiQuizResult } from './types'

// FastAPI のベースURL（開発時はローカル、本番では環境変数から）
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/**
 * クイズ問題を取得
 */
export async function fetchQuizQuestion(): Promise<ApiQuizQuestion> {
  const response = await fetch(`${API_BASE_URL}/api/quiz/question`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || `HTTP error: ${response.status}`)
  }

  const data = await response.json()

  // 音声URLを完全なURLにし、スペース等をエンコード
  if (data.audio_url) {
    const absoluteUrl = data.audio_url.startsWith('/')
      ? `${API_BASE_URL}${data.audio_url}`
      : data.audio_url
    data.audio_url = encodeURI(absoluteUrl)
  }

  return data
}

/**
 * クイズの回答を送信
 */
export async function submitQuizAnswer(answer: ApiQuizAnswer): Promise<ApiQuizResult> {
  const response = await fetch(`${API_BASE_URL}/api/quiz/answer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(answer),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || `HTTP error: ${response.status}`)
  }

  return response.json()
}
