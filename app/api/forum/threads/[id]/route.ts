import { connectDB } from '@/lib/db'
import {
	forbidden,
	notFound,
	readObjectId,
	serverError,
	withUser,
} from '@/lib/api-auth'
import {
	loadForumAuthors,
	loadForumMaps,
	toForumPost,
	toForumThread,
} from '@/lib/forum-store'
import { ForumPost } from '@/models/ForumPost'
import { ForumThread } from '@/models/ForumThread'
import User from '@/models/User'

type RouteParams = { params: Promise<{ id: string }> }

const POST_LIMIT = 300

// Тема и её ответы. Чтение открыто всем, как и лента разделов.
export async function GET(_req: Request, { params }: RouteParams) {
	try {
		await connectDB()

		const { id } = await params
		if (!readObjectId(id)) return notFound('Тема не найдена')

		const thread = await ForumThread.findById(id)
		if (!thread) return notFound('Тема не найдена')

		const posts = await ForumPost.find({ threadId: id })
			.sort({ createdAt: 1 })
			.limit(POST_LIMIT)

		const authors = await loadForumAuthors([
			thread.authorId,
			...posts.map((post) => post.authorId),
		])
		const maps = await loadForumMaps([thread.mapId])

		return Response.json({
			thread: {
				...toForumThread(
					thread,
					authors.get(thread.authorId.toString()),
					thread.mapId ? maps.get(thread.mapId.toString()) : null,
				),
				posts: posts.map((post) =>
					toForumPost(post, authors.get(post.authorId.toString())),
				),
			},
		})
	} catch (error) {
		return serverError(error)
	}
}

// Удалить тему может её автор или администратор. Ответы уходят вместе
// с темой: отдельные сообщения без заголовка в ленте не нужны.
export async function DELETE(req: Request, { params }: RouteParams) {
	return withUser(req, async (payload) => {
		const { id } = await params
		if (!readObjectId(id)) return notFound('Тема не найдена')

		const thread = await ForumThread.findById(id)
		if (!thread) return notFound('Тема не найдена')

		const viewer = await User.findById(payload.userId).select('role')
		const mine = thread.authorId.toString() === payload.userId
		if (!mine && viewer?.role !== 'admin') {
			return forbidden('Удалить тему может только автор')
		}

		await ForumPost.deleteMany({ threadId: id })
		await thread.deleteOne()

		return Response.json({ ok: true })
	})
}
