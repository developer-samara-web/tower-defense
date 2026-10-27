import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import { signToken } from '@/lib/auth'
import User from '@/models/User'

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

	const token = signToken({
		userId: user._id.toString(),
		login: user.login,
		email: user.email,
		record: user.record,
	})

	return Response.json({ token })
}
