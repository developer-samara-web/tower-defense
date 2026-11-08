import {
	badRequest,
	forbidden,
	notFound,
	withUser,
} from '@/lib/api-auth'
import { towerFloorReward } from '@/features/game/tower/tower-rules'
import { ensureTowerFloor } from '@/lib/tower/floor-store'
import User from '@/models/User'

type RouteParams = { params: Promise<{ floor: string }> }

type TowerUser = {
	towerMaxFloor?: number
}

// Черновик этажа создаётся при первом достижении и дальше отдаётся
// из базы: карта общая для всех игроков и не меняется между забегами.
export async function GET(req: Request, { params }: RouteParams) {
	return withUser(req, async ({ userId }) => {
		const { floor: rawFloor } = await params
		const floor = Number(rawFloor)

		if (!Number.isInteger(floor) || floor < 1) {
			return badRequest('Неверный номер этажа')
		}

		const user = (await User.findById(userId)
			.select('towerMaxFloor')
			.lean()) as TowerUser | null

		if (!user) return notFound('Пользователь не найден')

		const maxFloor = Math.max(1, Math.trunc(user.towerMaxFloor ?? 1))
		if (floor > maxFloor) return forbidden('Этаж ещё не открыт')

		const draft = await ensureTowerFloor(floor)

		return Response.json({
			floor,
			draft,
			reward: towerFloorReward(floor),
			completed: floor < maxFloor,
		})
	})
}
