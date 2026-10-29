import { Schema, models, model } from 'mongoose'

// Пользовательская карта проходит путь черновик → модерация → публикация.
// Рейтинговой её делает только администратор.
const GameMapSchema = new Schema({
	userId: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	name: {
		type: String,
		required: true,
		trim: true,
		maxlength: 40,
	},
	seed: {
		type: String,
		required: true,
	},
	cols: {
		type: Number,
		default: 100,
	},
	rows: {
		type: Number,
		default: 100,
	},
	difficulty: {
		type: String,
		default: 'Средняя',
		enum: ['Лёгкая', 'Средняя', 'Трудная', 'Экстремальная'],
	},
	previewColor: {
		type: String,
		default: '#6b8e32',
	},
	// Черновик редактора: замок, казармы, вода и лес. Пусто у старых
	// карт, которые целиком строятся из сида.
	data: {
		type: Schema.Types.Mixed,
		default: null,
	},
	moderation: {
		type: String,
		enum: ['draft', 'pending', 'approved', 'rejected'],
		default: 'draft',
	},
	rated: {
		type: Boolean,
		default: false,
	},
	submittedAt: {
		type: Date,
		default: null,
	},
	reviewedAt: {
		type: Date,
		default: null,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
})

// Список карт всегда читается по владельцу, свежие идут первыми.
GameMapSchema.index({ userId: 1, createdAt: -1 })
// Публичные разделы библиотеки: опубликованные карты по рейтингу.
GameMapSchema.index({ moderation: 1, rated: 1, createdAt: -1 })

export const GameMap = models.GameMap || model('GameMap', GameMapSchema)
