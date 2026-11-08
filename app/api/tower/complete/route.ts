import {
	badRequest,
	forbidden,
	notFound,
	readJsonBody,
	withUser,
} from '@/lib/api-auth'
import { towerFloorReward } from '@/features/game/tower/tower-rules'
import User from '@/models/User'

type TowerUser = {
	towerMaxFloor?: number
	towerCoins?: number
}

// Победа на этаже: открываем следующий и начисляем валюту. Награда
// выдаётся только за первое прохождение — повторный забег по открытому
// этажу не превращается в бесконечный источник монет.
export async function POST(req: Request) {
	return withUser(req, async ({ userId }) => {
		const body = await readJsonBody(req)
		const floor = Number(body?.floor)

		if (!Number.isInteger(floor) || floor < 1) {
			return badRequest('Неверный номер этажа')
		}

		const user = (await User.findById(userId)
			.select('towerMaxFloor towerCoins')
			.lean()) as TowerUser | null

		if (!user) return notFound('Пользователь не найден')

		const maxFloor = Math.max(1, Math.trunc(user.towerMaxFloor ?? 1))
		const coins = Math.max(0, Math.trunc(user.towerCoins ?? 0))

		if (floor > maxFloor) return forbidden('Этаж ещё не открыт')

		if (floor < maxFloor) {
			return Response.json({
				maxFloor,
				coins,
				reward: 0,
				alreadyCompleted: true,
			})
		}

		const reward = towerFloorReward(floor)
		const nextFloor = floor + 1

		const updated = (await User.findByIdAndUpdate(
			userId,
			{
				$inc: { towerCoins: reward },
				$max: { towerMaxFloor: nextFloor },
			},
			{ new: true },
		)
			.select('towerMaxFloor towerCoins')
			.lean()) as TowerUser | null

		if (!updated) return notFound('Пользователь не найден')

		return Response.json({
			maxFloor: Math.max(1, Math.trunc(updated.towerMaxFloor ?? nextFloor)),
			coins: Math.max(0, Math.trunc(updated.towerCoins ?? coins + reward)),
			reward,
			alreadyCompleted: false,
		})
	})
}
