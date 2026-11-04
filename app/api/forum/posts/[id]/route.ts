import { forbidden, notFound, readObjectId, withUser } from '@/lib/api-auth'
import { ForumPost } from '@/models/ForumPost'
import { ForumThread } from '@/models/ForumThread'
import User from '@/models/User'

type RouteParams = { params: Promise<{ id: string }> }

// Удалить ответ может автор или администратор. Счётчик темы уменьшаем,
// чтобы лента не показывала число сообщений, которых уже нет.
export async function DELETE(req: Request, { params }: RouteParams) {
	return withUser(req, async (payload) => {
		const { id } = await params
		if (!readObjectId(id)) return notFound('Сообщение не найдено')

		const post = await ForumPost.findById(id)
		if (!post) return notFound('Сообщение не найдено')

		const viewer = await User.findById(payload.userId).select('role')
		const mine = post.authorId.toString() === payload.userId
		if (!mine && viewer?.role !== 'admin') {
			return forbidden('Удалить сообщение может только автор')
		}

		await post.deleteOne()
		await ForumThread.updateOne(
			{ _id: post.threadId, postCount: { $gt: 0 } },
			{ $inc: { postCount: -1 } },
		)

		return Response.json({ ok: true })
	})
}
