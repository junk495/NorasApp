import { useEffect, useState } from 'react'
import Dexie from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, recordStudy, type Profile, type Vocabulary } from '../db'
import { gradeWord } from '../lib/leitner'
import { answersMatch } from '../lib/answers'

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
  const [input, setInput] = useState('')
  const [graded, setGraded] = useState<'correct' | 'wrong' | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)

  useEffect(() => {
    if (dueWords && queue === null) {
      setQueue(shuffle(dueWords))
    }
  }, [dueWords, queue])

  const word = queue?.[index]

  async function submit() {
    if (!word || graded) return
    const correct = answersMatch(input, word.german)
    await db.vocabulary.update(word.id!, gradeWord(word, correct))
    await recordStudy(profileId, correct)
    if (correct) setCorrectCount((c) => c + 1)
    else setWrongCount((c) => c + 1)
    setGraded(correct ? 'correct' : 'wrong')
  }

  function next() {
    setInput('')
    setGraded(null)
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

      <div className="card prompt-card">
        <span className="flashcard__label">Translate to German</span>
        <span className="flashcard__word">{word.english}</span>
        {word.example && <span className="flashcard__example">{word.example}</span>}
      </div>

      <div className="progress">
        Card {index + 1} of {queue?.length}
      </div>

      {graded === null ? (
        <form
          className="answer-form"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <input
            className="input answer-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type the German word…"
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <button type="submit" className="btn btn--primary" disabled={!input.trim()}>
            Check
          </button>
        </form>
      ) : (
        <div className={`answer-feedback answer-feedback--${graded}`}>
          <div className="answer-feedback__status">{graded === 'correct' ? 'Correct!' : 'Not quite.'}</div>
          <div className="answer-feedback__correct">
            Answer: <strong>{word.german}</strong>
          </div>
          <button type="button" className="btn btn--primary" onClick={next} autoFocus>
            Next
          </button>
        </div>
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
