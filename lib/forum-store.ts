import { DEFAULT_AVATAR, DEFAULT_FRAME } from '@/lib/account/avatar-options'
import { NO_TITLE } from '@/lib/account/title-options'
import type {
	ForumAuthor,
	ForumCategory,
	ForumMapRef,
	ForumPostView,
	ForumThreadSummary,
	MapCommentView,
} from '@/types'
import { GameMap } from '@/models/GameMap'
import User from '@/models/User'

export const THREAD_TITLE_MAX = 120
export const THREAD_BODY_MAX = 4000
export const MAP_COMMENT_MAX = 2000

export type StoredAuthor = {
	_id: { toString(): string }
	login: string
	avatar?: string
	avatarFrame?: string
	title?: string
	role?: string
}

export type StoredThread = {
	_id: { toString(): string }
	category: string
	title: string
	body: string
	authorId: { toString(): string }
	mapId?: { toString(): string } | null
	pinned?: boolean
	postCount?: number
	createdAt: Date
	lastPostAt?: Date
}

export type StoredPost = {
	_id: { toString(): string }
	authorId: { toString(): string }
	body: string
	createdAt: Date
}

export type StoredMapComment = {
	_id: { toString(): string }
	authorId: { toString(): string }
	body: string
	createdAt: Date
}

const DELETED_AUTHOR: ForumAuthor = {
	id: 'deleted',
	login: 'Удалённый игрок',
	avatar: DEFAULT_AVATAR,
	avatarFrame: DEFAULT_FRAME,
	title: NO_TITLE,
	role: 'user',
}

// Автор мог удалить аккаунт, а сообщение осталось. Тогда показываем
// нейтральную подпись, а не пустую строку и битую аватарку.
export function toForumAuthor(author: StoredAuthor | null | undefined): ForumAuthor {
	if (!author) return DELETED_AUTHOR

	return {
		id: author._id.toString(),
		login: author.login,
		avatar: author.avatar || DEFAULT_AVATAR,
		avatarFrame: author.avatarFrame || DEFAULT_FRAME,
		title: author.title || NO_TITLE,
		role: author.role === 'admin' ? 'admin' : 'user',
	}
}

export function toForumThread(
	thread: StoredThread,
	author: StoredAuthor | null | undefined,
	map: { _id: { toString(): string }; name: string } | null | undefined,
): ForumThreadSummary {
	return {
		id: thread._id.toString(),
		category: thread.category as ForumCategory,
		title: thread.title,
		body: thread.body,
		author: toForumAuthor(author),
		map: map ? ({ id: map._id.toString(), name: map.name } satisfies ForumMapRef) : null,
		pinned: Boolean(thread.pinned),
		postCount: thread.postCount ?? 0,
		createdAt: thread.createdAt.toISOString(),
		lastPostAt: (thread.lastPostAt ?? thread.createdAt).toISOString(),
	}
}

export function toForumPost(
	post: StoredPost,
	author: StoredAuthor | null | undefined,
): ForumPostView {
	return {
		id: post._id.toString(),
		body: post.body,
		author: toForumAuthor(author),
		createdAt: post.createdAt.toISOString(),
	}
}

export function toMapComment(
	comment: StoredMapComment,
	author: StoredAuthor | null | undefined,
): MapCommentView {
	return {
		id: comment._id.toString(),
		body: comment.body,
		author: toForumAuthor(author),
		createdAt: comment.createdAt.toISOString(),
	}
}

// Логины, аватары и титулы авторов подтягиваем одним запросом: populate
// с нетипизированными моделями форума ведёт себя непредсказуемо.
export async function loadForumAuthors(
	ids: Array<{ toString(): string } | null | undefined>,
): Promise<Map<string, StoredAuthor>> {
	const unique = Array.from(
		new Set(ids.filter((id): id is { toString(): string } => Boolean(id)).map((id) => id.toString())),
	)
	if (unique.length === 0) return new Map()

	const users = await User.find({ _id: { $in: unique } })
		.select('login avatar avatarFrame title role')
		.lean<StoredAuthor[]>()

	return new Map(users.map((user) => [user._id.toString(), user]))
}

export async function loadForumMaps(
	ids: Array<{ toString(): string } | null | undefined>,
): Promise<Map<string, { _id: { toString(): string }; name: string }>> {
	const unique = Array.from(
		new Set(ids.filter((id): id is { toString(): string } => Boolean(id)).map((id) => id.toString())),
	)
	if (unique.length === 0) return new Map()

	const maps = await GameMap.find({ _id: { $in: unique } })
		.select('name')
		.lean<Array<{ _id: { toString(): string }; name: string }>>()

	return new Map(maps.map((map) => [map._id.toString(), map]))
}
