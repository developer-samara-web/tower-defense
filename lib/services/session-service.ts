import type { GameStats } from '@/features/game/domain/game-state'
import type {
  SessionGameState,
  SessionPayload,
} from '@/features/game/domain/session-state'
import { readOk } from './api-error'

// Сохранений нет — это не ошибка: у нового игрока пустой аккаунт.
export async function fetchLatestSession(token: string): Promise<SessionPayload | null> {
  const res = await fetch('/api/session?sessionId=latest', {
    headers: { Authorization: 'Bearer ' + token },
  })
  if (res.status === 404) return null
  return readOk<SessionPayload>(res, 'Не удалось загрузить сохранение')
}

export async function saveSession(
  token: string,
  data: { mapSeed: string; gameState: SessionGameState; stats: GameStats },
) {
  const res = await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify(data),
  })
  await readOk<{ sessionId: string }>(res, 'Не удалось сохранить игру')
}

export async function loadSession(token: string, sessionId: string): Promise<SessionPayload> {
  const res = await fetch(`/api/session?sessionId=${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: 'Bearer ' + token },
  })
  return readOk<SessionPayload>(res, 'Нет доступа к этой игре')
}

export async function deleteSession(token: string) {
  const res = await fetch('/api/session', {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + token },
  })
  await readOk<{ deleted: boolean }>(res, 'Не удалось удалить сохранение')
}
