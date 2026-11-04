import type {
	ForumCategory,
	ForumPostView,
	ForumThreadDetail,
	ForumThreadSummary,
} from '@/types'
import { readOk } from './api-error'

// Лента раздела. category не передаём — сервер вернёт все темы:
// так можно показать общий поток, если понадобится.
export async function fetchForumThreads(
	category?: ForumCategory,
): Promise<ForumThreadSummary[]> {
	const query = category ? `?category=${encodeURIComponent(category)}` : ''
	const res = await fetch(`/api/forum/threads${query}`)
	const data = await readOk<{ threads?: ForumThreadSummary[] }>(
		res,
		'Не удалось загрузить форум',
	)
	return Array.isArray(data.threads) ? data.threads : []
}

export async function fetchForumThread(id: string): Promise<ForumThreadDetail> {
	const res = await fetch(`/api/forum/threads/${encodeURIComponent(id)}`)
	const data = await readOk<{ thread?: ForumThreadDetail }>(
		res,
		'Не удалось загрузить тему',
	)
	if (!data.thread) throw new Error('Не удалось загрузить тему')
	return data.thread
}

export type CreateThreadInput = {
	category: ForumCategory
	title: string
	body: string
	mapId?: string | null
}

export async function createForumThread(
	token: string,
	input: CreateThreadInput,
): Promise<ForumThreadSummary> {
	const res = await fetch('/api/forum/threads', {
		method: 'POST',
		headers: {
			Authorization: 'Bearer ' + token,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(input),
	})

	const data = await readOk<{ thread?: ForumThreadSummary }>(
		res,
		'Не удалось создать тему',
	)
	if (!data.thread) throw new Error('Не удалось создать тему')
	return data.thread
}

export async function createForumPost(
	token: string,
	threadId: string,
	body: string,
): Promise<ForumPostView> {
	const res = await fetch(
		`/api/forum/threads/${encodeURIComponent(threadId)}/posts`,
		{
			method: 'POST',
			headers: {
				Authorization: 'Bearer ' + token,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ body }),
		},
	)

	const data = await readOk<{ post?: ForumPostView }>(
		res,
		'Не удалось отправить сообщение',
	)
	if (!data.post) throw new Error('Не удалось отправить сообщение')
	return data.post
}

export async function deleteForumThread(token: string, id: string): Promise<void> {
	const res = await fetch(`/api/forum/threads/${encodeURIComponent(id)}`, {
		method: 'DELETE',
		headers: { Authorization: 'Bearer ' + token },
	})
	await readOk<unknown>(res, 'Не удалось удалить тему')
}

export async function deleteForumPost(token: string, id: string): Promise<void> {
	const res = await fetch(`/api/forum/posts/${encodeURIComponent(id)}`, {
		method: 'DELETE',
		headers: { Authorization: 'Bearer ' + token },
	})
	await readOk<unknown>(res, 'Не удалось удалить сообщение')
}
