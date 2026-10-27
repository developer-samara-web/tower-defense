import jwt from 'jsonwebtoken'

export type AuthPayload = {
	userId: string
	login?: string
	email?: string
	record?: number
}

// В продакшене секрет обязан приходить из окружения:
// иначе любой мог бы подписать токен от имени другого игрока.
export function getJwtSecret() {
	const secret = process.env.JWT_SECRET
	if (secret) return secret
	if (process.env.NODE_ENV === 'production') {
		throw new Error('JWT_SECRET не задан в переменных окружения')
	}

	return 'tower-defense-development-secret'
}

export function signToken(payload: AuthPayload) {
	return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' })
}

export function verifyToken(token: string) {
	return jwt.verify(token, getJwtSecret()) as AuthPayload
}
