import type { Vocabulary } from '../db'

/** Days to wait before a card in a given Leitner box becomes due again (index 0 is unused). */
export const BOX_INTERVALS_DAYS = [0, 1, 2, 4, 8, 16] as const

export const MAX_BOX = 5

function daysForBox(box: number): number {
  const clamped = Math.min(Math.max(box, 1), MAX_BOX)
  return BOX_INTERVALS_DAYS[clamped]
}

export function nextDue(box: number, now: number = Date.now()): number {
  return now + daysForBox(box) * 24 * 60 * 60 * 1000
}

/** Applies a Leitner grading to a word and returns the fields to update. */
export function gradeWord(word: Vocabulary, correct: boolean, now: number = Date.now()) {
  const box = correct ? Math.min(word.box + 1, MAX_BOX) : 1
  return {
    box,
    dueDate: nextDue(box, now),
    correctCount: word.correctCount + (correct ? 1 : 0),
    wrongCount: word.wrongCount + (correct ? 0 : 1),
    lastReviewed: now,
  }
}
