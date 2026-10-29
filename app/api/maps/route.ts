import { randomUUID } from 'node:crypto'

import { DEFAULT_COLS, DEFAULT_ROWS } from '@/features/game/config/game.config'
import { createEmptyMapDraft } from '@/features/game/engine/map/custom-map'
import { verifyToken } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { toMapSummary } from '@/lib/map-summary'
import { GameMap } from '@/models/GameMap'
import User from '@/models/User'

const MAX_MAPS = 100
const MAX_NAME_LENGTH = 40

// Разделы библиотеки. Рейтинг и модерацию выставляет только админ,
// поэтому публичные разделы показывают лишь одобренные карты.
const TABS = ['rated', 'unrated', 'mine', 'pending'] as const
type MapTab = (typeof TABS)[number]

function readTab(value: string | null): MapTab {
	return TABS.includes(value as MapTab) ? (value as MapTab) : 'mine'
}

function seedColor(seed: string): string {
	const h = seed.slice(0, 8)
	const r = parseInt(h.slice(0, 2), 16) || 107
	const g = parseInt(h.slice(2, 4), 16) || 142
	const b = parseInt(h.slice(4, 6), 16) || 50
	return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export async function GET(req: Request) {
	await connectDB()

	try {
		const payload = verifyToken(getToken(req))
		const viewer = await User.findById(payload.userId).select('login role')
		if (!viewer) {
			return Response.json({ error: 'Пользователь не найден' }, { status: 404 })
		}

		const tab = readTab(new URL(req.url).searchParams.get('tab'))
		if (tab === 'pending' && viewer.role !== 'admin') {
			return Response.json({ error: 'Нет доступа' }, { status: 403 })
		}

		const filter =
			tab === 'mine'
				? { userId: viewer._id }
				: tab === 'pending'
					? { moderation: 'pending' }
					: { moderation: 'approved', rated: tab === 'rated' }

		const maps = await GameMap.find(filter)
			.sort({ createdAt: -1 })
			.limit(MAX_MAPS)

		const authors = await loadAuthors(maps)
		return Response.json({
			maps: maps.map((map) =>
				toMapSummary(map, {
					viewerId: payload.userId,
					authorLogin: authors.get(map.userId.toString()) ?? null,
				}),
			),
		})
	} catch {
		return Response.json({ error: 'Неверный токен' }, { status: 401 })
	}
}

// Новая карта создаётся пустым черновиком: замок, казармы, реки
// и лес игрок расставляет в редакторе.
export async function POST(req: Request) {
	await connectDB()

	try {
		const payload = verifyToken(getToken(req))
		const count = await GameMap.countDocuments({ userId: payload.userId })
		const seed = randomUUID()
		const map = await GameMap.create({
			userId: payload.userId,
			name: `Карта ${count + 1}`.slice(0, MAX_NAME_LENGTH),
			seed,
			cols: DEFAULT_COLS,
			rows: DEFAULT_ROWS,
			difficulty: 'Средняя',
			previewColor: seedColor(seed),
			data: createEmptyMapDraft(),
		})

		return Response.json(
			{
				map: toMapSummary(map, {
					viewerId: payload.userId,
					authorLogin: payload.login ?? null,
				}),
			},
			{ status: 201 },
		)
	} catch {
		return Response.json({ error: 'Неверный токен' }, { status: 401 })
	}
}

// Логины авторов подтягиваем отдельным запросом: populate плохо
// дружит с нетипизированной Mixed-моделью.
async function loadAuthors(maps: Array<{ userId: { toString(): string } }>) {
	const ids = Array.from(new Set(maps.map((map) => map.userId.toString())))
	if (ids.length === 0) return new Map<string, string>()

	const authors = await User.find({ _id: { $in: ids } }).select('login')
	return new Map(authors.map((author) => [author._id.toString(), author.login as string]))
}

function getToken(req: Request) {
	return (req.headers.get('authorization') || '').replace('Bearer ', '')
}
