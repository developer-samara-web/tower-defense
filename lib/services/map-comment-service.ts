import type { MapCommentView } from '@/types'
import { readOk } from './api-error'

// Комментарии карты читаются без токена: страница карты открыта
// авторизованным игрокам, но сам список — публичные отзывы.
export async function fetchMapComments(mapId: string): Promise<MapCommentView[]> {
	const res = await fetch(`/api/maps/${encodeURIComponent(mapId)}/comments`)
	const data = await readOk<{ comments?: MapCommentView[] }>(
		res,
		'Не удалось загрузить комментарии',
	)
	return Array.isArray(data.comments) ? data.comments : []
}

export async function addMapComment(
	token: string,
	mapId: string,
	body: string,
): Promise<MapCommentView> {
	const res = await fetch(`/api/maps/${encodeURIComponent(mapId)}/comments`, {
		method: 'POST',
		headers: {
			Authorization: 'Bearer ' + token,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ body }),
	})

	const data = await readOk<{ comment?: MapCommentView }>(
		res,
		'Не удалось отправить комментарий',
	)
	if (!data.comment) throw new Error('Не удалось отправить комментарий')
	return data.comment
}

export async function deleteMapComment(
	token: string,
	mapId: string,
	commentId: string,
): Promise<void> {
	const res = await fetch(
		`/api/maps/${encodeURIComponent(mapId)}/comments/${encodeURIComponent(commentId)}`,
		{
			method: 'DELETE',
			headers: { Authorization: 'Bearer ' + token },
		},
	)
	await readOk<unknown>(res, 'Не удалось удалить комментарий')
}
