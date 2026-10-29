import { Types } from 'mongoose'

import { validateDraft } from '@/features/game/engine/map/custom-map'
import { verifyToken } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { readDraft, readMapStatus, toMapSummary } from '@/lib/map-summary'
import { GameMap } from '@/models/GameMap'

type RouteParams = { params: Promise<{ id: string }> }

// Автор отправляет карту на модерацию. До публикации её видит
// только владелец и администратор.
export async function POST(req: Request, { params }: RouteParams) {
	await connectDB()

	try {
		const payload = verifyToken(getToken(req))
		const { id } = await params
		if (!Types.ObjectId.isValid(id)) {
			return Response.json({ error: 'Карта не найдена' }, { status: 404 })
		}

		const map = await GameMap.findOne({ _id: id, userId: payload.userId })
		if (!map) return Response.json({ error: 'Карта не найдена' }, { status: 404 })

		if (readMapStatus(map.moderation) === 'pending') {
			return Response.json({ error: 'Карта уже на модерации' }, { status: 400 })
		}

		const draft = readDraft(map.data)
		if (!draft) {
			return Response.json({ error: 'У карты нет данных редактора' }, { status: 400 })
		}

		const problem = validateDraft(draft)
		if (problem) return Response.json({ error: problem }, { status: 400 })

		map.moderation = 'pending'
		map.rated = false
		map.submittedAt = new Date()
		map.reviewedAt = null
		await map.save()

		return Response.json({
			map: toMapSummary(map, {
				viewerId: payload.userId,
				authorLogin: payload.login ?? null,
			}),
		})
	} catch {
		return Response.json({ error: 'Неверный токен' }, { status: 401 })
	}
}

function getToken(req: Request) {
	return (req.headers.get('authorization') || '').replace('Bearer ', '')
}
