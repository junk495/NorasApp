import Dexie, { type Table } from 'dexie'
import { todayKey } from './lib/dates'

export interface Profile {
  id?: number
  name: string
  color: string
  createdAt: number
}

export interface Vocabulary {
  id?: number
  profileId: number
  english: string
  german: string
  example?: string
  category?: string
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
