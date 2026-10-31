import { connectDB } from '@/lib/db'
import User from '@/models/User'

export async function GET(req: Request) {
	await connectDB()

	const { searchParams } = new URL(req.url)
	// Числа в запросе нет — Number(null) даёт 0, поэтому проверяем отдельно.
	const requested = Number(searchParams.get('limit'))
	const limit = searchParams.get('limit') && Number.isFinite(requested)
		? Math.min(Math.max(Math.trunc(requested), 1), 50)
		: 8

	// Общий топ — как рейтинг игроков в osu!: сортируем по очкам рейтинга,
	// которые начисляются только за рейтинговые карты.
	const users = await User.find({})
		.select('-password')
		.sort({ ratingPoints: -1, record: -1 })
		.limit(limit)

	const scores = users.map((u) => ({
		id: u._id.toString(),
		login: u.login,
		wave: u.bestWave || Math.floor(u.record / 25) || 1,
		gold: u.record,
		points: u.ratingPoints || 0,
		createdAt: u.createdAt.toISOString(),
		avatar: u.avatar,
		avatarFrame: u.avatarFrame,
		title: u.title,
	}))

	return Response.json({ scores })
}
