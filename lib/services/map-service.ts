import type { MapDetail, MapLeaderboard, MapSummary } from '@/types'
import type { MapDraft } from '@/features/game/engine/map/custom-map'
import { readOk } from './api-error'

// Разделы библиотеки карт. «pending» доступен только администратору.
export type MapTab = 'rated' | 'unrated' | 'mine' | 'pending'

export async function fetchMaps(
	token: string,
	tab: MapTab = 'mine',
): Promise<MapSummary[]> {
	const res = await fetch(`/api/maps?tab=${tab}`, {
		headers: { Authorization: 'Bearer ' + token },
	})

	const data = await readOk<{ maps?: MapSummary[] }>(res, 'Не удалось загрузить карты')
	return Array.isArray(data.maps) ? data.maps : []
}

export async function fetchMap(token: string, id: string): Promise<MapDetail> {
	const res = await fetch(`/api/maps/${encodeURIComponent(id)}`, {
		headers: { Authorization: 'Bearer ' + token },
	})

	const data = await readOk<{ map?: MapDetail }>(res, 'Не удалось загрузить карту')
	if (!data.map) throw new Error('Не удалось загрузить карту')
	return data.map
}

// Топ конкретной карты. Пустая доска — не ошибка: карта просто ещё никем
// не пройдена, и интерфейс показывает «нет рекордов».
export async function fetchMapBoard(
	token: string,
	id: string,
	limit = 8,
): Promise<MapLeaderboard | null> {
	const res = await fetch(`/api/maps/${encodeURIComponent(id)}/scores?limit=${limit}`, {
		headers: { Authorization: 'Bearer ' + token },
	})

	if (res.status === 404) return null
	return readOk<MapLeaderboard>(res, 'Не удалось загрузить топ карты')
}

export type SaveMapInput = {
	name?: string
	difficulty?: string
	data?: MapDraft
}

export async function saveMap(
	token: string,
	id: string,
	input: SaveMapInput,
): Promise<MapDetail> {
	const res = await fetch(`/api/maps/${encodeURIComponent(id)}`, {
		method: 'PUT',
		headers: {
			Authorization: 'Bearer ' + token,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(input),
	})

	const data = await readOk<{ map?: MapDetail }>(res, 'Не удалось сохранить карту')
	if (!data.map) throw new Error('Не удалось сохранить карту')
	return data.map
}

// Новая своя карта: сервер создаёт пустой черновик и возвращает его id.
export async function createMap(token: string): Promise<MapSummary> {
	const res = await fetch('/api/maps', {
		method: 'POST',
		headers: { Authorization: 'Bearer ' + token },
	})

	const data = await readOk<{ map?: MapSummary }>(res, 'Не удалось создать карту')
	if (!data.map) throw new Error('Не удалось создать карту')
	return data.map
}

// Отправка на модерацию: сервер сам проверит, что карта проходима.
export async function submitMap(token: string, id: string): Promise<MapSummary> {
	const res = await fetch(`/api/maps/${encodeURIComponent(id)}/submit`, {
		method: 'POST',
		headers: { Authorization: 'Bearer ' + token },
	})

	const data = await readOk<{ map?: MapSummary }>(res, 'Не удалось отправить карту')
	if (!data.map) throw new Error('Не удалось отправить карту')
	return data.map
}

export type ModerationInput = {
	moderation?: 'approved' | 'rejected' | 'pending'
	rated?: boolean
}

// Решение модератора: опубликовать как рейтинговую или обычную,
// либо отклонить.
export async function moderateMap(
	token: string,
	id: string,
	input: ModerationInput,
): Promise<MapSummary> {
	const res = await fetch(`/api/maps/${encodeURIComponent(id)}`, {
		method: 'PATCH',
		headers: {
			Authorization: 'Bearer ' + token,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(input),
	})

	const data = await readOk<{ map?: MapSummary }>(res, 'Не удалось обновить карту')
	if (!data.map) throw new Error('Не удалось обновить карту')
	return data.map
}

export async function deleteMap(token: string, id: string): Promise<void> {
	const res = await fetch(`/api/maps/${encodeURIComponent(id)}`, {
		method: 'DELETE',
		headers: { Authorization: 'Bearer ' + token },
	})

	await readOk<unknown>(res, 'Не удалось удалить карту')
}
