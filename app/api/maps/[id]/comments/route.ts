import { connectDB } from '@/lib/db'
import {
	badRequest,
	notFound,
	readJsonBody,
	readObjectId,
	serverError,
	withUser,
} from '@/lib/api-auth'
import { readUserText } from '@/lib/forum'
import {
	MAP_COMMENT_MAX,
	loadForumAuthors,
	toMapComment,
} from '@/lib/forum-store'
import { GameMap } from '@/models/GameMap'
import { MapComment } from '@/models/MapComment'
import User from '@/models/User'

type RouteParams = { params: Promise<{ id: string }> }

const COMMENT_LIMIT = 100

// Комментарии читают все: карта уже опубликована, отзывы — часть её
// страницы. Черновики и карты на модерации наружу не отдаём.
export async function GET(_req: Request, { params }: RouteParams) {
	try {
		await connectDB()

		const { id } = await params
		if (!readObjectId(id)) return notFound('Карта не найдена')

		const map = await GameMap.findOne({ _id: id, moderation: 'approved' }).select('_id')
		if (!map) return notFound('Карта не найдена или ещё не опубликована')

		const comments = await MapComment.find({ mapId: id })
			.sort({ createdAt: -1 })
			.limit(COMMENT_LIMIT)

		const authors = await loadForumAuthors(comments.map((comment) => comment.authorId))

		return Response.json({
			comments: comments.map((comment) =>
				toMapComment(comment, authors.get(comment.authorId.toString())),
			),
		})
	} catch (error) {
		return serverError(error)
	}
}

// Новый комментарий: только под опубликованной картой и только с токеном.
export async function POST(req: Request, { params }: RouteParams) {
	return withUser(req, async (payload) => {
		const { id } = await params
		if (!readObjectId(id)) return notFound('Карта не найдена')

		const map = await GameMap.findOne({ _id: id, moderation: 'approved' }).select('_id')
		if (!map) return notFound('Карта не найдена или ещё не опубликована')

		const body = await readJsonBody(req)
		if (!body) return badRequest()

		const text = readUserText(body.body, MAP_COMMENT_MAX, 2)
		if (!text) return badRequest('Комментарий не может быть пустым')

		const comment = await MapComment.create({
			mapId: id,
			authorId: payload.userId,
			body: text,
		})

		const author = await User.findById(payload.userId)

		return Response.json({ comment: toMapComment(comment, author) }, { status: 201 })
	})
}
