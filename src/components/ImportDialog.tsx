import { useRef, useState } from 'react'
import { db, type CardKind, type Profile } from '../db'
import {
  csvTemplate,
  irregularTemplate,
  parseIrregularCsv,
  parseVocabCsv,
  type CsvParseResult,
} from '../lib/csv'

interface Props {
  profile: Profile
  kind: CardKind
  onClose: () => void
}

export function ImportDialog({ profile, kind, onClose }: Props) {
  const isIrregular = kind === 'irregular'
  const [result, setResult] = useState<CsvParseResult | null>(null)
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    const text = await file.text()
    setFileName(file.name)
    setResult(isIrregular ? parseIrregularCsv(text, profile.id!) : parseVocabCsv(text, profile.id!))
    setDone(false)
  }

  async function doImport() {
    if (!result || result.words.length === 0) return
    setImporting(true)
    await db.transaction('rw', db.vocabulary, async () => {
      const now = Date.now()
      for (const w of result.words) {
        await db.vocabulary.add({
          ...w,
          box: 1,
          dueDate: now,
          correctCount: 0,
          wrongCount: 0,
          lastReviewed: null,
          createdAt: now,
        })
      }
    })
    setImporting(false)
    setDone(true)
  }

  function downloadTemplate() {
    const content = isIrregular ? irregularTemplate() : csvTemplate()
    const blob = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = isIrregular ? 'norasapp-verbs-template.csv' : 'norasapp-words-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Import {isIrregular ? 'verbs' : 'words'}</h3>
        <p className="muted">
          {isIrregular
            ? 'CSV format: infinitive,pastSimple,pastParticiple,german,note (header optional).'
            : 'CSV format: english,german,example,category (header optional).'}
        </p>

        {!result && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt,text/csv"
              className="input"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleFile(f)
                e.target.value = ''
              }}
            />
            <button type="button" className="btn" onClick={downloadTemplate}>
              Download template
            </button>
          </>
        )}

        {result && !done && (
          <>
            <div className="import-preview">
              <p>
                File: <strong>{fileName}</strong>
              </p>
              <p>
                Valid entries: <strong>{result.words.length}</strong>
              </p>
              {result.skipped > 0 && <p>Skipped rows: {result.skipped}</p>}
              {result.errors.length > 0 && (
                <ul className="import-errors">
                  {result.errors.slice(0, 10).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={doImport}
                disabled={importing || result.words.length === 0}
              >
                {importing ? 'Importing…' : `Import ${result.words.length} ${isIrregular ? 'verbs' : 'words'}`}
              </button>
            </div>
          </>
        )}

        {done && (
          <>
            <p className="success">
              Imported {result?.words.length ?? 0} {isIrregular ? 'verbs' : 'words'}.
            </p>
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
