import bcrypt from 'bcryptjs'

import { badRequest, jsonError, readJsonBody, serverError } from '@/lib/api-auth'
import { connectDB } from '@/lib/db'
import { signToken } from '@/lib/auth'
import User from '@/models/User'

const MAX_LOGIN_LENGTH = 32
const MAX_PASSWORD_LENGTH = 128

export async function POST(req: Request) {
	try {
		await connectDB()
	} catch (error) {
		return serverError(error)
	}

	const body = await readJsonBody(req)
	if (!body) return badRequest()

	const login = typeof body.login === 'string' ? body.login.trim().slice(0, MAX_LOGIN_LENGTH) : ''
	const password =
		typeof body.password === 'string' ? body.password.slice(0, MAX_PASSWORD_LENGTH) : ''
	if (!login || !password) return badRequest('Требуется логин и пароль')

	try {
		const user = await User.findOne({ login })
		// Один ответ и для «такого нет», и для «не тот пароль»: иначе по
		// сообщениям перебирают существующие логины.
		if (!user || !(await bcrypt.compare(password, user.password))) {
			return jsonError('Неверный логин или пароль', 401)
		}

		const token = signToken({
			userId: user._id.toString(),
			login: user.login,
			email: user.email,
			record: user.record,
		})

		return Response.json({ token })
	} catch (error) {
		return serverError(error)
	}
}
