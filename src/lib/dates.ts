export function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayKey(): string {
  return dateKey(new Date())
}

/**
 * Number of consecutive study days ending today (or yesterday if today has not
 * been studied yet).
 */
export function calcStreak(studyDates: Set<string>): number {
  let streak = 0
  const d = new Date()
  if (!studyDates.has(dateKey(d))) {
    d.setDate(d.getDate() - 1)
  }
  while (studyDates.has(dateKey(d))) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}
