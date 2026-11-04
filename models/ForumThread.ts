import { Schema, model, models } from 'mongoose'

// Мини-форум делится на три раздела: обновления, игра и карты.
// Тема хранит только стартовое сообщение, ответы лежат отдельной моделью:
// так лента не тянет из базы всю переписку целиком.
export const FORUM_CATEGORIES = ['updates', 'game', 'maps'] as const
export type ForumCategory = (typeof FORUM_CATEGORIES)[number]

const ForumThreadSchema = new Schema({
	category: {
		type: String,
		enum: FORUM_CATEGORIES,
		required: true,
		default: 'game',
	},
	title: {
		type: String,
		required: true,
		trim: true,
		maxlength: 120,
	},
	body: {
		type: String,
		required: true,
		trim: true,
		maxlength: 4000,
	},
	authorId: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	// Тема о карте: id опубликованной карты. У остальных разделов пусто.
	mapId: {
		type: Schema.Types.ObjectId,
		ref: 'GameMap',
		default: null,
	},
	// Закреплённые темы держатся сверху: правила и важные объявления.
	pinned: {
		type: Boolean,
		default: false,
	},
	postCount: {
		type: Number,
		default: 0,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
	lastPostAt: {
		type: Date,
		default: Date.now,
	},
})

// Лента раздела: закреплённые сверху, дальше по времени последнего ответа.
ForumThreadSchema.index({ category: 1, pinned: -1, lastPostAt: -1 })
// Темы одной карты: по ним строится блок обсуждения в библиотеке.
ForumThreadSchema.index({ mapId: 1, createdAt: -1 })

// См. models/User.ts: в dev модель нужно перерегистрировать после правки схемы.
if (process.env.NODE_ENV !== 'production') delete models.ForumThread

export const ForumThread = models.ForumThread || model('ForumThread', ForumThreadSchema)
