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
	// Обучение пройдено: после него в главном меню один раз рассказываем
	// про рейтинговые игры. Флаг держим на сервере — сброс localStorage
	// не должен превращать пройденное обучение в не пройденное.
	tutorialCompleted: boolean
	// Рассказ про рейтинг уже показан: второй раз игрока не отвлекаем.
	ratedIntroShown: boolean
	// Бесконечная башня: самый высокий открытый этаж (1 — первый доступен)
	// и валюта, которую игрок получает за первое прохождение этажа.
	towerMaxFloor: number
	towerCoins: number
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
	tutorialCompleted: { type: Boolean, default: false },
	ratedIntroShown: { type: Boolean, default: false },
	towerMaxFloor: { type: Number, default: 1 },
	towerCoins: { type: Number, default: 0 },
	createdAt: { type: Date, default: Date.now },
})

// Реестр моделей Mongoose живёт в процессе, а next dev его не перезапускает:
// старая схема переживает правку файла, и strict-режим молча вырезает новые
// поля из запросов. В проде модель регистрируется один раз.
if (process.env.NODE_ENV !== 'production') {
	delete mongoose.models.User
}

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
