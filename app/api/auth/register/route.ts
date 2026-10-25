import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import User from '@/models/User'

export async function POST(req: Request) {
	await connectDB()

	const { login, email, password } = await req.json()

	if (!login || !email || !password) {
		return Response.json({ error: 'Все поля обязательны' }, { status: 400 })
	}

	const existing = await User.findOne({ $or: [{ login }, { email }] })
	if (existing) {
		return Response.json({ error: 'Пользователь уже существует' }, { status: 409 })
	}

	const hash = await bcrypt.hash(password, 10)
	await User.create({ login, email, password: hash, record: 0 })

	return Response.json({ ok: true })
}
