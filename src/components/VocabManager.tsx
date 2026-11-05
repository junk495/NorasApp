import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type CardKind, type Profile, type Vocabulary } from '../db'
import { ImportDialog } from './ImportDialog'
import { VocabForm } from './VocabForm'
import { downloadTextFile, verbsToCsv, wordsToCsv } from '../lib/export'

interface Props {
  profile: Profile
}

export function VocabManager({ profile }: Props) {
  const profileId = profile.id!
  const words = useLiveQuery(() => db.vocabulary.where('profileId').equals(profileId).toArray(), [profileId])

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [kindFilter, setKindFilter] = useState<'all' | CardKind>('all')
  const [showImport, setShowImport] = useState<CardKind | null>(null)
  const [creating, setCreating] = useState<CardKind | null>(null)
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
        (w.pastSimple ?? '').toLowerCase().includes(q) ||
        (w.pastParticiple ?? '').toLowerCase().includes(q) ||
        (w.category ?? '').toLowerCase().includes(q)
      const matchesCategory = category === 'all' || w.category === category
      const matchesKind = kindFilter === 'all' || w.kind === kindFilter
      return matchesSearch && matchesCategory && matchesKind
    })
  }, [words, search, category, kindFilter])

  async function removeWord(id: number) {
    if (!window.confirm('Delete this entry?')) return
    await db.vocabulary.delete(id)
  }

  function exportWords() {
    if (!words) return
    const list = words.filter((w) => w.kind === 'word')
    if (list.length === 0) return
    const safeName = profile.name.trim().replace(/[^a-z0-9_-]+/gi, '-') || 'profile'
    downloadTextFile(`norasapp-${safeName}-words.csv`, wordsToCsv(list), 'text/csv')
  }

  function exportVerbs() {
    if (!words) return
    const list = words.filter((w) => w.kind === 'irregular')
    if (list.length === 0) return
    const safeName = profile.name.trim().replace(/[^a-z0-9_-]+/gi, '-') || 'profile'
    downloadTextFile(`norasapp-${safeName}-verbs.csv`, verbsToCsv(list), 'text/csv')
  }

  if (!words) {
    return <div className="loading">Loading…</div>
  }

  const wordCount = words.filter((w) => w.kind === 'word').length
  const verbCount = words.filter((w) => w.kind === 'irregular').length

  return (
    <section>
      <div className="section-head">
        <h2>Vocabulary</h2>
        <span className="muted">
          {wordCount} words · {verbCount} verbs
        </span>
      </div>

      <div className="toolbar toolbar--wrap">
        <input
          className="input"
          placeholder="Search…"
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
        <select
          className="input"
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as 'all' | CardKind)}
        >
          <option value="all">All types</option>
          <option value="word">Words</option>
          <option value="irregular">Verbs</option>
        </select>
      </div>

      <div className="toolbar toolbar--wrap">
        <button type="button" className="btn btn--primary" onClick={() => setCreating('word')}>
          Add word
        </button>
        <button type="button" className="btn btn--primary" onClick={() => setCreating('irregular')}>
          Add verb
        </button>
        <button type="button" className="btn" onClick={() => setShowImport('word')}>
          Import words
        </button>
        <button type="button" className="btn" onClick={() => setShowImport('irregular')}>
          Import verbs
        </button>
        <button type="button" className="btn" onClick={exportWords} disabled={wordCount === 0}>
          Export words
        </button>
        <button type="button" className="btn" onClick={exportVerbs} disabled={verbCount === 0}>
          Export verbs
        </button>
      </div>

      {words.length === 0 ? (
        <div className="card empty">
          <p>No vocabulary yet.</p>
          <p>Import words or irregular verbs with your own data to get started.</p>
          <button type="button" className="btn btn--primary" onClick={() => setShowImport('word')}>
            Import words
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card empty">
          <p>No entries match your search.</p>
        </div>
      ) : (
        <ul className="vocab-list">
          {filtered.map((w) => (
            <li key={w.id} className="vocab-item">
              <div className="vocab-item__main">
                <span className="vocab-item__english">{w.english}</span>
                {w.kind === 'irregular' ? (
                  <span className="vocab-item__german">
                    {w.pastSimple} · {w.pastParticiple}
                  </span>
                ) : (
                  <span className="vocab-item__german">{w.german}</span>
                )}
                {w.kind === 'irregular' && w.german && (
                  <span className="vocab-item__example">Meaning: {w.german}</span>
                )}
                {w.example && <span className="vocab-item__example">{w.example}</span>}
                {w.kind === 'irregular' && <span className="badge badge--verb">verb</span>}
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

      {creating && <VocabForm profile={profile} kind={creating} onClose={() => setCreating(null)} />}
      {editing && <VocabForm profile={profile} kind={editing.kind} initial={editing} onClose={() => setEditing(null)} />}
      {showImport && <ImportDialog profile={profile} kind={showImport} onClose={() => setShowImport(null)} />}
    </section>
  )
}
