import { notFound, withUser } from '@/lib/api-auth'
import { towerFloorReward } from '@/features/game/tower/tower-rules'
import User from '@/models/User'

type TowerUser = {
	towerMaxFloor?: number
	towerCoins?: number
}

// Прогресс башни читает экран этажей: сколько открыто и сколько валюты
// накоплено. Сам этаж грузится отдельным запросом, чтобы меню не тянуло
// черновики всех карт.
export async function GET(req: Request) {
	return withUser(req, async ({ userId }) => {
		const user = (await User.findById(userId)
			.select('towerMaxFloor towerCoins')
			.lean()) as TowerUser | null

		if (!user) return notFound('Пользователь не найден')

		const maxFloor = Math.max(1, Math.trunc(user.towerMaxFloor ?? 1))
		const coins = Math.max(0, Math.trunc(user.towerCoins ?? 0))

		return Response.json({
			maxFloor,
			coins,
			nextReward: towerFloorReward(maxFloor),
		})
	})
}
