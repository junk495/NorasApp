import { useRef, useState } from 'react'
import { parseBackup, restoreBackup, type BackupData } from '../lib/export'

interface Props {
  onClose: () => void
}

export function ImportDialog({ onClose }: Props) {
  const [backup, setBackup] = useState<BackupData | null>(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setError(null)
    setDone(false)
    try {
      const text = await file.text()
      const parsed = parseBackup(text)
      setFileName(file.name)
      setBackup(parsed)
    } catch (e) {
      setBackup(null)
      setError(e instanceof Error ? e.message : 'Could not read the file.')
    }
  }

  async function doImport() {
    if (!backup) return
    setImporting(true)
    await restoreBackup(backup)
    setImporting(false)
    setDone(true)
  }

  const wordCount = backup?.vocabulary.filter((v) => v.kind === 'word').length ?? 0
  const verbCount = backup?.vocabulary.filter((v) => v.kind === 'irregular').length ?? 0

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Import data (JSON)</h3>
        <p className="muted">
          Imports a NorasApp backup and <strong>replaces</strong> all current profiles, vocabulary and progress.
        </p>

        {!backup && !error && (
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

        {backup && !done && (
          <>
            <div className="import-preview">
              <p>
                File: <strong>{fileName}</strong>
              </p>
              <p>
                Profiles: <strong>{backup.profiles.length}</strong>
              </p>
              <p>
                Words: <strong>{wordCount}</strong> · Verbs: <strong>{verbCount}</strong>
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
