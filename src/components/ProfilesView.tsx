import { db, type Profile } from '../db'
import { ProfileForm } from './ProfileForm'

interface Props {
  profiles: Profile[]
  activeId: number | null
  onSelect: (id: number) => void
}

export function ProfilesView({ profiles, activeId, onSelect }: Props) {
  async function removeProfile(id: number) {
    const profile = profiles.find((p) => p.id === id)
    if (!profile) return
    if (!window.confirm(`Delete profile “${profile.name}” and all its vocabulary?`)) return

    await db.transaction('rw', db.profiles, db.vocabulary, db.studyStats, async () => {
      await db.profiles.delete(id)
      await db.vocabulary.where('profileId').equals(id).delete()
      await db.studyStats.where('profileId').equals(id).delete()
    })
  }

  async function toggleParticiple(id: number, value: boolean) {
    await db.profiles.update(id, { quizParticiple: value })
  }

  return (
    <section>
      <h2>Profiles</h2>
      {profiles.length > 0 ? (
        <ul className="profile-list">
          {profiles.map((p) => (
            <li key={p.id} className={`profile-item${p.id === activeId ? ' is-active' : ''}`}>
              <button type="button" className="profile-item__main" onClick={() => onSelect(p.id!)}>
                <span className="profile-dot" style={{ background: p.color }} />
                <span className="profile-item__name">{p.name}</span>
              </button>
              <label className="participle-toggle" title="Quiz past participle for irregular verbs">
                <input
                  type="checkbox"
                  checked={p.quizParticiple !== false}
                  onChange={(e) => void toggleParticiple(p.id!, e.target.checked)}
                />
                Participle
              </label>
              <button
                type="button"
                className="icon-button icon-button--danger"
                onClick={() => removeProfile(p.id!)}
                aria-label={`Delete ${p.name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No profiles yet.</p>
      )}

      <h3>New profile</h3>
      <ProfileForm />
    </section>
  )
}
