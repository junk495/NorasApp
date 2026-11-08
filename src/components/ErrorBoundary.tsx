import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Catches render-time errors (e.g. a failed IndexedDB query re-thrown by
 * useLiveQuery) and shows a friendly fallback instead of a blank screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('NorasApp crashed:', error, info)
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="app">
          <header className="app__header">
            <h1>NorasApp</h1>
          </header>
          <main className="app__main">
            <div className="card error-state" role="alert">
              <h2>Something went wrong</h2>
              <p className="muted">{this.state.error.message}</p>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => window.location.reload()}
              >
                Reload
              </button>
            </div>
          </main>
        </div>
      )
    }
    return this.props.children
  }
}
