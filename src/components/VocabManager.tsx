import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { countDuplicateVocabulary, db, deduplicateVocabulary, type CardKind, type Profile, type Vocabulary } from '../db'
import { tagsOf } from '../lib/tags'
import { ImportDialog } from './ImportDialog'
import { LoadState } from './LoadState'
import { VocabForm } from './VocabForm'
import { addCardsToProfile, buildBackup, downloadTextFile } from '../lib/export'
import { COMMON_IRREGULAR_VERBS } from '../data/irregularVerbs'

interface Props {
  profile: Profile
}

export function VocabManager({ profile }: Props) {
  const profileId = profile.id!
  const words = useLiveQuery(() => db.vocabulary.where('profileId').equals(profileId).toArray(), [profileId])

  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('all')
  const [kindFilter, setKindFilter] = useState<'all' | CardKind>('all')
  const [showImport, setShowImport] = useState(false)
  const [creating, setCreating] = useState<CardKind | null>(null)
  const [editing, setEditing] = useState<Vocabulary | null>(null)

  const allTags = useMemo(() => {
    const set = new Set<string>()
    words?.forEach((w) => {
      for (const tag of tagsOf(w)) set.add(tag)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
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
        tagsOf(w).some((t) => t.toLowerCase().includes(q))
      const matchesTag = tagFilter === 'all' || tagsOf(w).some((t) => t.toLowerCase() === tagFilter.toLowerCase())
      const matchesKind = kindFilter === 'all' || w.kind === kindFilter
      return matchesSearch && matchesTag && matchesKind
    })
  }, [words, search, tagFilter, kindFilter])

  async function removeWord(id: number) {
    if (!window.confirm('Delete this entry?')) return
    await db.vocabulary.delete(id)
  }

  function exportJson() {
    void buildBackup().then((backup) => {
      const date = new Date().toISOString().slice(0, 10)
      downloadTextFile(`norasapp-backup-${date}.json`, JSON.stringify(backup, null, 2), 'application/json')
    })
  }

  async function addCommonVerbs() {
    if (!words) return
    const existing = new Set(
      words.filter((w) => w.kind === 'irregular').map((w) => w.english.toLowerCase()),
    )
    const newCards = COMMON_IRREGULAR_VERBS.filter((v) => !existing.has(v.infinitive.toLowerCase())).map(
      (v) => ({
        profileId,
        kind: 'irregular' as const,
        english: v.infinitive,
        german: v.german,
        pastSimple: v.pastSimple,
        pastParticiple: v.pastParticiple,
      }),
    )
    if (newCards.length === 0) return
    await addCardsToProfile(newCards)
  }

  async function deduplicate() {
    if (!words) return
    const count = countDuplicateVocabulary(words)
    if (count === 0) {
      window.alert('No duplicate entries found.')
      return
    }
    const label = count === 1 ? 'entry' : 'entries'
    if (!window.confirm(`Remove ${count} duplicate ${label}? The entry with the most progress is kept.`)) return
    const { removed } = await deduplicateVocabulary(profileId)
    const removedLabel = removed === 1 ? 'entry' : 'entries'
    window.alert(`Removed ${removed} duplicate ${removedLabel}.`)
  }

  if (!words) {
    return <LoadState />
  }

  const wordCount = words.filter((w) => w.kind === 'word').length
  const verbCount = words.filter((w) => w.kind === 'irregular').length
  const phraseCount = words.filter((w) => w.kind === 'phrase').length

  return (
    <section>
      <div className="section-head">
        <h2>Vocabulary</h2>
        <span className="muted">
          {wordCount} words · {verbCount} verbs · {phraseCount} phrases
        </span>
      </div>

      <div className="toolbar toolbar--wrap">
        <input
          className="input"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
          <option value="all">All tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>
              {t}
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
          <option value="phrase">Phrases</option>
        </select>
      </div>

      <div className="toolbar toolbar--wrap">
        <button type="button" className="btn btn--primary" onClick={() => setCreating('word')}>
          Add word
        </button>
        <button type="button" className="btn btn--primary" onClick={() => setCreating('irregular')}>
          Add verb
        </button>
        <button type="button" className="btn btn--primary" onClick={() => setCreating('phrase')}>
          Add phrase
        </button>
        <button type="button" className="btn" onClick={addCommonVerbs}>
          Add common verbs
        </button>
        <button type="button" className="btn" onClick={() => setShowImport(true)}>
          Import (JSON)
        </button>
        <button type="button" className="btn" onClick={exportJson}>
          Export (JSON)
        </button>
        <button type="button" className="btn" onClick={deduplicate}>
          Remove duplicates
        </button>
      </div>

      {words.length === 0 ? (
        <div className="card empty">
          <p>No vocabulary yet.</p>
          <p>Import a JSON backup or add your own words and verbs.</p>
          <button type="button" className="btn btn--primary" onClick={() => setShowImport(true)}>
            Import (JSON)
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
                    {w.pastSimple}
                    {w.pastParticiple && w.pastParticiple !== '-' ? ` · ${w.pastParticiple}` : ''}
                  </span>
                ) : (
                  <span className="vocab-item__german">{w.german}</span>
                )}
                {w.kind === 'irregular' && w.german && (
                  <span className="vocab-item__example">Meaning: {w.german}</span>
                )}
                {w.example && <span className="vocab-item__example">{w.example}</span>}
                {w.kind === 'irregular' && <span className="badge badge--verb">verb</span>}
                {w.kind === 'phrase' && <span className="badge badge--phrase">phrase</span>}
                {tagsOf(w).map((tag) => (
                  <span key={tag} className="badge">
                    {tag}
                  </span>
                ))}
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
      {showImport && <ImportDialog profile={profile} onClose={() => setShowImport(false)} />}
    </section>
  )
}
