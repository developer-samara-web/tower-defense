import { badRequest, notFound, readJsonBody, withUser } from '@/lib/api-auth'
import { isRatedMap } from '@/lib/map-rating'
import User from '@/models/User'

const MAX_COUNT = 1_000_000_000

export async function POST(req: Request) {
	return withUser(req, async ({ userId }) => {
		const body = await readJsonBody(req)
		if (!body) return badRequest()

		const nextGold = toCount(body.gold)
		const nextWave = toCount(body.wave)
		if (nextGold === null || nextWave === null) {
			return badRequest('Некорректный результат')
		}

		const user = await User.findById(userId)
		if (!user) return notFound('Пользователь не найден')

		// Обычные забеги и песочница редактора рейтинг не двигают.
		if (!(await isRatedMap(body.mapId))) {
			return Response.json({ record: user.record, bestWave: user.bestWave, rated: false })
		}

		let changed = false

		if (nextGold > user.record) {
			user.record = nextGold
			changed = true
		}

		if (nextWave > (user.bestWave ?? 0)) {
			user.bestWave = nextWave
			changed = true
		}

		if (changed) await user.save()

		return Response.json({ record: user.record, bestWave: user.bestWave, rated: true })
	})
}

function toCount(value: unknown) {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0
		? Math.min(MAX_COUNT, Math.trunc(value))
		: null
}
