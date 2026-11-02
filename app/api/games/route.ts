import { Types } from 'mongoose'

import { isRatedMap } from '@/lib/map-rating'
import { recordMapScore } from '@/lib/map-score'
import { GameResult } from '@/models/GameResult'
import {
	badRequest,
	readJsonBody,
	readObjectId,
	withUser,
} from '@/lib/api-auth'

const DEFAULT_LIMIT = 10
const MAX_LIMIT = 30
const MAX_COUNT = 1_000_000_000

export async function GET(req: Request) {
	return withUser(req, async ({ userId }) => {
		const { searchParams } = new URL(req.url)
		// Числа в запросе нет — Number(null) даёт 0, поэтому проверяем отдельно.
		const requested = Number(searchParams.get('limit'))
		const limit = searchParams.get('limit') && Number.isFinite(requested)
			? Math.min(Math.max(Math.trunc(requested), 1), MAX_LIMIT)
			: DEFAULT_LIMIT

		const cursor = searchParams.get('cursor')
		if (cursor && !readObjectId(cursor)) {
			return badRequest('Некорректный курсор')
		}

		// История всегда своя: id игрока берётся из токена, а не из запроса.
		const filter: Record<string, unknown> = { userId }
		if (cursor) filter._id = { $lt: new Types.ObjectId(cursor) }

		// Берём на одну запись больше, чтобы понять, есть ли следующая страница.
		const docs = await GameResult.find(filter)
			.sort({ _id: -1 })
			.limit(limit + 1)

		const hasMore = docs.length > limit
		const page = hasMore ? docs.slice(0, limit) : docs

		return Response.json({
			games: page.map(toGameRecord),
			hasMore,
			nextCursor: hasMore ? page[page.length - 1]._id.toString() : null,
		})
	})
}

export async function POST(req: Request) {
	return withUser(req, async ({ userId }) => {
		const body = await readJsonBody(req)
		if (!body) return badRequest()

		const wave = toCount(body.wave)
		const gold = toCount(body.gold)
		if (wave === null || gold === null) {
			return badRequest('Некорректный результат')
		}

		const mapId = readObjectId(String(body.mapId ?? ''))
		const game = await GameResult.create({
			userId,
			wave,
			gold,
			mapId,
			rated: await isRatedMap(mapId),
			level: Math.max(1, toCount(body.level) ?? 1),
			monstersKilled: toCount(body.monstersKilled) ?? 0,
			buildingsBuilt: toCount(body.buildingsBuilt) ?? 0,
			moneySpent: toCount(body.moneySpent) ?? 0,
			damageDealt: toCount(body.damageDealt) ?? 0,
		})

		// Очки топа карты начисляет сервер: звёзды сложности и место в таблице
		// клиенту неизвестны, а доверять им нельзя. Жизни берутся из забега —
		// целый замок означает, что оборона выдержала полностью.
		const mapScore = mapId
			? await recordMapScore({
					userId,
					mapId,
					wave,
					gold,
					lives: toCount(body.lives) ?? 0,
					maxLives: toCount(body.maxLives) ?? 0,
				})
			: null

		return Response.json({ game: toGameRecord(game), mapScore }, { status: 201 })
	})
}

function toGameRecord(game: {
	_id: { toString(): string }
	wave: number
	gold: number
	rated?: boolean
	level?: number
	monstersKilled?: number
	buildingsBuilt?: number
	moneySpent?: number
	damageDealt?: number
	createdAt: Date
}) {
	return {
		id: game._id.toString(),
		wave: game.wave,
		gold: game.gold,
		// Только рейтинговые забеги двигают рейтинг игрока.
		rated: Boolean(game.rated),
		level: game.level ?? 1,
		monstersKilled: game.monstersKilled ?? 0,
		buildingsBuilt: game.buildingsBuilt ?? 0,
		moneySpent: game.moneySpent ?? 0,
		damageDealt: game.damageDealt ?? 0,
		createdAt: game.createdAt.toISOString(),
	}
}

function toCount(value: unknown) {
	if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null
	return Math.min(MAX_COUNT, Math.trunc(value))
}
