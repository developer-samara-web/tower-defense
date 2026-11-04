import { Schema, model, models } from 'mongoose'

// Ответ в теме форума. Счётчик ответов и дату последней активности
// обновляет роут создания сообщения, чтобы лента не считала их на лету.
const ForumPostSchema = new Schema({
	threadId: {
		type: Schema.Types.ObjectId,
		ref: 'ForumThread',
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
		maxlength: 4000,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
})

ForumPostSchema.index({ threadId: 1, createdAt: 1 })

// См. models/User.ts: в dev модель нужно перерегистрировать после правки схемы.
if (process.env.NODE_ENV !== 'production') delete models.ForumPost

export const ForumPost = models.ForumPost || model('ForumPost', ForumPostSchema)
