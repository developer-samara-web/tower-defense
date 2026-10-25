import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { connectDB } from '@/lib/db'
import User from '@/models/User'

const JWT_SECRET = 'tower-defense-secret-key-2026'

export async function POST(req: Request) {
	await connectDB()

	const { login, password } = await req.json()

	if (!login || !password) {
		return Response.json({ error: 'Требуется логин и пароль' }, { status: 400 })
	}

	const user = await User.findOne({ login })
	if (!user) {
		return Response.json({ error: 'Пользователь не найден' }, { status: 401 })
	}

	const valid = await bcrypt.compare(password, user.password)
	if (!valid) {
		return Response.json({ error: 'Неверный пароль' }, { status: 401 })
	}

	const token = jwt.sign(
		{ userId: user._id.toString(), login: user.login, email: user.email, record: user.record },
		JWT_SECRET,
		{ expiresIn: '7d' }
	)

	return Response.json({ token })
}
