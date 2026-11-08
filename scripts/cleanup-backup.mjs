#!/usr/bin/env node
/**
 * Cleans up a NorasApp backup JSON by removing duplicate vocabulary entries.
 *
 * A card counts as a duplicate when another card in the same profile shares the
 * same `kind` and `english` (case-insensitive). The entry with the most learning
 * progress is kept (highest box, then most reviews, then lowest id).
 *
 * Usage:
 *   node scripts/cleanup-backup.mjs backup.json
 *   node scripts/cleanup-backup.mjs backup.json output.json
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const inputPath = process.argv[2]
if (!inputPath) {
  console.error('Usage: node scripts/cleanup-backup.mjs <backup.json> [output.json]')
  process.exit(1)
}
const outputPath = process.argv[3] ?? inputPath.replace(/\.json$/i, '-cleaned.json')

const backup = JSON.parse(readFileSync(resolve(inputPath), 'utf8'))
const vocabulary = Array.isArray(backup.vocabulary) ? backup.vocabulary : []

const groups = new Map()
for (const w of vocabulary) {
  const key = `${w.profileId}:${w.kind ?? 'word'}:${String(w.english ?? '').trim().toLowerCase()}`
  const list = groups.get(key)
  if (list) list.push(w)
  else groups.set(key, [w])
}

const kept = []
let removed = 0
for (const list of groups.values()) {
  list.sort((a, b) => {
    const pa = (a.box ?? 1) * 1000 + ((a.correctCount ?? 0) + (a.wrongCount ?? 0))
    const pb = (b.box ?? 1) * 1000 + ((b.correctCount ?? 0) + (b.wrongCount ?? 0))
    if (pa !== pb) return pb - pa
    return (a.id ?? Number.MAX_SAFE_INTEGER) - (b.id ?? Number.MAX_SAFE_INTEGER)
  })
  kept.push(list[0])
  removed += list.length - 1
}

backup.vocabulary = kept
writeFileSync(resolve(outputPath), `${JSON.stringify(backup, null, 2)}\n`, 'utf8')

console.log(`Kept ${kept.length} entries, removed ${removed} duplicate(s).`)
console.log(`Wrote ${outputPath}`)
