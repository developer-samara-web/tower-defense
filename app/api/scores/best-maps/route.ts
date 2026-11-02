import { Types } from 'mongoose'

import { notFound, withUser } from '@/lib/api-auth'
import { getBestMaps, ratingSummary } from '@/lib/map-score'

// Лучшие карты игрока для профиля: по одному рекорду с каждой карты.
export async function GET(req: Request) {
	return withUser(req, async ({ userId }) => {
		const { searchParams } = new URL(req.url)
		const requested = Number(searchParams.get('limit'))
		const limit = searchParams.get('limit') && Number.isFinite(requested) ? requested : 8

		// Токен без пользователя — значит аккаунт удалили, а подпись жива.
		if (!Types.ObjectId.isValid(userId)) return notFound('Пользователь не найден')

		const [maps, rating] = await Promise.all([
			getBestMaps(userId, limit),
			ratingSummary(new Types.ObjectId(userId)),
		])

		return Response.json({ maps, ...rating })
	})
}
