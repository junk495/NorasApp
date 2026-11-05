const ARTICLE_PREFIXES = ['der ', 'die ', 'das ']

/** Lowercase and transliterate German umlauts / ß so typing without them still matches. */
function foldGerman(value: string): string {
  return value
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
}

function stripArticle(value: string): string {
  for (const prefix of ARTICLE_PREFIXES) {
    if (value.startsWith(prefix)) return value.slice(prefix.length)
  }
  return value
}

/** Normalizes a typed or stored answer for a forgiving comparison. */
export function normalizeAnswer(value: string): string {
  let s = foldGerman(value)
  s = s.replace(/\s+/g, ' ').trim()
  s = s.replace(/[.,;:!?]+$/, '').trim()
  return stripArticle(s)
}

/**
 * Returns true when the typed answer matches the stored answer.
 * The stored answer may contain several alternatives separated by `,`, `;`, `/` or `|`.
 */
export function answersMatch(typed: string, correct: string): boolean {
  const typedNorm = normalizeAnswer(typed)
  if (!typedNorm) return false

  const alternatives = correct
    .split(/[,;/|]/)
    .map((a) => normalizeAnswer(a))
    .filter(Boolean)

  return alternatives.some((alt) => alt === typedNorm)
}
