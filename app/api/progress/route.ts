import { badRequest, notFound, readJsonBody, withUser } from '@/lib/api-auth'
import User from '@/models/User'

// Флаги обучения читает главное меню, пишет — игра и само меню. Держим их
// на сервере: сброс localStorage не должен возвращать уже показанный
// рассказ про рейтинг, а пройденное обучение — требовать заново.
export async function GET(req: Request) {
	return withUser(req, async ({ userId }) => {
		const user = await User.findById(userId)
			.select('tutorialCompleted ratedIntroShown')
			.lean()
		if (!user) return notFound('Пользователь не найден')

		return Response.json(readFlags(user))
	})
}

export async function POST(req: Request) {
	return withUser(req, async ({ userId }) => {
		const body = await readJsonBody(req)
		if (!body) return badRequest()

		// Ставим только «сделано»: снимать флаг назад клиенту не за чем
		// и неоткуда.
		const update: Record<string, true> = {}
		if (body.tutorialCompleted === true) update.tutorialCompleted = true
		if (body.ratedIntroShown === true) update.ratedIntroShown = true
		if (Object.keys(update).length === 0) return badRequest('Нет изменений')

		const user = await User.findByIdAndUpdate(userId, { $set: update }, { new: true })
			.select('tutorialCompleted ratedIntroShown')
			.lean()
		if (!user) return notFound('Пользователь не найден')

		return Response.json(readFlags(user))
	})
}

type StoredFlags = { tutorialCompleted?: boolean; ratedIntroShown?: boolean }

function readFlags(user: StoredFlags) {
	return {
		tutorialCompleted: Boolean(user.tutorialCompleted),
		ratedIntroShown: Boolean(user.ratedIntroShown),
	}
}
