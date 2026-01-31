import { createClient } from './client'

// 音声ファイルの型定義
export interface AudioFile {
  id: string
  bird_name: string
  scientific_name: string | null
  family: string | null
  family_jp: string | null
  order_name: string | null
  order_jp: string | null
  genus: string | null
  genus_jp: string | null
  file_path: string
  storage_url: string
  original_filename: string | null
  description: string | null
  recordist: string | null
  source_url: string | null
  license: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// 問題集の型定義
export interface QuestionSet {
  id: string
  name: string
  description: string | null
  difficulty_level: number
  is_public: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

// 問題集アイテムの型定義
export interface QuestionSetItem {
  id: string
  question_set_id: string
  audio_file_id: string
  display_order: number
  created_at: string
  audio_file?: AudioFile
}

// 問題集と音声ファイルの結合型
export interface QuestionSetWithItems extends QuestionSet {
  items: QuestionSetItem[]
}

/**
 * ユーザーが管理者かどうかを確認
 */
export async function isAdmin(): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return false
  
  const { data, error } = await supabase
    .from('admin_users')
    .select('id')
    .eq('user_id', user.id)
    .single()
  
  return !error && !!data
}

/**
 * 全ての音声ファイルを取得
 */
export async function getAudioFiles(): Promise<AudioFile[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('audio_files')
    .select('*')
    .order('bird_name', { ascending: true })
  
  if (error) {
    console.error('Error fetching audio files:', error)
    return []
  }
  
  return data || []
}

/**
 * アクティブな音声ファイルのみ取得
 */
export async function getActiveAudioFiles(): Promise<AudioFile[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('audio_files')
    .select('*')
    .eq('is_active', true)
    .order('bird_name', { ascending: true })
  
  if (error) {
    console.error('Error fetching active audio files:', error)
    return []
  }
  
  return data || []
}

/**
 * 音声ファイルを追加
 */
export async function addAudioFile(
  file: File,
  birdName: string,
  metadata: Partial<AudioFile>
): Promise<AudioFile | null> {
  const supabase = createClient()
  
  // 1. Storageにファイルをアップロード
  // ファイル名から拡張子を取得し、タイムスタンプ＋ランダムIDで安全なファイル名を生成
  const fileExtension = file.name.split('.').pop() || 'mp3'
  const safeFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${fileExtension}`
  const filePath = `audio/${safeFileName}`
  
  const { error: uploadError } = await supabase.storage
    .from('bird-sounds')
    .upload(filePath, file)
  
  if (uploadError) {
    console.error('Error uploading file:', uploadError)
    return null
  }
  
  // 2. 公開URLを取得
  const { data: urlData } = supabase.storage
    .from('bird-sounds')
    .getPublicUrl(filePath)
  
  // 3. データベースにレコードを追加
  const { data, error } = await supabase
    .from('audio_files')
    .insert({
      bird_name: birdName,
      file_path: filePath,
      storage_url: urlData.publicUrl,
      original_filename: file.name,
      ...metadata
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error inserting audio file record:', error)
    // アップロードしたファイルを削除
    await supabase.storage.from('bird-sounds').remove([filePath])
    return null
  }
  
  return data
}

/**
 * 音声ファイルを更新
 */
export async function updateAudioFile(
  id: string,
  updates: Partial<AudioFile>
): Promise<AudioFile | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('audio_files')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating audio file:', error)
    return null
  }
  
  return data
}

/**
 * 音声ファイルを削除（論理削除）
 */
export async function deleteAudioFile(id: string): Promise<boolean> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('audio_files')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting audio file:', error)
    return false
  }
  
  return true
}

/**
 * 全ての問題集を取得
 */
export async function getQuestionSets(): Promise<QuestionSet[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('question_sets')
    .select('*')
    .order('name', { ascending: true })
  
  if (error) {
    console.error('Error fetching question sets:', error)
    return []
  }
  
  return data || []
}

/**
 * 公開問題集を取得
 */
export async function getPublicQuestionSets(): Promise<QuestionSet[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('question_sets')
    .select('*')
    .eq('is_public', true)
    .order('difficulty_level', { ascending: true })
    .order('name', { ascending: true })
  
  if (error) {
    console.error('Error fetching public question sets:', error)
    return []
  }
  
  return data || []
}

/**
 * 問題集の詳細を取得（音声ファイル含む）
 */
export async function getQuestionSetWithItems(id: string): Promise<QuestionSetWithItems | null> {
  const supabase = createClient()
  
  // 問題集の基本情報を取得
  const { data: questionSet, error: setError } = await supabase
    .from('question_sets')
    .select('*')
    .eq('id', id)
    .single()
  
  if (setError || !questionSet) {
    console.error('Error fetching question set:', setError)
    return null
  }
  
  // 問題集のアイテムを取得
  const { data: items, error: itemsError } = await supabase
    .from('question_set_items')
    .select(`
      *,
      audio_file:audio_files(*)
    `)
    .eq('question_set_id', id)
    .order('display_order', { ascending: true })
  
  if (itemsError) {
    console.error('Error fetching question set items:', itemsError)
    return null
  }
  
  return {
    ...questionSet,
    items: items || []
  }
}

/**
 * 問題集を作成
 */
export async function createQuestionSet(
  name: string,
  description: string | null,
  difficultyLevel: number,
  isPublic: boolean
): Promise<QuestionSet | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('question_sets')
    .insert({
      name,
      description,
      difficulty_level: difficultyLevel,
      is_public: isPublic,
      created_by: user?.id
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating question set:', error)
    return null
  }
  
  return data
}

/**
 * 問題集を更新
 */
export async function updateQuestionSet(
  id: string,
  updates: Partial<QuestionSet>
): Promise<QuestionSet | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('question_sets')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating question set:', error)
    return null
  }
  
  return data
}

/**
 * 問題集を削除
 */
export async function deleteQuestionSet(id: string): Promise<boolean> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('question_sets')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting question set:', error)
    return false
  }
  
  return true
}

/**
 * 問題集にアイテムを追加
 */
export async function addItemToQuestionSet(
  questionSetId: string,
  audioFileId: string,
  displayOrder: number = 0
): Promise<QuestionSetItem | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('question_set_items')
    .insert({
      question_set_id: questionSetId,
      audio_file_id: audioFileId,
      display_order: displayOrder
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error adding item to question set:', error)
    return null
  }
  
  return data
}

/**
 * 問題集からアイテムを削除
 */
export async function removeItemFromQuestionSet(
  questionSetId: string,
  audioFileId: string
): Promise<boolean> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('question_set_items')
    .delete()
    .eq('question_set_id', questionSetId)
    .eq('audio_file_id', audioFileId)
  
  if (error) {
    console.error('Error removing item from question set:', error)
    return false
  }
  
  return true
}

/**
 * 問題集のアイテムの順序を更新
 */
export async function updateItemOrder(
  itemId: string,
  displayOrder: number
): Promise<boolean> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('question_set_items')
    .update({ display_order: displayOrder })
    .eq('id', itemId)
  
  if (error) {
    console.error('Error updating item order:', error)
    return false
  }
  
  return true
}

/**
 * 鳥の種類一覧を取得
 */
export async function getBirdSpeciesList(): Promise<{ bird_name: string; scientific_name: string | null; family_jp: string | null; audio_count: number }[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('audio_files')
    .select('bird_name, scientific_name, family_jp')
    .eq('is_active', true)
  
  if (error) {
    console.error('Error fetching bird species list:', error)
    return []
  }
  
  // グループ化して集計
  const grouped = (data || []).reduce((acc, item) => {
    const key = item.bird_name
    if (!acc[key]) {
      acc[key] = {
        bird_name: item.bird_name,
        scientific_name: item.scientific_name,
        family_jp: item.family_jp,
        audio_count: 0
      }
    }
    acc[key].audio_count++
    return acc
  }, {} as Record<string, { bird_name: string; scientific_name: string | null; family_jp: string | null; audio_count: number }>)
  
  return Object.values(grouped).sort((a, b) => a.bird_name.localeCompare(b.bird_name, 'ja'))
}

/**
 * 特定の鳥の音声ファイルを取得
 */
export async function getAudioFilesForBird(birdName: string): Promise<AudioFile[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('audio_files')
    .select('*')
    .eq('bird_name', birdName)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
  
  if (error) {
    console.error('Error fetching audio files for bird:', error)
    return []
  }
  
  return data || []
}
