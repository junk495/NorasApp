import { db, type NewVocabulary, type Profile, type StudyStats, type Vocabulary } from '../db'

export interface BackupData {
  app: string
  version: number
  exportedAt: string
  profiles: Profile[]
  vocabulary: Vocabulary[]
  studyStats: StudyStats[]
}

/** A single card as it may appear in a simple JSON list (words and verbs). */
export interface SimpleCard {
  kind?: 'word' | 'irregular'
  english?: string
  /** Alias for `english` (used for verbs). */
  infinitive?: string
  german?: string
  example?: string
  category?: string
  pastSimple?: string
  pastParticiple?: string
}

export type ImportPayload =
  | { mode: 'restore'; data: BackupData }
  | { mode: 'add'; cards: SimpleCard[] }

/** Reads the complete app state (profiles, vocabulary with progress, study stats). */
export async function buildBackup(): Promise<BackupData> {
  const [profiles, vocabulary, studyStats] = await Promise.all([
    db.profiles.toArray(),
    db.vocabulary.toArray(),
    db.studyStats.toArray(),
  ])
  return {
    app: 'NorasApp',
    version: 1,
    exportedAt: new Date().toISOString(),
    profiles,
    vocabulary,
    studyStats,
  }
}

/** Detects and parses either a full backup object or a simple card array. */
export function parseImport(text: string): ImportPayload {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('This file is not valid JSON.')
  }

  if (Array.isArray(parsed)) {
    return { mode: 'add', cards: parsed as SimpleCard[] }
  }

  if (typeof parsed === 'object' && parsed !== null) {
    const data = parsed as Partial<BackupData>
    if (Array.isArray(data.profiles) && Array.isArray(data.vocabulary) && Array.isArray(data.studyStats)) {
      return { mode: 'restore', data: normalizeBackup(data) }
    }
  }

  throw new Error('This file is neither a NorasApp backup nor a card list.')
}

/** Converts a simple card list into typed vocabulary rows for the given profile. */
export function cardsToVocabulary(cards: SimpleCard[], profileId: number): { valid: NewVocabulary[]; skipped: number } {
  const valid: NewVocabulary[] = []
  let skipped = 0

  for (const card of cards) {
    if (typeof card !== 'object' || card === null) {
      skipped++
      continue
    }
    const base = (card.english ?? card.infinitive ?? '').trim()
    const german = (card.german ?? '').trim()
    const pastSimple = (card.pastSimple ?? '').trim()
    const pastParticiple = (card.pastParticiple ?? '').trim()
    const isIrregular = card.kind === 'irregular' || Boolean(pastSimple) || Boolean(pastParticiple)

    if (isIrregular) {
      if (!base || !pastSimple || !pastParticiple) {
        skipped++
        continue
      }
      valid.push({
        profileId,
        kind: 'irregular',
        english: base,
        german,
        pastSimple,
        pastParticiple,
        example: card.example?.trim() || undefined,
      })
    } else {
      if (!base || !german) {
        skipped++
        continue
      }
      valid.push({
        profileId,
        kind: 'word',
        english: base,
        german,
        example: card.example?.trim() || undefined,
        category: card.category?.trim() || undefined,
      })
    }
  }

  return { valid, skipped }
}

/** Adds vocabulary rows with fresh Leitner state (due immediately), skipping duplicates. */
export async function addCardsToProfile(cards: NewVocabulary[]): Promise<{ added: number; skipped: number }> {
  if (cards.length === 0) return { added: 0, skipped: 0 }

  const profileIds = Array.from(new Set(cards.map((c) => c.profileId)))
  const now = Date.now()

  return db.transaction('rw', db.vocabulary, async () => {
    const existing = await db.vocabulary.where('profileId').anyOf(profileIds).toArray()
    const seen = new Set(existing.map((w) => `${w.profileId}:${w.kind}:${w.english.trim().toLowerCase()}`))

    const fresh: NewVocabulary[] = []
    for (const c of cards) {
      const key = `${c.profileId}:${c.kind}:${c.english.trim().toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)
      fresh.push(c)
    }

    if (fresh.length > 0) {
      await db.vocabulary.bulkAdd(
        fresh.map((c) => ({
          ...c,
          box: 1,
          dueDate: now,
          correctCount: 0,
          wrongCount: 0,
          lastReviewed: null,
          createdAt: now,
        })),
      )
    }

    return { added: fresh.length, skipped: cards.length - fresh.length }
  })
}

/** Replaces the current data with the backup data (keeps ids for referential integrity). */
export async function restoreBackup(data: BackupData): Promise<void> {
  await db.transaction('rw', db.profiles, db.vocabulary, db.studyStats, async () => {
    await db.profiles.clear()
    await db.vocabulary.clear()
    await db.studyStats.clear()
    await db.profiles.bulkPut(data.profiles)
    await db.vocabulary.bulkPut(data.vocabulary)
    await db.studyStats.bulkPut(data.studyStats)
  })
}

function normalizeBackup(data: Partial<BackupData>): BackupData {
  return {
    app: 'NorasApp',
    version: typeof data.version === 'number' ? data.version : 1,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : new Date().toISOString(),
    profiles: data.profiles as Profile[],
    vocabulary: (data.vocabulary as Partial<Vocabulary>[]).map(normalizeVocabulary),
    studyStats: data.studyStats as StudyStats[],
  }
}

function normalizeVocabulary(v: Partial<Vocabulary>): Vocabulary {
  return {
    id: v.id,
    profileId: Number(v.profileId) || 0,
    kind: v.kind === 'irregular' ? 'irregular' : 'word',
    english: v.english ?? '',
    german: v.german ?? '',
    example: v.example,
    category: v.category,
    pastSimple: v.pastSimple,
    pastParticiple: v.pastParticiple,
    box: Number(v.box) || 1,
    dueDate: Number(v.dueDate) || Date.now(),
    correctCount: Number(v.correctCount) || 0,
    wrongCount: Number(v.wrongCount) || 0,
    lastReviewed: v.lastReviewed ?? null,
    createdAt: Number(v.createdAt) || Date.now(),
  }
}

/** Triggers a browser download of the given text content. */
export function downloadTextFile(filename: string, content: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
