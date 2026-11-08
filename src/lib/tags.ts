import type { Vocabulary } from '../db'

/** Parses a comma-separated string into trimmed, case-insensitively deduplicated tags. */
export function parseTags(input: string): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of input.split(',')) {
    const tag = raw.trim()
    if (!tag) continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(tag)
  }
  return result
}

/** Joins tags into a single comma-separated string for editing. */
export function formatTags(tags: string[]): string {
  return tags.join(', ')
}

/** Effective tags of a card, falling back to the legacy `category` as a single tag. */
export function tagsOf(vocab: Vocabulary): string[] {
  if (vocab.tags && vocab.tags.length > 0) return vocab.tags
  if (vocab.category) return [vocab.category]
  return []
}
