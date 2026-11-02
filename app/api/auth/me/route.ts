import { Types } from 'mongoose'

import { badRequest, notFound, readJsonBody, withUser } from '@/lib/api-auth'
import { DEFAULT_AVATAR, DEFAULT_FRAME, isAvatarId, isFrameId } from '@/lib/account/avatar-options'
import { NO_TITLE, isTitleId } from '@/lib/account/title-options'
import { ratingSummary } from '@/lib/map-score'
import User from '@/models/User'
import { GameResult } from '@/models/GameResult'

type StoredUser = {
	_id: { toString(): string }
	login: string
	email: string
	record?: number
	bestWave?: number
	ratingPoints?: number
	role?: string
	avatar?: string
	avatarFrame?: string
	title?: string
}

export async function GET(req: Request) {
	return withUser(req, async ({ userId }) => {
		const user = await User.findById(userId).select('-password')
		if (!user) return notFound('Пользователь не найден')

		return Response.json({ user: await serializeUser(user) })
	})
}

// Аватар и рамку можно менять из меню. Список допустимых id
// лежит в lib/account/avatar-options.ts, чтобы клиент и сервер
// не разошлись в названиях.
export async function PATCH(req: Request) {
	return withUser(req, async ({ userId }) => {
		const body = await readJsonBody(req)
		if (!body) return badRequest()
		const update: Record<string, string> = {}

		if (body.avatar !== undefined) {
			if (!isAvatarId(body.avatar)) {
				return badRequest('Неизвестный аватар')
			}
			update.avatar = body.avatar
		}

		if (body.avatarFrame !== undefined) {
			if (!isFrameId(body.avatarFrame)) {
				return badRequest('Неизвестная рамка')
			}
			update.avatarFrame = body.avatarFrame
		}

		if (body.title !== undefined) {
			if (!isTitleId(body.title)) {
				return badRequest('Неизвестный титул')
			}
			update.title = body.title
		}

		if (Object.keys(update).length === 0) {
			return badRequest('Нет изменений')
		}

		const user = await User.findByIdAndUpdate(userId, update, {
			returnDocument: 'after',
		}).select('-password')
		if (!user) return notFound('Пользователь не найден')

		return Response.json({ user: await serializeUser(user) })
	})
}

async function serializeUser(user: StoredUser) {
	// Один запрос даёт и число игр, и суммарную статистику для мини-профиля.
	const totals = await GameResult.aggregate<{
		_id: null
		gamesPlayed: number
		monstersKilled: number
		buildingsBuilt: number
	}>([
		// В GameResult.userId лежит ObjectId, а в JWT — строка: без приведения
		// $match не Finds бы ни одной партии и статистика профиля была нулевой.
		{ $match: { userId: new Types.ObjectId(user._id.toString()) } },
		{
			$group: {
				_id: null,
				gamesPlayed: { $sum: 1 },
				monstersKilled: { $sum: '$monstersKilled' },
				buildingsBuilt: { $sum: '$buildingsBuilt' },
			},
		},
	])
	const rating = await ratingSummary(new Types.ObjectId(user._id.toString()))

	return {
		id: user._id.toString(),
		login: user.login,
		email: user.email,
		record: user.record ?? 0,
		bestWave: user.bestWave ?? 0,
		role: user.role === 'admin' ? 'admin' : 'user',
		avatar: user.avatar ?? DEFAULT_AVATAR,
		avatarFrame: user.avatarFrame ?? DEFAULT_FRAME,
		title: user.title || NO_TITLE,
		gamesPlayed: totals[0]?.gamesPlayed ?? 0,
		monstersKilled: totals[0]?.monstersKilled ?? 0,
		buildingsBuilt: totals[0]?.buildingsBuilt ?? 0,
		ratingPoints: rating.ratingPoints,
		// Место в общем топе по очкам рейтинга.
		rank: rating.rank,
		ratedMaps: rating.ratedMaps,
	}
}
