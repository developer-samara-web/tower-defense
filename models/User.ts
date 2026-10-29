import mongoose from 'mongoose'

export type UserRole = 'user' | 'admin'

export interface IUser {
	login: string
	email: string
	password: string
	record: number
	bestWave: number
	// Админ видит очередь модерации карт и назначает рейтинг.
	role: UserRole
	// id из списка заглушек в lib/account/avatar-options.ts.
	avatar: string
	avatarFrame: string
	createdAt: Date
}

const UserSchema = new mongoose.Schema<IUser>({
	login: { type: String, required: true, unique: true },
	email: { type: String, required: true, unique: true },
	password: { type: String, required: true },
	record: { type: Number, default: 0 },
	bestWave: { type: Number, default: 0 },
	role: { type: String, enum: ['user', 'admin'], default: 'user' },
	avatar: { type: String, default: 'default' },
	avatarFrame: { type: String, default: 'none' },
	createdAt: { type: Date, default: Date.now },
})

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
