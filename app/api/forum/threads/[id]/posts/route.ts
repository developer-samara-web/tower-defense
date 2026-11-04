import {
	badRequest,
	notFound,
	readJsonBody,
	readObjectId,
	withUser,
} from '@/lib/api-auth'
import { readUserText } from '@/lib/forum'
import { THREAD_BODY_MAX, toForumPost } from '@/lib/forum-store'
import { ForumPost } from '@/models/ForumPost'
import { ForumThread } from '@/models/ForumThread'
import User from '@/models/User'

type RouteParams = { params: Promise<{ id: string }> }

// Ответ в теме. Счётчик и дату последней активности двигаем здесь же:
// лента разделов сортируется по ним и не должна пересчитывать всё на лету.
export async function POST(req: Request, { params }: RouteParams) {
	return withUser(req, async (payload) => {
		const { id } = await params
		if (!readObjectId(id)) return notFound('Тема не найдена')

		const thread = await ForumThread.findById(id)
		if (!thread) return notFound('Тема не найдена')

		const body = await readJsonBody(req)
		if (!body) return badRequest()

		const text = readUserText(body.body, THREAD_BODY_MAX, 2)
		if (!text) return badRequest('Сообщение не может быть пустым')

		const post = await ForumPost.create({
			threadId: id,
			authorId: payload.userId,
			body: text,
		})

		thread.postCount = (thread.postCount ?? 0) + 1
		thread.lastPostAt = new Date()
		await thread.save()

		const author = await User.findById(payload.userId)

		return Response.json({ post: toForumPost(post, author) }, { status: 201 })
	})
}
