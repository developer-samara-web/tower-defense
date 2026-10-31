import type { PlayerBestMaps, ScoreEntry } from '@/types'

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

// mapId — карта забега: рейтинг двигают только одобренные рейтинговые карты.
export async function updateUserScore(token: string, gold: number, wave: number, mapId?: string | null) {
  await fetch('/api/scores/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ gold, wave, mapId: mapId ?? null }),
  }).catch(() => {})
}

// Рекорды игрока по картам для профиля. null — если авторизации нет или сервер недоступен.
export async function fetchBestMaps(token: string, limit = 8): Promise<PlayerBestMaps | null> {
  try {
    const res = await fetch(`/api/scores/best-maps?limit=${limit}`, { headers: { Authorization: 'Bearer ' + token } })
    if (!res.ok) return null
    const data = (await res.json()) as Partial<PlayerBestMaps>
    return {
      maps: Array.isArray(data.maps) ? data.maps : [],
      ratingPoints: Number(data.ratingPoints) || 0,
      rank: Number(data.rank) || 0,
      ratedMaps: Number(data.ratedMaps) || 0,
    }
  } catch { return null }
}
