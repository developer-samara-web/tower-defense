import { Schema, models, model } from 'mongoose'

const GameResultSchema = new Schema({
	userId: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	wave: {
		type: Number,
		required: true,
	},
	gold: {
		type: Number,
		required: true,
	},
	// Карта забега и её рейтинг на момент завершения игры. Рейтинговой
	// считается только одобренная карта с флагом rated, поэтому флаг
	// храним здесь — потом админ может снять его с карты.
	mapId: {
		type: Schema.Types.ObjectId,
		ref: 'GameMap',
		default: null,
	},
	rated: {
		type: Boolean,
		default: false,
	},
	level: {
		type: Number,
		default: 1,
	},
	monstersKilled: {
		type: Number,
		default: 0,
	},
	buildingsBuilt: {
		type: Number,
		default: 0,
	},
	moneySpent: {
		type: Number,
		default: 0,
	},
	damageDealt: {
		type: Number,
		default: 0,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
})

// История читается только вниз по времени и всегда в рамках одного игрока.
GameResultSchema.index({ userId: 1, _id: -1 })

// См. models/User.ts: в dev модель нужно перерегистрировать после правки схемы.
if (process.env.NODE_ENV !== 'production') delete models.GameResult

export const GameResult = models.GameResult || model('GameResult', GameResultSchema)
