import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { Dashboard } from './components/Dashboard'
import { LearnSession } from './components/LearnSession'
import { LoadState } from './components/LoadState'
import { VocabManager } from './components/VocabManager'
import { ProfilesView } from './components/ProfilesView'
import { ProfileForm } from './components/ProfileForm'
import { UpdatePrompt } from './components/UpdatePrompt'

const ACTIVE_PROFILE_KEY = 'norasapp.activeProfileId'

type Tab = 'learn' | 'vocab' | 'profiles'

export default function App() {
  const profiles = useLiveQuery(() => db.profiles.toArray(), [])
  const [activeId, setActiveId] = useState<number | null>(() => {
    const raw = localStorage.getItem(ACTIVE_PROFILE_KEY)
    const n = raw ? Number(raw) : NaN
    return Number.isFinite(n) ? n : null
  })
  const [tab, setTab] = useState<Tab>('learn')
  const [inSession, setInSession] = useState(false)

  useEffect(() => {
    if (!profiles) return
    if (profiles.length === 0) {
      if (activeId !== null) {
        setActiveId(null)
        localStorage.removeItem(ACTIVE_PROFILE_KEY)
      }
      return
    }
    if (activeId === null || !profiles.some((p) => p.id === activeId)) {
      const firstId = profiles[0].id!
      setActiveId(firstId)
      localStorage.setItem(ACTIVE_PROFILE_KEY, String(firstId))
    }
  }, [profiles, activeId])

  if (!profiles) {
    return (
      <div className="app">
        <LoadState />
      </div>
    )
  }

  if (profiles.length === 0) {
    return (
      <div className="app">
        <header className="app__header">
          <h1>NorasApp</h1>
          <p className="app__tagline">Learn smarter — offline.</p>
        </header>
        <main className="app__main">
          <div className="card">
            <h2>Create your first profile</h2>
            <p className="muted">Each profile has its own vocabulary and progress.</p>
            <ProfileForm />
          </div>
        </main>
        <footer className="app__footer">
          <span>Version {__APP_VERSION__}</span>
        </footer>
        <UpdatePrompt />
      </div>
    )
  }

  const activeProfile = profiles.find((p) => p.id === activeId) ?? profiles[0]

  return (
    <div className="app">
      <header className="app__header">
        <h1>NorasApp</h1>
        <p className="app__tagline">Learn smarter — offline.</p>
      </header>

      <main className="app__main">
        {inSession ? (
          <LearnSession profile={activeProfile} onExit={() => setInSession(false)} />
        ) : (
          <>
            {tab === 'learn' && (
              <Dashboard
                profile={activeProfile}
                onStart={() => setInSession(true)}
                onGoVocab={() => setTab('vocab')}
              />
            )}
            {tab === 'vocab' && <VocabManager profile={activeProfile} />}
            {tab === 'profiles' && (
              <ProfilesView
                profiles={profiles}
                activeId={activeId}
                onSelect={(id) => {
                  setActiveId(id)
                  localStorage.setItem(ACTIVE_PROFILE_KEY, String(id))
                }}
              />
            )}
          </>
        )}
      </main>

      {!inSession && (
        <nav className="tabbar">
          <button
            type="button"
            className={`tabbar__item${tab === 'learn' ? ' is-active' : ''}`}
            onClick={() => setTab('learn')}
          >
            Learn
          </button>
          <button
            type="button"
            className={`tabbar__item${tab === 'vocab' ? ' is-active' : ''}`}
            onClick={() => setTab('vocab')}
          >
            Vocabulary
          </button>
          <button
            type="button"
            className={`tabbar__item${tab === 'profiles' ? ' is-active' : ''}`}
            onClick={() => setTab('profiles')}
          >
            Profiles
          </button>
        </nav>
      )}

      <footer className="app__footer">
        <span>Version {__APP_VERSION__}</span>
      </footer>

      <UpdatePrompt />
    </div>
  )
}
