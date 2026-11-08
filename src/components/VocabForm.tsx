import { useState, type FormEvent } from 'react'
import { db, type CardKind, type Profile, type Vocabulary } from '../db'
import { formatTags, parseTags } from '../lib/tags'

interface Props {
  profile: Profile
  kind: CardKind
  initial?: Vocabulary | null
  onClose: () => void
}

const KIND_LABEL: Record<CardKind, string> = {
  word: 'word',
  irregular: 'verb',
  phrase: 'phrase',
}

export function VocabForm({ profile, kind, initial, onClose }: Props) {
  const isIrregular = kind === 'irregular'
  const isPhrase = kind === 'phrase'
  const [english, setEnglish] = useState(initial?.english ?? '')
  const [german, setGerman] = useState(initial?.german ?? '')
  const [pastSimple, setPastSimple] = useState(initial?.pastSimple ?? '')
  const [pastParticiple, setPastParticiple] = useState(initial?.pastParticiple ?? '')
  const [example, setExample] = useState(initial?.example ?? '')
  const [tags, setTags] = useState(formatTags(initial?.tags ?? (initial?.category ? [initial.category] : [])))

  const canSubmit = isIrregular
    ? Boolean(english.trim() && pastSimple.trim() && pastParticiple.trim())
    : Boolean(english.trim() && german.trim())

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSubmit) return

    const parsedTags = parseTags(tags)
    const data = {
      english: english.trim(),
      german: german.trim(),
      example: example.trim() || undefined,
      tags: parsedTags.length > 0 ? parsedTags : undefined,
      ...(isIrregular
        ? {
            pastSimple: pastSimple.trim(),
            pastParticiple: pastParticiple.trim(),
          }
        : {}),
    }

    if (initial?.id != null) {
      await db.vocabulary.update(initial.id, data)
    } else {
      await db.vocabulary.add({
        ...data,
        profileId: profile.id!,
        kind,
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
        <h3>
          {initial ? 'Edit' : 'Add'} {KIND_LABEL[kind]}
        </h3>

        {isIrregular ? (
          <>
            <label>
              Infinitive
              <input className="input" value={english} onChange={(e) => setEnglish(e.target.value)} autoFocus />
            </label>
            <label>
              Past simple
              <input className="input" value={pastSimple} onChange={(e) => setPastSimple(e.target.value)} />
            </label>
            <label>
              Past participle
              <input className="input" value={pastParticiple} onChange={(e) => setPastParticiple(e.target.value)} />
            </label>
            <label>
              Meaning (German)
              <input className="input" value={german} onChange={(e) => setGerman(e.target.value)} />
            </label>
          </>
        ) : (
          <>
            <label>
              {isPhrase ? 'Phrase / sentence' : 'English'}
              <input className="input" value={english} onChange={(e) => setEnglish(e.target.value)} autoFocus />
            </label>
            <label>
              {isPhrase ? 'Translation (German)' : 'German'}
              <input className="input" value={german} onChange={(e) => setGerman(e.target.value)} />
            </label>
          </>
        )}

        <label>
          Note / example (optional)
          <input className="input" value={example} onChange={(e) => setExample(e.target.value)} />
        </label>
        <label>
          Tags (optional, comma-separated)
          <input
            className="input"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="emotions, travel, unit 1"
          />
        </label>

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={!canSubmit}>
            Save
          </button>
        </div>
      </form>
    </div>
  )
}
