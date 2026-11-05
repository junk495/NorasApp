import { db, type Profile } from '../db'
import { ProfileForm } from './ProfileForm'
import { buildBackup, downloadTextFile } from '../lib/export'

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

  async function exportBackup() {
    const backup = await buildBackup()
    const date = new Date().toISOString().slice(0, 10)
    downloadTextFile(`norasapp-backup-${date}.json`, JSON.stringify(backup, null, 2), 'application/json')
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

      <div className="card">
        <h3>Backup</h3>
        <p className="muted">Download all profiles, vocabulary and learning progress as a JSON file.</p>
        <button type="button" className="btn" onClick={exportBackup}>
          Export backup (JSON)
        </button>
      </div>
    </section>
  )
}
