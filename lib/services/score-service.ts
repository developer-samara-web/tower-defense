import { ScoreEntry } from '@/types'

const SCORE_KEY = 'tower-defense:scores'
const MAX = 8

export function readLocalScores(): ScoreEntry[] {
  try {
    const s = localStorage.getItem(SCORE_KEY)
    if (s) {
      const arr = JSON.parse(s) as ScoreEntry[]
      return Array.isArray(arr) ? arr.slice(0, MAX) : []
    }
  } catch { return [] }
  return []
}

export function saveLocalScore(wave: number, gold: number) {
  const list = [{ id: crypto.randomUUID(), wave, gold, createdAt: new Date().toISOString() }, ...readLocalScores()].sort((a, b) => b.wave - a.wave || b.gold - a.gold).slice(0, MAX)
  try { localStorage.setItem(SCORE_KEY, JSON.stringify(list)) } catch { }
}

export async function fetchTopScores(limit = 8) {
  const res = await fetch(`/api/scores/top?limit=${limit}`)
  const data = await res.json()
  return data.scores || readLocalScores()
}

export async function updateUserScore(token: string, gold: number, wave: number) {
  await fetch('/api/scores/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ gold, wave }),
  }).catch(() => {})
}
