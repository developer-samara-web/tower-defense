import type { GameRecordInput, GamesPage } from '@/features/account/types'

export async function recordGame(token: string, game: GameRecordInput) {
	const res = await fetch('/api/games', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
		body: JSON.stringify(game),
	})

	if (!res.ok) throw new Error('Не удалось сохранить результат игры')
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
