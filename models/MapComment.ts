import { Schema, model, models } from 'mongoose'

// Комментарий под картой в библиотеке. Отдельная модель, а не тема форума:
// под картой нужен короткий отзыв, а не ветка с ответами.
const MapCommentSchema = new Schema({
	mapId: {
		type: Schema.Types.ObjectId,
		ref: 'GameMap',
		required: true,
	},
	authorId: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	body: {
		type: String,
		required: true,
		trim: true,
		maxlength: 2000,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
})

// Комментарии карты читаются свежими сверху.
MapCommentSchema.index({ mapId: 1, createdAt: -1 })

// См. models/User.ts: в dev модель нужно перерегистрировать после правки схемы.
if (process.env.NODE_ENV !== 'production') delete models.MapComment

export const MapComment = models.MapComment || model('MapComment', MapCommentSchema)
