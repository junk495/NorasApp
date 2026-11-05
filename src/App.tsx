import { UpdatePrompt } from './components/UpdatePrompt'

export default function App() {
  return (
    <div className="app">
      <header className="app__header">
        <h1>NorasApp</h1>
        <p className="app__tagline">Learn smarter — offline.</p>
      </header>

      <main className="app__main">
        <section className="card">
          <h2>Welcome</h2>
          <p>
            Your vocabulary trainer is on the way. This first version sets up
            the offline-capable foundation of NorasApp.
          </p>
        </section>
      </main>

      <footer className="app__footer">
        <span>Version {__APP_VERSION__}</span>
      </footer>

      <UpdatePrompt />
    </div>
  )
}
