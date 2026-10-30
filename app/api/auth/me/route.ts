import { connectDB } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { DEFAULT_AVATAR, DEFAULT_FRAME, isAvatarId, isFrameId } from '@/lib/account/avatar-options'
import { NO_TITLE, isTitleId } from '@/lib/account/title-options'
import User from '@/models/User'
import { GameResult } from '@/models/GameResult'

type StoredUser = {
	_id: { toString(): string }
	login: string
	email: string
	record?: number
	bestWave?: number
	role?: string
	avatar?: string
	avatarFrame?: string
	title?: string
}

export async function GET(req: Request) {
	await connectDB()

	const auth = req.headers.get('authorization') || ''
	const token = auth.replace('Bearer ', '')

	if (!token) {
		return Response.json({ error: 'Нет доступа' }, { status: 401 })
	}

	try {
		const payload = verifyToken(token)

		const user = await User.findById(payload.userId).select('-password')
		if (!user) {
			return Response.json({ error: 'Пользователь не найден' }, { status: 404 })
		}

		return Response.json({ user: await serializeUser(user) })
	} catch {
		return Response.json({ error: 'Неверный токен' }, { status: 401 })
	}
}

// Аватар и рамку можно менять из меню. Список допустимых id
// лежит в lib/account/avatar-options.ts, чтобы клиент и сервер
// не разошлись в названиях.
export async function PATCH(req: Request) {
	await connectDB()

	const auth = req.headers.get('authorization') || ''
	const token = auth.replace('Bearer ', '')

	if (!token) {
		return Response.json({ error: 'Нет доступа' }, { status: 401 })
	}

	try {
		const payload = verifyToken(token)
		const body = await req.json()
		const update: Record<string, string> = {}

		if (body?.avatar !== undefined) {
			if (!isAvatarId(body.avatar)) {
				return Response.json({ error: 'Неизвестный аватар' }, { status: 400 })
			}
			update.avatar = body.avatar
		}

		if (body?.avatarFrame !== undefined) {
			if (!isFrameId(body.avatarFrame)) {
				return Response.json({ error: 'Неизвестная рамка' }, { status: 400 })
			}
			update.avatarFrame = body.avatarFrame
		}

		if (body?.title !== undefined) {
			if (!isTitleId(body.title)) {
				return Response.json({ error: 'Неизвестный титул' }, { status: 400 })
			}
			update.title = body.title
		}

		if (Object.keys(update).length === 0) {
			return Response.json({ error: 'Нет изменений' }, { status: 400 })
		}

		const user = await User.findByIdAndUpdate(payload.userId, update, {
			returnDocument: 'after',
		}).select('-password')
		if (!user) {
			return Response.json({ error: 'Пользователь не найден' }, { status: 404 })
		}

		return Response.json({ user: await serializeUser(user) })
	} catch {
		return Response.json({ error: 'Неверный токен' }, { status: 401 })
	}
}

async function serializeUser(user: StoredUser) {
	// Один запрос даёт и число игр, и суммарную статистику для мини-профиля.
	const [totals] = await GameResult.aggregate<{
		_id: null
		gamesPlayed: number
		monstersKilled: number
		buildingsBuilt: number
	}>([
		{ $match: { userId: user._id.toString() } },
		{
			$group: {
				_id: null,
				gamesPlayed: { $sum: 1 },
				monstersKilled: { $sum: '$monstersKilled' },
				buildingsBuilt: { $sum: '$buildingsBuilt' },
			},
		},
	])

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
		gamesPlayed: totals?.gamesPlayed ?? 0,
		monstersKilled: totals?.monstersKilled ?? 0,
		buildingsBuilt: totals?.buildingsBuilt ?? 0,
	}
}
