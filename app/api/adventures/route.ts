import { notFound, withUser } from '@/lib/api-auth'
import { adventureBoard } from '@/lib/compendium/adventures'
import User from '@/models/User'

// Компендиум «Приключения»: тропа из десяти рейтинговых карт и призы за них.
// Доска целиком собирается на сервере — порядок карт, их публикации и
// рекорды игрока клиенту не доверяем.
export async function GET(req: Request) {
	return withUser(req, async ({ userId }) => {
		if (!(await User.exists({ _id: userId }))) {
			return notFound('Пользователь не найден')
		}

		return Response.json(await adventureBoard(userId))
	})
}
