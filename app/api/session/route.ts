import { Session } from '@/models/Session'
import {
	badRequest,
	jsonError,
	notFound,
	readJsonBody,
	readObjectId,
	withUser,
} from '@/lib/api-auth'

const MAX_SEED_LENGTH = 128
// Сохранение приходит от клиента: без потолка в размер один забег мог бы
// положить базу огромным JSON.
const MAX_SESSION_BYTES = 256_000
// Один текст и для отсутствующей, и для чужой сессии: по разнице ответов
// нельзя перебором подобрать чужие id.
const NO_SESSION_MESSAGE = 'Игра не найдена или нет доступа к ней.'

export async function POST(req: Request) {
	return withUser(req, async ({ userId }) => {
		const body = await readJsonBody(req)
		if (!body) return badRequest()

		const mapSeed = typeof body.mapSeed === 'string' ? body.mapSeed.trim() : ''
		if (!mapSeed || mapSeed.length > MAX_SEED_LENGTH) {
			return badRequest('Некорректный сид карты')
		}
		if (typeof body.gameState !== 'object' || body.gameState === null) {
			return badRequest('Некорректное состояние игры')
		}

		const gameState = JSON.stringify(body.gameState)
		const stats = JSON.stringify(body.stats ?? {})
		if (gameState.length + stats.length > MAX_SESSION_BYTES) {
			return badRequest('Сохранение слишком большое')
		}

		const session = await Session.findOneAndUpdate(
			{ userId },
			// Ищем и обновляем по одному и тому же userId: документ всегда
			// принадлежит авторизованному игроку, подставить чужого нельзя.
			{ mapSeed, gameState, stats, lastSaved: new Date() },
			{ upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
		)

		return Response.json({ sessionId: session._id.toString() })
	})
}

export async function DELETE(req: Request) {
	return withUser(req, async ({ userId }) => {
		await Session.deleteOne({ userId })
		return Response.json({ deleted: true })
	})
}

export async function GET(req: Request) {
	return withUser(req, async ({ userId }) => {
		const sessionId = new URL(req.url).searchParams.get('sessionId')

		if (sessionId === 'latest') {
			const session = await Session.findOne({ userId }).sort({ lastSaved: -1 })
			// Пусто — не ошибка доступа: у нового игрока сохранений просто нет.
			if (!session) return jsonError('Сохранений нет', 404)
			return Response.json(toSessionDto(session))
		}

		if (!sessionId) return badRequest('Не указан id игры')

		const id = readObjectId(sessionId)
		if (!id) return notFound(NO_SESSION_MESSAGE)

		// Фильтр по userId — единственная причина, по которой чужой забег
		// не читается: сам id ничего не даёт без токена владельца.
		const session = await Session.findOne({ _id: id, userId })
		if (!session) return notFound(NO_SESSION_MESSAGE)

		return Response.json(toSessionDto(session))
	})
}

type SessionDocument = {
	_id: { toString(): string }
	mapSeed: string
	gameState: string
	stats: string
}

function toSessionDto(session: SessionDocument) {
	return {
		sessionId: session._id.toString(),
		mapSeed: session.mapSeed,
		gameState: JSON.parse(session.gameState),
		stats: JSON.parse(session.stats),
	}
}
