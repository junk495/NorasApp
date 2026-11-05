import { useState, type FormEvent } from 'react'
import { db, PROFILE_COLORS } from '../db'

export function ProfileForm({ onCreated }: { onCreated?: (id: number) => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(PROFILE_COLORS[0])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const id = await db.profiles.add({ name: trimmed, color, createdAt: Date.now() })
    setName('')
    onCreated?.(id)
  }

  return (
    <form className="profile-form" onSubmit={handleSubmit}>
      <input
        className="input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        autoFocus
      />
      <div className="color-row">
        {PROFILE_COLORS.map((c) => (
          <button
            type="button"
            key={c}
            className={`color-swatch${c === color ? ' is-active' : ''}`}
            style={{ background: c }}
            onClick={() => setColor(c)}
            aria-label={`Color ${c}`}
          />
        ))}
      </div>
      <button type="submit" className="btn btn--primary" disabled={!name.trim()}>
        Create profile
      </button>
    </form>
  )
}
