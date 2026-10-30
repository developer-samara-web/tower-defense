import { Schema, models, model } from 'mongoose'

const SessionSchema = new Schema({
	userId: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	mapSeed: {
		type: String,
		required: true,
	},
	gameState: {
		type: String, // Serialized JSON
		required: true,
	},
	stats: {
		type: String, // Serialized JSON
		default: '{}',
	},
	lastSaved: {
		type: Date,
		default: Date.now,
	},
}, {
	timestamps: true,
})

// См. models/User.ts: в dev модель нужно перерегистрировать после правки схемы.
if (process.env.NODE_ENV !== 'production') delete models.Session

export const Session = models.Session || model('Session', SessionSchema)
