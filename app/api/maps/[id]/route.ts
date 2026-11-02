import { normalizeMapDraft } from '@/features/game/engine/map/custom-map'
import { badRequest, forbidden, notFound, readJsonBody, readObjectId, withUser } from '@/lib/api-auth'
import { dropMapBoard } from '@/lib/map-score'
import { readMapStatus, toMapSummary, type StoredMap } from '@/lib/map-summary'
import { GameMap } from '@/models/GameMap'
import User from '@/models/User'

const MAX_NAME_LENGTH = 40
const DIFFICULTIES = ['Лёгкая', 'Средняя', 'Трудная', 'Экстремальная']
const REVIEW_STATUSES = ['approved', 'rejected', 'pending'] as const

type RouteParams = { params: Promise<{ id: string }> }
// Схема модели не типизирована, поэтому документ описан локально: роуту
// нужны поля карты и методы сохранения/удаления.
type MapDocument = StoredMap & {
	cols: number
	rows: number
	moderation: string
	rated: boolean
	reviewedAt?: Date | null
	save(): Promise<unknown>
	deleteOne(): Promise<unknown>
}

const findMap = (id: string) => GameMap.findById(id) as Promise<MapDocument | null>
const findMyMap = (id: string, userId: string) =>
	GameMap.findOne({ _id: id, userId }) as Promise<MapDocument | null>

// Карта отдаётся только тем, кому положено: автору — любая, остальным —
// опубликованная. Черновик соседа видеть нельзя.
async function loadVisibleMap(id: string, viewerId: string) {
	if (!readObjectId(id)) return null
	const map = await findMap(id)
	if (!map) return null

	const mine = map.userId.toString() === viewerId
	if (!mine && readMapStatus(map.moderation) !== 'approved') return null
	return map
}

async function respond(map: MapDocument, viewerId: string) {
	const author = await User.findById(map.userId).select('login')
	return Response.json({
		map: {
			...toMapSummary(map, {
				viewerId,
				authorLogin: author?.login ?? null,
			}),
			data: normalizeMapDraft(map.data),
		},
	})
}

export async function GET(req: Request, { params }: RouteParams) {
	return withUser(req, async (payload) => {
		const { id } = await params
		const map = await loadVisibleMap(id, payload.userId)
		if (!map) return notFound('Карта не найдена')

		return respond(map, payload.userId)
	})
}

// Сохраняет черновик целиком: редактор присылает актуальные
// клетки воды и леса, поэтому частичных обновлений тут нет.
export async function PUT(req: Request, { params }: RouteParams) {
	return withUser(req, async (payload) => {
		const { id } = await params
		// Правит карту только её автор: чужой id вернёт 404, а не подсказку,
		// что такая карта существует.
		if (!readObjectId(id)) return notFound('Карта не найдена')
		const map = await findMyMap(id, payload.userId)
		if (!map) return notFound('Карта не найдена или нет доступа к ней')

		const body = await readJsonBody(req)
		if (!body) return badRequest()

		if (typeof body.name === 'string') {
			const name = body.name.trim().slice(0, MAX_NAME_LENGTH)
			if (!name) return badRequest('Введите название карты')
			map.name = name
		}

		if (typeof body.difficulty === 'string') {
			if (!DIFFICULTIES.includes(body.difficulty)) {
				return badRequest('Неизвестная сложность')
			}
			map.difficulty = body.difficulty
		}

		if (body.data !== undefined) {
			const data = normalizeMapDraft(body.data)
			if (!data) {
				return badRequest('Некорректные данные карты')
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

		return respond(map, payload.userId)
	})
}

// Модерация и смена типа карты — только для админа.
export async function PATCH(req: Request, { params }: RouteParams) {
	return withUser(req, async (payload) => {
		const viewer = await User.findById(payload.userId).select('role')
		if (!viewer || viewer.role !== 'admin') {
			return forbidden('Нет доступа к модерации')
		}

		const { id } = await params
		if (!readObjectId(id)) return notFound('Карта не найдена')

		const map = await findMap(id)
		if (!map) return notFound('Карта не найдена')

		const body = await readJsonBody(req)
		if (!body) return badRequest()

		if (body.moderation !== undefined) {
			const status = REVIEW_STATUSES.find((value) => value === body.moderation)
			if (!status) return badRequest('Неизвестный статус')
			map.moderation = status
			if (status !== 'approved') map.rated = false
		}

		if (body.rated !== undefined) {
			if (typeof body.rated !== 'boolean') {
				return badRequest('Некорректный рейтинг')
			}
			if (readMapStatus(map.moderation) !== 'approved') {
				return forbidden('Сначала опубликуйте карту')
			}
			map.rated = body.rated
		}

		map.reviewedAt = new Date()
		await map.save()

		return respond(map, payload.userId)
	})
}

export async function DELETE(req: Request, { params }: RouteParams) {
	return withUser(req, async (payload) => {
		const { id } = await params
		if (!readObjectId(id)) return notFound('Карта не найдена')

		const map = await GameMap.findById(id)
		if (!map) return notFound('Карта не найдена')

		const viewer = await User.findById(payload.userId).select('role')
		if (map.userId.toString() !== payload.userId && viewer?.role !== 'admin') {
			return forbidden('Нет доступа к этой карте')
		}

		await map.deleteOne()
		await dropMapBoard(id)
		return Response.json({ ok: true })
	})
}
