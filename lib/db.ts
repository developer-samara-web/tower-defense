import mongoose from 'mongoose'

const MONGODB_URI = 'mongodb://root:6W48gpsq@localhost:27017/?authSource=admin'

export async function connectDB() {
	if (mongoose.connection.readyState >= 1) return mongoose.connection.asPromise()

	return mongoose.connect(MONGODB_URI, {
		dbName: 'tower_defense',
	})
}
