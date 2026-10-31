import { Types } from 'mongoose'

import { verifyToken } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { getMapBoard } from '@/lib/map-score'

type RouteParams = { params: Promise<{ id: string }> }

// Топ одной карты. Строка зрителя возвращается даже вне первой страницы:
// игрок должен видеть своё место, а не только подиум.
export async function GET(req: Request, { params }: RouteParams) {
	await connectDB()

	const { searchParams } = new URL(req.url)
	const requested = Number(searchParams.get('limit'))
	const limit = Number.isFinite(requested) && requested > 0 ? Math.min(Math.trunc(requested), 100) : 50

	try {
		const payload = verifyToken((req.headers.get('authorization') || '').replace('Bearer ', ''))
		const { id } = await params
		if (!Types.ObjectId.isValid(id)) {
			return Response.json({ error: 'Карта не найдена' }, { status: 404 })
		}

		const board = await getMapBoard(id, payload.userId, limit)
		if (!board) return Response.json({ error: 'Карта не найдена' }, { status: 404 })

		return Response.json(board)
	} catch {
		return Response.json({ error: 'Неверный токен' }, { status: 401 })
	}
}
