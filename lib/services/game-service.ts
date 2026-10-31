import type { GameRecordInput, GamesPage } from '@/features/account/types'
import type { MapRunScore } from '@/types'

// Сервер возвращает очки топа карты: по ним интерфейс показывает место
// игрока сразу после финиша, без второго запроса.
export async function recordGame(
	token: string,
	game: GameRecordInput,
): Promise<MapRunScore | null> {
	const res = await fetch('/api/games', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
		body: JSON.stringify(game),
	})

	if (!res.ok) throw new Error('Не удалось сохранить результат игры')

	const data = await res.json().catch(() => null)
	return (data?.mapScore as MapRunScore | undefined) ?? null
}

export async function fetchGames(
	token: string,
	options: { limit?: number; cursor?: string | null } = {},
): Promise<GamesPage> {
	const params = new URLSearchParams({ limit: String(options.limit ?? 10) })
	if (options.cursor) params.set('cursor', options.cursor)

	const res = await fetch(`/api/games?${params.toString()}`, {
		headers: { Authorization: 'Bearer ' + token },
	})

	if (!res.ok) throw new Error('Не удалось загрузить историю игр')
	return res.json()
}
