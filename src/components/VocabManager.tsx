import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Profile, type Vocabulary } from '../db'
import { ImportDialog } from './ImportDialog'
import { VocabForm } from './VocabForm'
import { downloadTextFile, vocabToCsv } from '../lib/export'

interface Props {
  profile: Profile
}

export function VocabManager({ profile }: Props) {
  const profileId = profile.id!
  const words = useLiveQuery(() => db.vocabulary.where('profileId').equals(profileId).toArray(), [profileId])

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [showImport, setShowImport] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Vocabulary | null>(null)

  const categories = useMemo(() => {
    const set = new Set<string>()
    words?.forEach((w) => {
      if (w.category) set.add(w.category)
    })
    return Array.from(set).sort()
  }, [words])

  const filtered = useMemo(() => {
    if (!words) return []
    const q = search.trim().toLowerCase()
    return words.filter((w) => {
      const matchesSearch =
        !q ||
        w.english.toLowerCase().includes(q) ||
        w.german.toLowerCase().includes(q) ||
        (w.category ?? '').toLowerCase().includes(q)
      const matchesCategory = category === 'all' || w.category === category
      return matchesSearch && matchesCategory
    })
  }, [words, search, category])

  async function removeWord(id: number) {
    if (!window.confirm('Delete this word?')) return
    await db.vocabulary.delete(id)
  }

  function exportCsv() {
    if (!words || words.length === 0) return
    const safeName = profile.name.trim().replace(/[^a-z0-9_-]+/gi, '-') || 'profile'
    downloadTextFile(`norasapp-${safeName}-vocabulary.csv`, vocabToCsv(words), 'text/csv')
  }

  if (!words) {
    return <div className="loading">Loading…</div>
  }

  return (
    <section>
      <div className="section-head">
        <h2>Vocabulary</h2>
        <span className="muted">{words.length} words</span>
      </div>

      <div className="toolbar">
        <input
          className="input"
          placeholder="Search English, German or category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="toolbar">
        <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
          Add word
        </button>
        <button type="button" className="btn" onClick={() => setShowImport(true)}>
          Import CSV
        </button>
        <button type="button" className="btn" onClick={exportCsv} disabled={words.length === 0}>
          Export CSV
        </button>
      </div>

      {words.length === 0 ? (
        <div className="card empty">
          <p>No vocabulary yet.</p>
          <p>Import a CSV file with your own words to get started.</p>
          <button type="button" className="btn btn--primary" onClick={() => setShowImport(true)}>
            Import CSV
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card empty">
          <p>No words match your search.</p>
        </div>
      ) : (
        <ul className="vocab-list">
          {filtered.map((w) => (
            <li key={w.id} className="vocab-item">
              <div className="vocab-item__main">
                <span className="vocab-item__english">{w.english}</span>
                <span className="vocab-item__german">{w.german}</span>
                {w.example && <span className="vocab-item__example">{w.example}</span>}
                {w.category && <span className="badge">{w.category}</span>}
              </div>
              <div className="vocab-item__actions">
                <button type="button" className="icon-button" onClick={() => setEditing(w)} aria-label="Edit">
                  ✎
                </button>
                <button type="button" className="icon-button icon-button--danger" onClick={() => removeWord(w.id!)} aria-label="Delete">
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {creating && <VocabForm profile={profile} onClose={() => setCreating(false)} />}
      {editing && <VocabForm profile={profile} initial={editing} onClose={() => setEditing(null)} />}
      {showImport && <ImportDialog profile={profile} onClose={() => setShowImport(false)} />}
    </section>
  )
}
