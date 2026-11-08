import { useEffect, useState } from 'react'

const LOADING_TIMEOUT_MS = 10000

interface Props {
  label?: string
}

/**
 * Shows the "Loading…" state but fails over to an actionable error message when
 * loading takes too long or IndexedDB is unavailable, instead of hanging forever.
 */
export function LoadState({ label = 'Loading…' }: Props) {
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), LOADING_TIMEOUT_MS)
    return () => clearTimeout(id)
  }, [])

  const indexedDBUnavailable = !('indexedDB' in globalThis)

  if (!timedOut && !indexedDBUnavailable) {
    return <div className="loading">{label}</div>
  }

  return (
    <div className="card error-state" role="alert">
      <h3>Something went wrong</h3>
      <p className="muted">
        {indexedDBUnavailable
          ? 'NorasApp needs local storage (IndexedDB) to save your vocabulary, but it is not available in this browser.'
          : 'Loading took longer than expected. Your data may be temporarily unavailable — please try again.'}
      </p>
      <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
        Reload
      </button>
    </div>
  )
}
