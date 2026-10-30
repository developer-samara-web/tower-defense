import { Types } from 'mongoose'

import { connectDB } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { isRatedMap } from '@/lib/map-rating'
import { GameResult } from '@/models/GameResult'

const DEFAULT_LIMIT = 10
const MAX_LIMIT = 30
const MAX_COUNT = 1_000_000_000

export async function GET(req: Request) {
	await connectDB()

	const auth = req.headers.get('authorization') || ''
	const token = auth.replace('Bearer ', '')
	const { searchParams } = new URL(req.url)

	try {
		const payload = verifyToken(token)
		// Числа в запросе нет — Number(null) даёт 0, поэтому проверяем отдельно.
		const requested = Number(searchParams.get('limit'))
		const limit = searchParams.get('limit') && Number.isFinite(requested)
			? Math.min(Math.max(Math.trunc(requested), 1), MAX_LIMIT)
			: DEFAULT_LIMIT

		const cursor = searchParams.get('cursor')
		if (cursor && !Types.ObjectId.isValid(cursor)) {
			return Response.json({ error: 'Некорректный курсор' }, { status: 400 })
		}

		const filter: Record<string, unknown> = { userId: payload.userId }
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
	} catch {
		return Response.json({ error: 'Authentication failed' }, { status: 401 })
	}
}

export async function POST(req: Request) {
	await connectDB()

	const auth = req.headers.get('authorization') || ''
	const token = auth.replace('Bearer ', '')

	try {
		const payload = verifyToken(token)
		const body = await req.json()

		const wave = toCount(body?.wave)
		const gold = toCount(body?.gold)
		if (wave === null || gold === null) {
			return Response.json({ error: 'Некорректный результат' }, { status: 400 })
		}

		const game = await GameResult.create({
			userId: payload.userId,
			wave,
			gold,
			mapId: Types.ObjectId.isValid(body?.mapId) ? body.mapId : null,
			rated: await isRatedMap(body?.mapId),
			level: Math.max(1, toCount(body?.level) ?? 1),
			monstersKilled: toCount(body?.monstersKilled) ?? 0,
			buildingsBuilt: toCount(body?.buildingsBuilt) ?? 0,
			moneySpent: toCount(body?.moneySpent) ?? 0,
			damageDealt: toCount(body?.damageDealt) ?? 0,
		})

		return Response.json({ game: toGameRecord(game) }, { status: 201 })
	} catch {
		return Response.json({ error: 'Authentication failed' }, { status: 401 })
	}
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
