import jwt from 'jsonwebtoken'
import { connectDB } from '@/lib/db'
import User from '@/models/User'

const JWT_SECRET = 'tower-defense-secret-key-2026'

export async function GET(req: Request) {
	await connectDB()

	const auth = req.headers.get('authorization') || ''
	const token = auth.replace('Bearer ', '')

	if (!token) {
		return Response.json({ error: 'Нет доступа' }, { status: 401 })
	}

	try {
		const payload = jwt.verify(token, JWT_SECRET) as { userId: string; login: string; email: string; record: number }

		const user = await User.findById(payload.userId).select('-password')
		if (!user) {
			return Response.json({ error: 'Пользователь не найден' }, { status: 404 })
		}

		return Response.json({ user: { id: user._id.toString(), login: user.login, email: user.email, record: user.record } })
	} catch {
		return Response.json({ error: 'Неверный токен' }, { status: 401 })
	}
}
