import { createClient } from '@/lib/supabase/client'
import { isAdmin } from '@/lib/supabase/admin'

export type ConfusionItem = {
  mistaken_for: string
  count: number
}

export type SpeciesRankingItem = {
  species_name: string
  total_answers: number
  correct_answers: number
  accuracy_percent: number
  top_confusions: ConfusionItem[]
}

export type AudioRankingItem = {
  audio_file_id: string
  label: string
  species_name: string
  total_answers: number
  correct_answers: number
  accuracy_percent: number
  top_confusions: ConfusionItem[]
}

export type GlobalQuizStats = {
  lowAccuracySpeciesTop10: SpeciesRankingItem[]
  lowAccuracyAudioTop10: AudioRankingItem[]
  highAccuracySpeciesTop10: SpeciesRankingItem[]
  highAccuracyAudioTop10: AudioRankingItem[]
  totalAnswers: number
}

type SpeciesAnswerRow = {
  species_name: string
  audio_file_id: string | null
  is_correct: boolean
  selected_species_name: string | null
}

type AudioFileRow = {
  id: string
  bird_name: string
  description: string | null
  original_filename: string | null
}

type AggregateCounter = {
  total: number
  correct: number
}

function buildTopConfusions(
  incorrectRows: SpeciesAnswerRow[],
  ignoreSpeciesName?: string
): ConfusionItem[] {
  const confusionMap = new Map<string, number>()

  for (const row of incorrectRows) {
    const selected = row.selected_species_name?.trim()
    if (!selected) continue
    if (ignoreSpeciesName && selected === ignoreSpeciesName) continue

    const current = confusionMap.get(selected) || 0
    confusionMap.set(selected, current + 1)
  }

  return Array.from(confusionMap.entries())
    .map(([mistaken_for, count]) => ({ mistaken_for, count }))
    .sort((a, b) => b.count - a.count || a.mistaken_for.localeCompare(b.mistaken_for))
    .slice(0, 5)
}

function calculateAccuracy(counter: AggregateCounter): number {
  if (counter.total === 0) return 0
  return Math.round((counter.correct / counter.total) * 1000) / 10
}

async function fetchAllSpeciesAnswers(): Promise<SpeciesAnswerRow[]> {
  const supabase = createClient()
  const pageSize = 1000
  let from = 0
  const allRows: SpeciesAnswerRow[] = []

  while (true) {
    const to = from + pageSize - 1
    const { data, error } = await supabase
      .from('species_answers')
      .select('species_name, audio_file_id, is_correct, selected_species_name')
      .order('answered_at', { ascending: true })
      .range(from, to)

    if (error) {
      throw new Error(`統計データの取得に失敗しました: ${error.message}`)
    }

    const rows = (data || []) as SpeciesAnswerRow[]
    allRows.push(...rows)

    if (rows.length < pageSize) {
      break
    }

    from += pageSize
  }

  return allRows
}

async function fetchAudioFileMap(audioIds: string[]): Promise<Map<string, AudioFileRow>> {
  if (audioIds.length === 0) {
    return new Map<string, AudioFileRow>()
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('audio_files')
    .select('id, bird_name, description, original_filename')
    .in('id', audioIds)

  if (error) {
    throw new Error(`音声情報の取得に失敗しました: ${error.message}`)
  }

  const audioMap = new Map<string, AudioFileRow>()
  for (const row of (data || []) as AudioFileRow[]) {
    audioMap.set(row.id, row)
  }

  return audioMap
}

function buildAudioLabel(row: AudioFileRow | undefined, fallbackId: string): string {
  if (!row) return `不明な音声 (${fallbackId.slice(0, 8)})`

  const left = row.bird_name || '不明種'
  const right = row.description || row.original_filename || row.id.slice(0, 8)
  return `${left} - ${right}`
}

export async function getGlobalQuizStats(): Promise<GlobalQuizStats> {
  const admin = await isAdmin()
  if (!admin) {
    throw new Error('管理者権限が必要です')
  }

  const rows = await fetchAllSpeciesAnswers()

  if (rows.length === 0) {
    return {
      lowAccuracySpeciesTop10: [],
      lowAccuracyAudioTop10: [],
      highAccuracySpeciesTop10: [],
      highAccuracyAudioTop10: [],
      totalAnswers: 0,
    }
  }

  const speciesCounters = new Map<string, AggregateCounter>()
  const audioCounters = new Map<string, AggregateCounter>()
  const rowsBySpecies = new Map<string, SpeciesAnswerRow[]>()
  const rowsByAudio = new Map<string, SpeciesAnswerRow[]>()

  for (const row of rows) {
    const speciesCounter = speciesCounters.get(row.species_name) || { total: 0, correct: 0 }
    speciesCounter.total += 1
    if (row.is_correct) speciesCounter.correct += 1
    speciesCounters.set(row.species_name, speciesCounter)

    if (row.audio_file_id) {
      const audioCounter = audioCounters.get(row.audio_file_id) || { total: 0, correct: 0 }
      audioCounter.total += 1
      if (row.is_correct) audioCounter.correct += 1
      audioCounters.set(row.audio_file_id, audioCounter)

      const audioRows = rowsByAudio.get(row.audio_file_id) || []
      audioRows.push(row)
      rowsByAudio.set(row.audio_file_id, audioRows)
    }

    const speciesRows = rowsBySpecies.get(row.species_name) || []
    speciesRows.push(row)
    rowsBySpecies.set(row.species_name, speciesRows)
  }

  const speciesRanking: SpeciesRankingItem[] = Array.from(speciesCounters.entries()).map(
    ([species_name, counter]) => {
      const speciesRows = rowsBySpecies.get(species_name) || []
      const incorrectRows = speciesRows.filter((row) => !row.is_correct)
      return {
        species_name,
        total_answers: counter.total,
        correct_answers: counter.correct,
        accuracy_percent: calculateAccuracy(counter),
        top_confusions: buildTopConfusions(incorrectRows, species_name),
      }
    }
  )

  const audioIds = Array.from(audioCounters.keys())
  const audioMap = await fetchAudioFileMap(audioIds)

  const audioRanking: AudioRankingItem[] = Array.from(audioCounters.entries()).map(
    ([audio_file_id, counter]) => {
      const audioRows = rowsByAudio.get(audio_file_id) || []
      const incorrectRows = audioRows.filter((row) => !row.is_correct)
      const speciesName = audioRows[0]?.species_name || '不明種'
      const label = buildAudioLabel(audioMap.get(audio_file_id), audio_file_id)

      return {
        audio_file_id,
        label,
        species_name: speciesName,
        total_answers: counter.total,
        correct_answers: counter.correct,
        accuracy_percent: calculateAccuracy(counter),
        top_confusions: buildTopConfusions(incorrectRows, speciesName),
      }
    }
  )

  const sortLow = <T extends { accuracy_percent: number; total_answers: number; }>(
    items: T[]
  ) => items
    .slice()
    .sort(
      (a, b) =>
        a.accuracy_percent - b.accuracy_percent ||
        b.total_answers - a.total_answers
    )
    .slice(0, 10)

  const sortHigh = <T extends { accuracy_percent: number; total_answers: number; }>(
    items: T[]
  ) => items
    .slice()
    .sort(
      (a, b) =>
        b.accuracy_percent - a.accuracy_percent ||
        b.total_answers - a.total_answers
    )
    .slice(0, 10)

  return {
    lowAccuracySpeciesTop10: sortLow(speciesRanking),
    lowAccuracyAudioTop10: sortLow(audioRanking),
    highAccuracySpeciesTop10: sortHigh(speciesRanking),
    highAccuracyAudioTop10: sortHigh(audioRanking),
    totalAnswers: rows.length,
  }
}
