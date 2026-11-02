import { notFound, readObjectId, withUser } from '@/lib/api-auth'
import { getMapBoard } from '@/lib/map-score'

type RouteParams = { params: Promise<{ id: string }> }

// Топ одной карты. Строка зрителя возвращается даже вне первой страницы:
// игрок должен видеть своё место, а не только подиум.
export async function GET(req: Request, { params }: RouteParams) {
	return withUser(req, async ({ userId }) => {
		const { searchParams } = new URL(req.url)
		const requested = Number(searchParams.get('limit'))
		const limit = Number.isFinite(requested) && requested > 0 ? Math.min(Math.trunc(requested), 100) : 50

		const { id } = await params
		if (!readObjectId(id)) return notFound('Карта не найдена')

		const board = await getMapBoard(id, userId, limit)
		if (!board) return notFound('Карта не найдена')

		return Response.json(board)
	})
}
