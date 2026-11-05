import { useState, type FormEvent } from 'react'
import { db, type Profile, type Vocabulary } from '../db'

interface Props {
  profile: Profile
  initial?: Vocabulary | null
  onClose: () => void
}

export function VocabForm({ profile, initial, onClose }: Props) {
  const [english, setEnglish] = useState(initial?.english ?? '')
  const [german, setGerman] = useState(initial?.german ?? '')
  const [example, setExample] = useState(initial?.example ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const en = english.trim()
    const de = german.trim()
    if (!en || !de) return

    if (initial?.id != null) {
      await db.vocabulary.update(initial.id, {
        english: en,
        german: de,
        example: example.trim() || undefined,
        category: category.trim() || undefined,
      })
    } else {
      await db.vocabulary.add({
        profileId: profile.id!,
        english: en,
        german: de,
        example: example.trim() || undefined,
        category: category.trim() || undefined,
        box: 1,
        dueDate: Date.now(),
        correctCount: 0,
        wrongCount: 0,
        lastReviewed: null,
        createdAt: Date.now(),
      })
    }
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3>{initial ? 'Edit word' : 'Add word'}</h3>
        <label>
          English
          <input className="input" value={english} onChange={(e) => setEnglish(e.target.value)} autoFocus />
        </label>
        <label>
          German
          <input className="input" value={german} onChange={(e) => setGerman(e.target.value)} />
        </label>
        <label>
          Example (optional)
          <input className="input" value={example} onChange={(e) => setExample(e.target.value)} />
        </label>
        <label>
          Category (optional)
          <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={!english.trim() || !german.trim()}>
            Save
          </button>
        </div>
      </form>
    </div>
  )
}
