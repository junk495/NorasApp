import Dexie, { type Table } from 'dexie'
import { todayKey } from './lib/dates'

export interface Profile {
  id?: number
  name: string
  color: string
  createdAt: number
  /** When false, irregular verbs are quizzed on past simple only (no past participle). */
  quizParticiple?: boolean
}

export type CardKind = 'word' | 'irregular'

export interface Vocabulary {
  id?: number
  profileId: number
  kind: CardKind
  /** For "word": the English word. For "irregular": the infinitive. */
  english: string
  /** For "word": the German translation. For "irregular": the German meaning. */
  german: string
  /** Example sentence or comment. */
  example?: string
  category?: string
  /** Irregular verbs only: simple past form. */
  pastSimple?: string
  /** Irregular verbs only: past participle form. */
  pastParticiple?: string
  box: number
  dueDate: number
  correctCount: number
  wrongCount: number
  lastReviewed: number | null
  createdAt: number
}

export interface StudyStats {
  id?: number
  profileId: number
  studyDate: string
  reviewedCount: number
  correctCount: number
  wrongCount: number
}

export type NewVocabulary = Omit<
  Vocabulary,
  'id' | 'box' | 'dueDate' | 'correctCount' | 'wrongCount' | 'lastReviewed' | 'createdAt'
>

class NorasDB extends Dexie {
  profiles!: Table<Profile, number>
  vocabulary!: Table<Vocabulary, number>
  studyStats!: Table<StudyStats, number>

  constructor() {
    super('norasapp')
    this.version(1).stores({
      profiles: '++id, name',
      vocabulary: '++id, profileId, dueDate, box, [profileId+dueDate]',
      studyStats: '++id, profileId, studyDate, [profileId+studyDate]',
    })

    this.version(2)
      .stores({
        profiles: '++id, name',
        vocabulary: '++id, profileId, dueDate, box, kind, [profileId+dueDate]',
        studyStats: '++id, profileId, studyDate, [profileId+studyDate]',
      })
      .upgrade((tx) =>
        tx
          .table('vocabulary')
          .toCollection()
          .modify((word) => {
            if (word.kind === undefined) word.kind = 'word'
          }),
      )
  }
}

export const db = new NorasDB()

export const PROFILE_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
]

/** Records a single graded card in the daily study stats (used for streak + daily counts). */
export async function recordStudy(profileId: number, correct: boolean): Promise<void> {
  const studyDate = todayKey()
  const existing = await db.studyStats
    .where('[profileId+studyDate]')
    .equals([profileId, studyDate])
    .first()

  if (existing?.id != null) {
    await db.studyStats.update(existing.id, {
      reviewedCount: existing.reviewedCount + 1,
      correctCount: existing.correctCount + (correct ? 1 : 0),
      wrongCount: existing.wrongCount + (correct ? 0 : 1),
    })
  } else {
    await db.studyStats.add({
      profileId,
      studyDate,
      reviewedCount: 1,
      correctCount: correct ? 1 : 0,
      wrongCount: correct ? 0 : 1,
    })
  }
}

/** Groups vocabulary rows by a case-insensitive "kind + english" key. */
function cardKey(word: Vocabulary): string {
  return `${word.kind}:${word.english.trim().toLowerCase()}`
}

/** Ids of redundant duplicate rows, keeping the entry with the most progress. */
function duplicateIdsToRemove(words: Vocabulary[]): number[] {
  const groups = new Map<string, Vocabulary[]>()
  for (const w of words) {
    const key = cardKey(w)
    const list = groups.get(key)
    if (list) list.push(w)
    else groups.set(key, [w])
  }

  const toRemove: number[] = []
  for (const list of groups.values()) {
    if (list.length <= 1) continue
    list.sort((a, b) => {
      const pa = a.box * 1000 + (a.correctCount + a.wrongCount)
      const pb = b.box * 1000 + (b.correctCount + b.wrongCount)
      if (pa !== pb) return pb - pa
      return (a.id ?? Number.MAX_SAFE_INTEGER) - (b.id ?? Number.MAX_SAFE_INTEGER)
    })
    for (let i = 1; i < list.length; i++) {
      const id = list[i].id
      if (id != null) toRemove.push(id)
    }
  }
  return toRemove
}

/** Counts redundant duplicate vocabulary entries (same kind + english). */
export function countDuplicateVocabulary(words: Vocabulary[]): number {
  return duplicateIdsToRemove(words).length
}

/** Removes duplicate vocabulary entries for a profile, keeping the entry with the most progress. */
export async function deduplicateVocabulary(profileId: number): Promise<{ removed: number }> {
  const words = await db.vocabulary.where('profileId').equals(profileId).toArray()
  const toRemove = duplicateIdsToRemove(words)
  if (toRemove.length > 0) {
    await db.vocabulary.bulkDelete(toRemove)
  }
  return { removed: toRemove.length }
}
