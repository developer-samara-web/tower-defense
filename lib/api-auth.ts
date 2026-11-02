import jwt from 'jsonwebtoken'

import { connectDB } from './db.ts'
import { verifyToken, type AuthPayload } from './auth.ts'

// Ошибки доступа видит игрок, а не только логи сервера: у каждой причины
// должен быть свой текст и свой статус. Раньше любой сбой (битое тело
// запроса, упавшая база) превращался в 401 «Authentication failed», и
// клиент не понимал, предлагать вход или просто повторить попытку.
export {
	BAD_REQUEST,
	NOT_AUTHORIZED,
	NO_ACCESS,
	SERVER_ERROR,
	SESSION_EXPIRED,
} from './access-messages.ts'

import { BAD_REQUEST, NOT_AUTHORIZED, NO_ACCESS, SERVER_ERROR, SESSION_EXPIRED } from './access-messages.ts'

export type AuthResult =
	| { ok: true; payload: AuthPayload }
	| { ok: false; response: Response }

export function jsonError(message: string, status: number) {
	return Response.json({ error: message }, { status })
}

export function unauthorized(message = NOT_AUTHORIZED) {
	return jsonError(message, 401)
}

export function forbidden(message = NO_ACCESS) {
	return jsonError(message, 403)
}

export function notFound(message = 'Не найдено.') {
	return jsonError(message, 404)
}

export function badRequest(message = BAD_REQUEST) {
	return jsonError(message, 400)
}

// Текст ошибки уходит в лог, игроку показываем нейтральную формулировку:
// сообщения драйвера и библиотек не должны попадать в интерфейс.
export function serverError(error?: unknown) {
	if (error instanceof Error) console.error('[api]', error.message)
	return jsonError(SERVER_ERROR, 500)
}

// Токен носим в заголовке: «Bearer» по RFC регистрозависимый, но клиент
// мог прислать лишние пробелы — их снимаем.
export function readBearerToken(req: Request): string {
	const header = req.headers.get('authorization') || ''
	if (!header.startsWith('Bearer ')) return ''
	return header.slice('Bearer '.length).trim()
}

export function requireUser(req: Request): AuthResult {
	const token = readBearerToken(req)
	if (!token) return { ok: false, response: unauthorized() }

	try {
		return { ok: true, payload: verifyToken(token) }
	} catch (error) {
		// Просроченный токен — отдельная причина: игроку нужно перелогиниться,
		// а не заводить новый аккаунт.
		if (error instanceof jwt.TokenExpiredError) {
			return { ok: false, response: unauthorized(SESSION_EXPIRED) }
		}
		if (error instanceof jwt.JsonWebTokenError) {
			return { ok: false, response: unauthorized() }
		}
		// Всё остальное — настройка сервера (например, пропавший JWT_SECRET),
		// выдавать это за «не авторизован» нельзя.
		return { ok: false, response: serverError(error) }
	}
}

// Общий каркас защищённого роута: проверка токена, подключение к базе и
// единая обработка сбоя. Без него каждый роут ловил ошибку как мог — чаще
// всего молча превращая её в 401.
export async function withUser(
	req: Request,
	handler: (payload: AuthPayload) => Promise<Response>,
) {
	const auth = requireUser(req)
	if (!auth.ok) return auth.response

	try {
		await connectDB()
		return await handler(auth.payload)
	} catch (error) {
		return serverError(error)
	}
}

// ObjectId — 24 шестнадцатеричные цифры. Регулярка, а не new Types.ObjectId:
// конструктор не валидирует строку, а в запрос не должен попадать мусор.
export function readObjectId(value: string | null | undefined) {
	return value && /^[a-f\d]{24}$/i.test(value) ? value : null
}

export async function readJsonBody(req: Request): Promise<Record<string, unknown> | null> {
	try {
		const body: unknown = await req.json()
		return body && typeof body === 'object' && !Array.isArray(body)
			? (body as Record<string, unknown>)
			: null
	} catch {
		return null
	}
}
