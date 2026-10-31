import { Types } from 'mongoose'

import { normalizeMapDraft } from '@/features/game/engine/map/custom-map'
import { verifyToken } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { dropMapBoard } from '@/lib/map-score'
import { readMapStatus, toMapSummary } from '@/lib/map-summary'
import { GameMap } from '@/models/GameMap'
import User from '@/models/User'

const MAX_NAME_LENGTH = 40
const DIFFICULTIES = ['Лёгкая', 'Средняя', 'Трудная', 'Экстремальная']
const REVIEW_STATUSES = ['approved', 'rejected', 'pending'] as const

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: RouteParams) {
	await connectDB()

	try {
		const payload = verifyToken(getToken(req))
		const { id } = await params
		if (!Types.ObjectId.isValid(id)) {
			return Response.json({ error: 'Карта не найдена' }, { status: 404 })
		}

		const map = await GameMap.findById(id)
		if (!map) return Response.json({ error: 'Карта не найдена' }, { status: 404 })

		const mine = map.userId.toString() === payload.userId
		// Чужую карту отдаём только после модерации: черновик автора
		// не должен быть виден другим игрокам.
		if (!mine && readMapStatus(map.moderation) !== 'approved') {
			return Response.json({ error: 'Карта не найдена' }, { status: 404 })
		}

		const author = await User.findById(map.userId).select('login')

		return Response.json({
			map: {
				...toMapSummary(map, {
					viewerId: payload.userId,
					authorLogin: author?.login ?? null,
				}),
				data: normalizeMapDraft(map.data),
			},
		})
	} catch {
		return Response.json({ error: 'Неверный токен' }, { status: 401 })
	}
}

// Сохраняет черновик целиком: редактор присылает актуальные
// клетки воды и леса, поэтому частичных обновлений тут нет.
export async function PUT(req: Request, { params }: RouteParams) {
	await connectDB()

	try {
		const payload = verifyToken(getToken(req))
		const { id } = await params
		if (!Types.ObjectId.isValid(id)) {
			return Response.json({ error: 'Карта не найдена' }, { status: 404 })
		}

		const map = await GameMap.findOne({ _id: id, userId: payload.userId })
		if (!map) return Response.json({ error: 'Карта не найдена' }, { status: 404 })

		const body = await req.json()

		if (typeof body?.name === 'string') {
			const name = body.name.trim().slice(0, MAX_NAME_LENGTH)
			if (!name) return Response.json({ error: 'Введите название карты' }, { status: 400 })
			map.name = name
		}

		if (typeof body?.difficulty === 'string') {
			if (!DIFFICULTIES.includes(body.difficulty)) {
				return Response.json({ error: 'Неизвестная сложность' }, { status: 400 })
			}
			map.difficulty = body.difficulty
		}

		if (body?.data !== undefined) {
			const data = normalizeMapDraft(body.data)
			if (!data) {
				return Response.json({ error: 'Некорректные данные карты' }, { status: 400 })
			}
			map.data = data
			// Размер поля хранится и в черновике, и в записи: списки карт
			// строят превью только по полю записи.
			map.cols = data.cols
			map.rows = data.rows
			// Правка после публикации снимает карту с витрины: старая
			// версия больше не соответствует сохранённому черновику.
			if (map.moderation !== 'draft') {
				map.moderation = 'draft'
				map.rated = false
			}
		}

		await map.save()

		const author = await User.findById(map.userId).select('login')
		return Response.json({
			map: {
				...toMapSummary(map, {
					viewerId: payload.userId,
					authorLogin: author?.login ?? null,
				}),
				data: normalizeMapDraft(map.data),
			},
		})
	} catch {
		return Response.json({ error: 'Неверный токен' }, { status: 401 })
	}
}

// Модерация и смена типа карты — только для админа.
export async function PATCH(req: Request, { params }: RouteParams) {
	await connectDB()

	try {
		const payload = verifyToken(getToken(req))
		const viewer = await User.findById(payload.userId).select('role')
		if (!viewer || viewer.role !== 'admin') {
			return Response.json({ error: 'Нет доступа' }, { status: 403 })
		}

		const { id } = await params
		if (!Types.ObjectId.isValid(id)) {
			return Response.json({ error: 'Карта не найдена' }, { status: 404 })
		}

		const map = await GameMap.findById(id)
		if (!map) return Response.json({ error: 'Карта не найдена' }, { status: 404 })

		const body = await req.json()
		const status = body?.moderation
		const rated = body?.rated

		if (status !== undefined) {
			if (!REVIEW_STATUSES.includes(status)) {
				return Response.json({ error: 'Неизвестный статус' }, { status: 400 })
			}
			map.moderation = status
			if (status !== 'approved') map.rated = false
		}

		if (rated !== undefined) {
			if (typeof rated !== 'boolean') {
				return Response.json({ error: 'Некорректный рейтинг' }, { status: 400 })
			}
			if (readMapStatus(map.moderation) !== 'approved') {
				return Response.json(
					{ error: 'Сначала опубликуйте карту' },
					{ status: 400 },
				)
			}
			map.rated = rated
		}

		map.reviewedAt = new Date()
		await map.save()

		const author = await User.findById(map.userId).select('login')
		return Response.json({
			map: {
				...toMapSummary(map, {
					viewerId: payload.userId,
					authorLogin: author?.login ?? null,
				}),
				data: normalizeMapDraft(map.data),
			},
		})
	} catch {
		return Response.json({ error: 'Неверный токен' }, { status: 401 })
	}
}

export async function DELETE(req: Request, { params }: RouteParams) {
	await connectDB()

	try {
		const payload = verifyToken(getToken(req))
		const { id } = await params
		if (!Types.ObjectId.isValid(id)) {
			return Response.json({ error: 'Карта не найдена' }, { status: 404 })
		}

		const map = await GameMap.findById(id)
		if (!map) return Response.json({ error: 'Карта не найдена' }, { status: 404 })

		const viewer = await User.findById(payload.userId).select('role')
		if (map.userId.toString() !== payload.userId && viewer?.role !== 'admin') {
			return Response.json({ error: 'Нет доступа' }, { status: 403 })
		}

		await map.deleteOne()
		await dropMapBoard(id)
		return Response.json({ ok: true })
	} catch {
		return Response.json({ error: 'Неверный токен' }, { status: 401 })
	}
}

function getToken(req: Request) {
	return (req.headers.get('authorization') || '').replace('Bearer ', '')
}
