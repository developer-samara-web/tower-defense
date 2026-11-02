import { validateDraft } from '@/features/game/engine/map/custom-map'
import { badRequest, notFound, withUser } from '@/lib/api-auth'
import { readDraft, readMapStatus, toMapSummary } from '@/lib/map-summary'
import { GameMap } from '@/models/GameMap'

type RouteParams = { params: Promise<{ id: string }> }

// Автор отправляет карту на модерацию. До публикации её видит
// только владелец и администратор.
export async function POST(req: Request, { params }: RouteParams) {
	return withUser(req, async (payload) => {
		const { id } = await params
		// Ищем карту сразу вместе с автором: чужая карта для клиента
		// неотличима от несуществующей.
		const map = await GameMap.findOne({ _id: id, userId: payload.userId })
		if (!map) return notFound('Карта не найдена или нет доступа к ней')

		if (readMapStatus(map.moderation) === 'pending') {
			return badRequest('Карта уже на модерации')
		}

		const draft = readDraft(map.data)
		if (!draft) return badRequest('У карты нет данных редактора')

		const problem = validateDraft(draft)
		if (problem) return badRequest(problem)

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
	})
}
