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

export const Session = models.Session || model('Session', SessionSchema)
