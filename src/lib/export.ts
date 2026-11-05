import { db, type Profile, type StudyStats, type Vocabulary } from '../db'
import { escapeCsvField } from './csv'

export interface BackupData {
  app: string
  version: number
  exportedAt: string
  profiles: Profile[]
  vocabulary: Vocabulary[]
  studyStats: StudyStats[]
}

/** Serializes vocabulary rows in the import format: english,german,example,category. */
export function vocabToCsv(words: Vocabulary[]): string {
  const header = 'english,german,example,category'
  const rows = words.map((w) =>
    [w.english, w.german, w.example ?? '', w.category ?? ''].map(escapeCsvField).join(','),
  )
  return [header, ...rows].join('\n') + '\n'
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
