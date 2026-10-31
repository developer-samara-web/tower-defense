import { Schema, models, model } from 'mongoose'

// Лучший результат игрока на конкретной карте. Как топ одной карты в osu!:
// на карту пишется только рекорд, повторные забеги двигают счётчик попыток,
// но не строку топа.
const MapScoreSchema = new Schema({
	mapId: {
		type: Schema.Types.ObjectId,
		ref: 'GameMap',
		required: true,
	},
	userId: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	// Очки результата: зависят от звёзд карты, глубины волны и целости замка.
	points: {
		type: Number,
		default: 0,
	},
	wave: {
		type: Number,
		default: 0,
	},
	gold: {
		type: Number,
		default: 0,
	},
	// Звёзды карты на момент забега — иначе пересчёт сложности менял бы
	// уже выданные очки задним числом.
	stars: {
		type: Number,
		default: 0,
	},
	// Рейтинговая ли была карта на момент забега. Только такие очки входят
	// в общий рейтинг игрока; нерейтинговые карты остаются со своим топом.
	rated: {
		type: Boolean,
		default: false,
	},
	plays: {
		type: Number,
		default: 1,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
	updatedAt: {
		type: Date,
		default: Date.now,
	},
})

// Одна строка на пару «игрок — карта», и она же обеспечит быструю выдачу
// топа карты, отсортированного по очкам.
MapScoreSchema.index({ mapId: 1, userId: 1 }, { unique: true })
MapScoreSchema.index({ mapId: 1, points: -1, updatedAt: 1 })
// Лучшее по картам для профиля игрока и пересчёта его рейтинга.
MapScoreSchema.index({ userId: 1, points: -1 })

// См. models/User.ts: в dev модель нужно перерегистрировать после правки схемы.
if (process.env.NODE_ENV !== 'production') delete models.MapScore

export const MapScore = models.MapScore || model('MapScore', MapScoreSchema)
