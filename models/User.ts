import mongoose from 'mongoose'

export interface IUser {
	login: string
	email: string
	password: string
	record: number
	createdAt: Date
}

const UserSchema = new mongoose.Schema<IUser>({
	login: { type: String, required: true, unique: true },
	email: { type: String, required: true, unique: true },
	password: { type: String, required: true },
	record: { type: Number, default: 0 },
	createdAt: { type: Date, default: Date.now },
})

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
