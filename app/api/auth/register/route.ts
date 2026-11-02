import bcrypt from 'bcryptjs'

import { badRequest, jsonError, readJsonBody, serverError } from '@/lib/api-auth'
import { connectDB } from '@/lib/db'
import User from '@/models/User'

const LOGIN_PATTERN = /^[\p{L}\p{N}_-]{3,32}$/u
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const MIN_PASSWORD_LENGTH = 6
const MAX_PASSWORD_LENGTH = 128

export async function POST(req: Request) {
	try {
		await connectDB()
	} catch (error) {
		return serverError(error)
	}

	const body = await readJsonBody(req)
	if (!body) return badRequest()

	const login = typeof body.login === 'string' ? body.login.trim() : ''
	const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
	const password = typeof body.password === 'string' ? body.password : ''

	if (!login || !email || !password) {
		return badRequest('Все поля обязательны')
	}
	if (!LOGIN_PATTERN.test(login)) {
		return badRequest('Логин: 3–32 буквы, цифры, «_» или «-»')
	}
	if (!EMAIL_PATTERN.test(email) || email.length > 128) {
		return badRequest('Некорректный e-mail')
	}
	if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
		return badRequest(`Пароль от ${MIN_PASSWORD_LENGTH} до ${MAX_PASSWORD_LENGTH} символов`)
	}

	try {
		const existing = await User.findOne({ $or: [{ login }, { email }] })
		if (existing) {
			return jsonError('Такой логин или e-mail уже занят', 409)
		}

		const hash = await bcrypt.hash(password, 10)
		await User.create({ login, email, password: hash, record: 0 })

		return Response.json({ ok: true })
	} catch (error) {
		return serverError(error)
	}
}
