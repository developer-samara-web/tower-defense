import { forbidden, notFound, readObjectId, withUser } from '@/lib/api-auth'
import { MapComment } from '@/models/MapComment'
import User from '@/models/User'

type RouteParams = { params: Promise<{ id: string; commentId: string }> }

// Удалить комментарий может автор или администратор.
export async function DELETE(req: Request, { params }: RouteParams) {
	return withUser(req, async (payload) => {
		const { id, commentId } = await params
		if (!readObjectId(id) || !readObjectId(commentId)) {
			return notFound('Комментарий не найден')
		}

		const comment = await MapComment.findOne({ _id: commentId, mapId: id })
		if (!comment) return notFound('Комментарий не найден')

		const viewer = await User.findById(payload.userId).select('role')
		const mine = comment.authorId.toString() === payload.userId
		if (!mine && viewer?.role !== 'admin') {
			return forbidden('Удалить комментарий может только автор')
		}

		await comment.deleteOne()

		return Response.json({ ok: true })
	})
}
