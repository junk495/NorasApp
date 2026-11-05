import { db, type Profile, type StudyStats, type Vocabulary } from '../db'

export interface BackupData {
  app: string
  version: number
  exportedAt: string
  profiles: Profile[]
  vocabulary: Vocabulary[]
  studyStats: StudyStats[]
}

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

/** Parses and validates a backup JSON file, filling sensible defaults where fields are missing. */
export function parseBackup(text: string): BackupData {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('This file is not valid JSON.')
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid backup format.')
  }

  const data = parsed as Partial<BackupData>

  if (!Array.isArray(data.profiles) || !Array.isArray(data.vocabulary) || !Array.isArray(data.studyStats)) {
    throw new Error('This file is not a NorasApp backup (missing profiles, vocabulary or studyStats).')
  }

  return {
    app: 'NorasApp',
    version: typeof data.version === 'number' ? data.version : 1,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : new Date().toISOString(),
    profiles: data.profiles as Profile[],
    vocabulary: (data.vocabulary as Partial<Vocabulary>[]).map(normalizeVocabulary),
    studyStats: data.studyStats as StudyStats[],
  }
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
