import { useEffect, useState } from 'react'
import Dexie from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, recordStudy, type Profile, type Vocabulary } from '../db'
import { gradeWord } from '../lib/leitner'

interface Props {
  profile: Profile
  onExit: () => void
}

export function LearnSession({ profile, onExit }: Props) {
  const profileId = profile.id!
  const dueWords = useLiveQuery(
    () =>
      db.vocabulary
        .where('[profileId+dueDate]')
        .between([profileId, Dexie.minKey], [profileId, Date.now()], true, true)
        .toArray(),
    [profileId],
  )

  const [queue, setQueue] = useState<Vocabulary[] | null>(null)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)

  useEffect(() => {
    if (dueWords && queue === null) {
      setQueue(shuffle(dueWords))
    }
  }, [dueWords, queue])

  const word = queue?.[index]

  async function grade(correct: boolean) {
    if (!word) return
    await db.vocabulary.update(word.id!, gradeWord(word, correct))
    await recordStudy(profileId, correct)
    if (correct) setCorrectCount((c) => c + 1)
    else setWrongCount((c) => c + 1)
    setRevealed(false)
    setIndex((i) => i + 1)
  }

  if (!dueWords) {
    return <div className="loading">Loading…</div>
  }

  if (queue && index >= queue.length) {
    return (
      <div className="card session-done">
        <h2>Session complete</h2>
        <p>
          Correct: <strong>{correctCount}</strong> · Wrong: <strong>{wrongCount}</strong>
        </p>
        <button type="button" className="btn btn--primary" onClick={onExit}>
          Done
        </button>
      </div>
    )
  }

  if (!word) {
    if (queue && queue.length === 0) {
      return (
        <div className="card">
          <p>No words are due right now.</p>
          <button type="button" className="btn btn--primary" onClick={onExit}>
            Back
          </button>
        </div>
      )
    }
    return null
  }

  return (
    <div className="learn-session">
      <button type="button" className="icon-button learn-session__exit" onClick={onExit} aria-label="Exit">
        ✕
      </button>

      <div className={`flashcard${revealed ? ' is-flipped' : ''}`} onClick={() => setRevealed(true)}>
        <div className="flashcard__inner">
          <div className="flashcard__face flashcard__front">
            <span className="flashcard__label">English</span>
            <span className="flashcard__word">{word.english}</span>
            {word.example && <span className="flashcard__example">{word.example}</span>}
            <span className="flashcard__hint">Tap to reveal</span>
          </div>
          <div className="flashcard__face flashcard__back">
            <span className="flashcard__label">German</span>
            <span className="flashcard__word">{word.german}</span>
            {word.example && <span className="flashcard__example">{word.example}</span>}
          </div>
        </div>
      </div>

      <div className="progress">
        Card {index + 1} of {queue?.length}
      </div>

      {revealed ? (
        <div className="grade-actions">
          <button type="button" className="btn btn--danger" onClick={() => grade(false)}>
            Wrong
          </button>
          <button type="button" className="btn btn--primary" onClick={() => grade(true)}>
            Correct
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn--secondary" onClick={() => setRevealed(true)}>
          Reveal
        </button>
      )}
    </div>
  )
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
