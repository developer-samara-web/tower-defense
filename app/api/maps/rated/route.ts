import { connectDB } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { toMapSummary, type StoredMap } from '@/lib/map-summary'
import { GameMap } from '@/models/GameMap'
import User from '@/models/User'

// Рейтинговая игра берёт случайную карту из библиотеки: публикует и
// помечает рейтинговой только администратор, поэтому здесь остаются
// прошедшие модерацию карты.
export async function GET(req: Request) {
	await connectDB()

	try {
		const payload = verifyToken((req.headers.get('authorization') || '').replace('Bearer ', ''))
		const viewer = await User.findById(payload.userId).select('login')
		if (!viewer) {
			return Response.json({ error: 'Пользователь не найден' }, { status: 404 })
		}

		const [map] = await GameMap.aggregate<StoredMap>([
			{ $match: { moderation: 'approved', rated: true } },
			{ $sample: { size: 1 } },
		])

		if (!map) {
			return Response.json({ error: 'Рейтинговых карт пока нет' }, { status: 404 })
		}

		return Response.json({
			map: toMapSummary(map, { viewerId: payload.userId }),
		})
	} catch {
		return Response.json({ error: 'Неверный токен' }, { status: 401 })
	}
}
