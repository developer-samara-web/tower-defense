import type { GameStats } from '@/features/game/domain/game-state'
import type {
  SessionGameState,
  SessionPayload,
} from '@/features/game/domain/session-state'

export async function fetchLatestSession(token: string): Promise<SessionPayload> {
  const res = await fetch('/api/session?sessionId=latest', {
    headers: { Authorization: 'Bearer ' + token },
  })
  return res.json()
}

export async function saveSession(
  token: string,
  data: { mapSeed: string; gameState: SessionGameState; stats: GameStats },
) {
  await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify(data),
  })
}

export async function loadSession(token: string, sessionId: string): Promise<SessionPayload> {
  const res = await fetch(`/api/session?sessionId=${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: 'Bearer ' + token },
  })
  return res.json()
}

export async function deleteSession(token: string) {
  await fetch('/api/session', {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + token },
  })
}
