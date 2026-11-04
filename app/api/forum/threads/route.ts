import { connectDB } from '@/lib/db'
import {
	badRequest,
	notFound,
	readJsonBody,
	readObjectId,
	serverError,
	withUser,
} from '@/lib/api-auth'
import { readForumCategory, readUserText } from '@/lib/forum'
import {
	THREAD_BODY_MAX,
	THREAD_TITLE_MAX,
	loadForumAuthors,
	loadForumMaps,
	toForumThread,
} from '@/lib/forum-store'
import { ForumThread } from '@/models/ForumThread'
import { GameMap } from '@/models/GameMap'
import User from '@/models/User'

const THREAD_LIMIT = 60

// Читать форум может любой игрок: это витрина сообщества, как лендинг
// и таблица лидеров. Писать — только с токеном, это проверяет POST.
export async function GET(req: Request) {
	try {
		await connectDB()

		const requested = new URL(req.url).searchParams.get('category')
		const category = requested ? readForumCategory(requested) : null
		if (requested && !category) return badRequest('Неизвестный раздел форума')

		const threads = await ForumThread.find(category ? { category } : {})
			.sort({ pinned: -1, lastPostAt: -1 })
			.limit(THREAD_LIMIT)

		const authors = await loadForumAuthors(threads.map((thread) => thread.authorId))
		const maps = await loadForumMaps(threads.map((thread) => thread.mapId))

		return Response.json({
			threads: threads.map((thread) =>
				toForumThread(
					thread,
					authors.get(thread.authorId.toString()),
					thread.mapId ? maps.get(thread.mapId.toString()) : null,
				),
			),
		})
	} catch (error) {
		return serverError(error)
	}
}

// Новая тема. Раздел «Карты» может быть привязан к опубликованной карте:
// сервер сам проверяет, что она существует и открыта сообществу.
export async function POST(req: Request) {
	return withUser(req, async (payload) => {
		const body = await readJsonBody(req)
		if (!body) return badRequest()

		const category = readForumCategory(body.category)
		if (!category) return badRequest('Неизвестный раздел форума')

		const title = readUserText(body.title, THREAD_TITLE_MAX, 3)
		if (!title) return badRequest('Заголовок должен быть от 3 до 120 символов')

		const text = readUserText(body.body, THREAD_BODY_MAX, 2)
		if (!text) return badRequest('Сообщение не может быть пустым')

		let mapId: string | null = null
		if (category === 'maps' && body.mapId !== undefined && body.mapId !== null) {
			mapId = readObjectId(typeof body.mapId === 'string' ? body.mapId : null)
			if (!mapId) return badRequest('Некорректная карта')

			const map = await GameMap.findOne({ _id: mapId, moderation: 'approved' }).select('_id')
			if (!map) return notFound('Карта не найдена или ещё не опубликована')
		}

		const thread = await ForumThread.create({
			category,
			title,
			body: text,
			authorId: payload.userId,
			mapId,
		})

		const author = await User.findById(payload.userId)
		const map = mapId ? await GameMap.findById(mapId).select('name') : null

		return Response.json(
			{ thread: toForumThread(thread, author, map) },
			{ status: 201 },
		)
	})
}
