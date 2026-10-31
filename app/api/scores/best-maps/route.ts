import { Types } from 'mongoose'

import { verifyToken } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { getBestMaps, ratingSummary } from '@/lib/map-score'

// Лучшие карты игрока для профиля: по одному рекорду с каждой карты.
export async function GET(req: Request) {
	await connectDB()

	const auth = req.headers.get('authorization') || ''
	const token = auth.replace('Bearer ', '')

	if (!token) {
		return Response.json({ error: 'Нет доступа' }, { status: 401 })
	}

	try {
		const payload = verifyToken(token)
		const { searchParams } = new URL(req.url)
		const requested = Number(searchParams.get('limit'))
		const limit = searchParams.get('limit') && Number.isFinite(requested) ? requested : 8

		const [maps, rating] = await Promise.all([
			getBestMaps(payload.userId, limit),
			ratingSummary(new Types.ObjectId(payload.userId)),
		])

		return Response.json({ maps, ...rating })
	} catch {
		return Response.json({ error: 'Неверный токен' }, { status: 401 })
	}
}
