import type { MapDetail, MapLeaderboard, MapSummary } from '@/types'
import type { MapDraft } from '@/features/game/engine/map/custom-map'

// Разделы библиотеки карт. «pending» доступен только администратору.
export type MapTab = 'rated' | 'unrated' | 'mine' | 'pending'

export async function fetchMaps(
	token: string,
	tab: MapTab = 'mine',
): Promise<MapSummary[]> {
	const res = await fetch(`/api/maps?tab=${tab}`, {
		headers: { Authorization: 'Bearer ' + token },
	})

	if (!res.ok) throw new Error('Не удалось загрузить карты')

	const data = await res.json()
	return Array.isArray(data.maps) ? data.maps : []
}

export async function fetchMap(token: string, id: string): Promise<MapDetail> {
	const res = await fetch(`/api/maps/${encodeURIComponent(id)}`, {
		headers: { Authorization: 'Bearer ' + token },
	})

	if (res.status === 404) throw new Error('Карта не найдена')
	if (!res.ok) throw new Error('Не удалось загрузить карту')

	const data = await res.json()
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
	if (!res.ok) throw new Error('Не удалось загрузить топ карты')
	return res.json()
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

	if (!res.ok) {
		const data = await res.json().catch(() => null)
		throw new Error(
			typeof data?.error === 'string' ? data.error : 'Не удалось сохранить карту',
		)
	}

	const data = await res.json()
	if (!data.map) throw new Error('Не удалось сохранить карту')
	return data.map
}

// Случайная одобренная рейтинговая карта для рейтингового захода.
export async function fetchRatedMap(token: string): Promise<MapSummary> {
	const res = await fetch('/api/maps/rated', {
		headers: { Authorization: 'Bearer ' + token },
	})

	const data = await res.json().catch(() => null)
	if (!res.ok) {
		throw new Error(
			typeof data?.error === 'string' ? data.error : 'Не удалось найти рейтинговую карту',
		)
	}
	if (!data?.map) throw new Error('Не удалось найти рейтинговую карту')
	return data.map as MapSummary
}

export async function createMap(token: string): Promise<MapSummary> {
	const res = await fetch('/api/maps', {
		method: 'POST',
		headers: { Authorization: 'Bearer ' + token },
	})

	if (!res.ok) throw new Error('Не удалось создать карту')

	const data = await res.json()
	if (!data.map) throw new Error('Не удалось создать карту')
	return data.map
}

// Отправка на модерацию: сервер сам проверит, что карта проходима.
export async function submitMap(token: string, id: string): Promise<MapSummary> {
	const res = await fetch(`/api/maps/${encodeURIComponent(id)}/submit`, {
		method: 'POST',
		headers: { Authorization: 'Bearer ' + token },
	})

	if (!res.ok) {
		const data = await res.json().catch(() => null)
		throw new Error(
			typeof data?.error === 'string' ? data.error : 'Не удалось отправить карту',
		)
	}

	const data = await res.json()
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

	if (!res.ok) {
		const data = await res.json().catch(() => null)
		throw new Error(
			typeof data?.error === 'string' ? data.error : 'Не удалось обновить карту',
		)
	}

	const data = await res.json()
	if (!data.map) throw new Error('Не удалось обновить карту')
	return data.map
}

export async function deleteMap(token: string, id: string): Promise<void> {
	const res = await fetch(`/api/maps/${encodeURIComponent(id)}`, {
		method: 'DELETE',
		headers: { Authorization: 'Bearer ' + token },
	})

	if (!res.ok) {
		const data = await res.json().catch(() => null)
		throw new Error(
			typeof data?.error === 'string' ? data.error : 'Не удалось удалить карту',
		)
	}
}
