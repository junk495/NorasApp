import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, recordStudy, type Profile, type Vocabulary } from '../db'
import { gradeWord } from '../lib/leitner'
import { answersMatch } from '../lib/answers'
import { LoadState } from './LoadState'

interface Props {
  profile: Profile
  onExit: () => void
}

export function LearnSession({ profile, onExit }: Props) {
  const profileId = profile.id!
  const words = useLiveQuery(
    () => db.vocabulary.where('profileId').equals(profileId).toArray(),
    [profileId],
  )

  const [queue, setQueue] = useState<Vocabulary[] | null>(null)
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [pastInput, setPastInput] = useState('')
  const [participleInput, setParticipleInput] = useState('')
  const [graded, setGraded] = useState<'correct' | 'wrong' | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)

  useEffect(() => {
    if (words && queue === null) {
      const due = words.filter((w) => w.dueDate <= Date.now())
      setQueue(shuffle(due))
    }
  }, [words, queue])

  const word = queue?.[index]

  async function submit() {
    if (!word || graded) return
    let correct = false
    if (word.kind === 'irregular') {
      const quizParticiple =
        profile.quizParticiple !== false && Boolean(word.pastParticiple) && word.pastParticiple !== '-'
      const pastOk = answersMatch(pastInput, word.pastSimple ?? '')
      const participleOk = !quizParticiple || answersMatch(participleInput, word.pastParticiple ?? '')
      correct = pastOk && participleOk
    } else {
      correct = answersMatch(input, word.german)
    }
    await db.vocabulary.update(word.id!, gradeWord(word, correct))
    await recordStudy(profileId, correct)
    if (correct) setCorrectCount((c) => c + 1)
    else setWrongCount((c) => c + 1)
    setGraded(correct ? 'correct' : 'wrong')
  }

  function next() {
    setInput('')
    setPastInput('')
    setParticipleInput('')
    setGraded(null)
    setIndex((i) => i + 1)
  }

  if (!words) {
    return <LoadState />
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

  const isIrregular = word.kind === 'irregular'
  const needsParticiple =
    isIrregular &&
    profile.quizParticiple !== false &&
    Boolean(word.pastParticiple) &&
    word.pastParticiple !== '-'

  return (
    <div className="learn-session">
      <button type="button" className="icon-button learn-session__exit" onClick={onExit} aria-label="Exit">
        ✕
      </button>

      <div className="card prompt-card">
        <span className="flashcard__label">
          {isIrregular ? (needsParticiple ? 'Past simple & past participle' : 'Past simple') : 'Translate to German'}
        </span>
        <span className="flashcard__word">{word.english}</span>
        {!isIrregular && word.example && <span className="flashcard__example">{word.example}</span>}
      </div>

      <div className="progress">
        Card {index + 1} of {queue?.length}
      </div>

      {graded === null ? (
        isIrregular ? (
          <form
            className="answer-form answer-form--stack"
            onSubmit={(e) => {
              e.preventDefault()
              void submit()
            }}
          >
            <input
              className="input answer-input"
              value={pastInput}
              onChange={(e) => setPastInput(e.target.value)}
              placeholder="Past simple"
              autoFocus
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {needsParticiple && (
              <input
                className="input answer-input"
                value={participleInput}
                onChange={(e) => setParticipleInput(e.target.value)}
                placeholder="Past participle"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            )}
            <button
              type="submit"
              className="btn btn--primary"
              disabled={!pastInput.trim() || (needsParticiple && !participleInput.trim())}
            >
              Check
            </button>
          </form>
        ) : (
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
        )
      ) : (
        <div className={`answer-feedback answer-feedback--${graded}`}>
          <div className="answer-feedback__status">{graded === 'correct' ? 'Correct!' : 'Not quite.'}</div>
          <div className="answer-feedback__correct">
            {isIrregular ? (
              <>
                Answer: <strong>{needsParticiple ? `${word.pastSimple} · ${word.pastParticiple}` : word.pastSimple}</strong>
                {graded === 'wrong' && word.german && (
                  <>
                    <br />
                    Meaning: <strong>{word.german}</strong>
                  </>
                )}
              </>
            ) : (
              <>
                Answer: <strong>{word.german}</strong>
              </>
            )}
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
