import { useRegisterSW } from 'virtual:pwa-register/react'

/** How often to poll the service worker for a new app version. */
const UPDATE_CHECK_INTERVAL_MS = 60 * 1000

/**
 * Registers the service worker, periodically checks for a new app version and
 * shows a toast when one is available. The version lives in package.json and is
 * embedded via __APP_VERSION__ (see vite.config.cts); a version change alters
 * the bundle hash, which the service worker detects.
 */
export function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      setInterval(() => {
        registration.update().catch((error) => {
          console.error('Service worker update check failed:', error)
        })
      }, UPDATE_CHECK_INTERVAL_MS)
    },
    onRegisterError(error) {
      console.error('Service worker registration failed:', error)
    },
  })

  if (!offlineReady && !needRefresh) {
    return null
  }

  return (
    <div className="update-toast" role="alert">
      <div className="update-toast__text">
        {needRefresh ? 'A new version is available.' : 'App is ready to work offline.'}
      </div>
      <div className="update-toast__actions">
        {needRefresh && (
          <button
            type="button"
            className="update-toast__button update-toast__button--primary"
            onClick={() => updateServiceWorker(true)}
          >
            Update
          </button>
        )}
        <button
          type="button"
          className="update-toast__button"
          onClick={() => {
            setOfflineReady(false)
            setNeedRefresh(false)
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
