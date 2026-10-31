import mongoose from 'mongoose'

import { DEFAULT_AVATAR, DEFAULT_FRAME } from '@/lib/account/avatar-options'
import { NO_TITLE } from '@/lib/account/title-options'

export type UserRole = 'user' | 'admin'

export interface IUser {
	login: string
	email: string
	password: string
	record: number
	bestWave: number
	// Очки рейтинга: сумма лучших результатов игрока по рейтинговым картам.
	// Пересчитывается сервером при записи забега, по ней строится общий топ.
	ratingPoints: number
	// Админ видит очередь модерации карт и назначает рейтинг.
	role: UserRole
	// id аватара и рамки из lib/account/avatar-options.ts.
	avatar: string
	avatarFrame: string
	// id титула из lib/account/title-options.ts или 'none'.
	title: string
	createdAt: Date
}

const UserSchema = new mongoose.Schema<IUser>({
	login: { type: String, required: true, unique: true },
	email: { type: String, required: true, unique: true },
	password: { type: String, required: true },
	record: { type: Number, default: 0 },
	bestWave: { type: Number, default: 0 },
	ratingPoints: { type: Number, default: 0 },
	role: { type: String, enum: ['user', 'admin'], default: 'user' },
	avatar: { type: String, default: DEFAULT_AVATAR },
	avatarFrame: { type: String, default: DEFAULT_FRAME },
	title: { type: String, default: NO_TITLE },
	createdAt: { type: Date, default: Date.now },
})

// Реестр моделей Mongoose живёт в процессе, а next dev его не перезапускает:
// старая схема переживает правку файла, и strict-режим молча вырезает новые
// поля из запросов. В проде модель регистрируется один раз.
if (process.env.NODE_ENV !== 'production') {
	delete mongoose.models.User
}

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
