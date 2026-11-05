import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Profile } from '../db'
import { calcStreak, todayKey } from '../lib/dates'
import { MAX_BOX } from '../lib/leitner'

interface Props {
  profile: Profile
  onStart: () => void
  onGoVocab: () => void
}

export function Dashboard({ profile, onStart, onGoVocab }: Props) {
  const profileId = profile.id!
  const words = useLiveQuery(() => db.vocabulary.where('profileId').equals(profileId).toArray(), [profileId])
  const studyRows = useLiveQuery(() => db.studyStats.where('profileId').equals(profileId).toArray(), [profileId])

  if (!words || !studyRows) {
    return <div className="loading">Loading…</div>
  }

  const now = Date.now()
  const total = words.length
  const dueCount = words.filter((w) => w.dueDate <= now).length
  const todayRow = studyRows.find((r) => r.studyDate === todayKey())
  const reviewedToday = todayRow?.reviewedCount ?? 0
  const streak = calcStreak(new Set(studyRows.map((r) => r.studyDate)))

  const boxCounts = new Array<number>(MAX_BOX + 1).fill(0)
  for (const w of words) {
    const box = Math.min(Math.max(w.box, 1), MAX_BOX)
    boxCounts[box]++
  }

  return (
    <section>
      <h2>Hello, {profile.name}</h2>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-card__value">{dueCount}</span>
          <span className="stat-card__label">Due today</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{total}</span>
          <span className="stat-card__label">Words</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{streak}</span>
          <span className="stat-card__label">Day streak</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{reviewedToday}</span>
          <span className="stat-card__label">Reviewed today</span>
        </div>
      </div>

      <div className="card box-panel">
        <h3>Boxes</h3>
        <div className="box-row">
          {boxCounts.slice(1).map((count, i) => (
            <div key={i} className="box">
              <span className="box__count">{count}</span>
              <span className="box__label">Box {i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {total === 0 ? (
        <div className="card empty">
          <p>No vocabulary yet.</p>
          <p>Import a CSV file with your own words to get started.</p>
          <button type="button" className="btn btn--primary" onClick={onGoVocab}>
            Go to Vocabulary
          </button>
        </div>
      ) : dueCount === 0 ? (
        <div className="card">
          <p>All caught up — nothing is due right now.</p>
        </div>
      ) : (
        <button type="button" className="btn btn--primary btn--block" onClick={onStart}>
          Start learning ({dueCount})
        </button>
      )}
    </section>
  )
}
