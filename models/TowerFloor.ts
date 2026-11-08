import { Schema, models, model } from 'mongoose'

// Этаж бесконечной башни: общий для всех игроков черновик карты.
// Запись создаётся при первом достижении этажа и больше не меняется,
// поэтому у всех игроков один и тот же этаж выглядит одинаково.
const TowerFloorSchema = new Schema({
	floor: {
		type: Number,
		required: true,
		unique: true,
		index: true,
	},
	data: {
		type: Schema.Types.Mixed,
		required: true,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
})

// См. models/User.ts: в dev модель нужно перерегистрировать после правки схемы.
if (process.env.NODE_ENV !== 'production') delete models.TowerFloor

export const TowerFloor = models.TowerFloor || model('TowerFloor', TowerFloorSchema)
