import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI

export async function connectDB() {
	if (!MONGODB_URI) {
		throw new Error('Переменная окружения MONGODB_URI не задана')
	}

	if (mongoose.connection.readyState >= 1) {
		return mongoose.connection.asPromise()
	}

	return mongoose.connect(MONGODB_URI, {
		dbName: 'tower_defense',
	})
}
