import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Shows a toast when the service worker has detected a new app version.
 * The version number itself lives in package.json and is embedded via
 * __APP_VERSION__ (see vite.config.ts). When it changes, the bundle hash
 * changes and `needRefresh` becomes true here.
 */
export function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
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
        {needRefresh
          ? `A new version (${__APP_VERSION__}) is available.`
          : 'App is ready to work offline.'}
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
