import { useRef, useState } from 'react'
import {
  addCardsToProfile,
  cardsToVocabulary,
  parseImport,
  restoreBackup,
  type BackupData,
} from '../lib/export'
import type { NewVocabulary, Profile } from '../db'

interface Props {
  profile: Profile
  onClose: () => void
}

export function ImportDialog({ profile, onClose }: Props) {
  const [fileName, setFileName] = useState('')
  const [mode, setMode] = useState<'add' | 'restore' | null>(null)
  const [restoreData, setRestoreData] = useState<BackupData | null>(null)
  const [cards, setCards] = useState<NewVocabulary[]>([])
  const [skipped, setSkipped] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setError(null)
    setDone(false)
    setMode(null)
    try {
      const text = await file.text()
      const payload = parseImport(text)
      setFileName(file.name)
      if (payload.mode === 'restore') {
        setMode('restore')
        setRestoreData(payload.data)
      } else {
        const { valid, skipped } = cardsToVocabulary(payload.cards, profile.id!)
        setMode('add')
        setCards(valid)
        setSkipped(skipped)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read the file.')
    }
  }

  async function doImport() {
    if (importing) return
    setImporting(true)
    if (mode === 'restore' && restoreData) {
      await restoreBackup(restoreData)
    } else if (mode === 'add') {
      await addCardsToProfile(cards)
    }
    setImporting(false)
    setDone(true)
  }

  const wordCount = cards.filter((c) => c.kind === 'word').length
  const verbCount = cards.filter((c) => c.kind === 'irregular').length
  const restoreWordCount = restoreData?.vocabulary.filter((v) => v.kind === 'word').length ?? 0
  const restoreVerbCount = restoreData?.vocabulary.filter((v) => v.kind === 'irregular').length ?? 0

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Import (JSON)</h3>
        <p className="muted">Accepts a NorasApp backup or a simple list of cards.</p>

        {!mode && !error && (
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="input"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleFile(f)
              e.target.value = ''
            }}
          />
        )}

        {error && <p className="import-error">{error}</p>}

        {mode === 'add' && !done && (
          <>
            <div className="import-preview">
              <p>
                File: <strong>{fileName}</strong>
              </p>
              <p>
                Words: <strong>{wordCount}</strong> · Verbs: <strong>{verbCount}</strong>
              </p>
              {skipped > 0 && <p>Skipped rows: {skipped}</p>}
            </div>
            <p className="muted">
              Adds these cards to profile <strong>{profile.name}</strong>.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={doImport}
                disabled={importing || cards.length === 0}
              >
                {importing ? 'Adding…' : `Add ${cards.length} cards`}
              </button>
            </div>
          </>
        )}

        {mode === 'restore' && !done && restoreData && (
          <>
            <div className="import-preview">
              <p>
                File: <strong>{fileName}</strong>
              </p>
              <p>
                Profiles: <strong>{restoreData.profiles.length}</strong>
              </p>
              <p>
                Words: <strong>{restoreWordCount}</strong> · Verbs: <strong>{restoreVerbCount}</strong>
              </p>
            </div>
            <p className="import-warning">This replaces all current data. Continue?</p>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="btn btn--danger" onClick={doImport} disabled={importing}>
                {importing ? 'Importing…' : 'Import'}
              </button>
            </div>
          </>
        )}

        {done && (
          <>
            <p className="success">Import complete.</p>
            <div className="modal-actions">
              <button type="button" className="btn btn--primary" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
