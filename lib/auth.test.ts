import assert from 'node:assert/strict'
import test from 'node:test'
import { getJwtSecret, signToken, verifyToken } from './auth.ts'

const env = process.env as Record<string, string | undefined>

test('uses the secret from the environment', () => {
	const original = env.JWT_SECRET
	env.JWT_SECRET = 'env-secret'

	try {
		assert.equal(getJwtSecret(), 'env-secret')
	} finally {
		if (original === undefined) {
			delete env.JWT_SECRET
		} else {
			env.JWT_SECRET = original
		}
	}
})

test('falls back to the development secret outside production', () => {
	const originalSecret = env.JWT_SECRET
	const originalEnv = env.NODE_ENV
	delete env.JWT_SECRET
	env.NODE_ENV = 'development'

	try {
		assert.equal(getJwtSecret(), 'tower-defense-development-secret')
	} finally {
		env.NODE_ENV = originalEnv
		if (originalSecret !== undefined) env.JWT_SECRET = originalSecret
	}
})

test('refuses to sign tokens in production without a secret', () => {
	const originalSecret = env.JWT_SECRET
	const originalEnv = env.NODE_ENV
	delete env.JWT_SECRET
	env.NODE_ENV = 'production'

	try {
		assert.throws(() => getJwtSecret(), /JWT_SECRET/)
	} finally {
		env.NODE_ENV = originalEnv
		if (originalSecret !== undefined) env.JWT_SECRET = originalSecret
	}
})

test('signs and verifies a token', () => {
	const originalSecret = env.JWT_SECRET
	env.JWT_SECRET = 'test-secret'

	try {
		const token = signToken({ userId: '42', login: 'hero' })
		const payload = verifyToken(token)

		assert.equal(payload.userId, '42')
		assert.equal(payload.login, 'hero')
		assert.throws(() => verifyToken('not-a-token'))
	} finally {
		if (originalSecret === undefined) {
			delete env.JWT_SECRET
		} else {
			env.JWT_SECRET = originalSecret
		}
	}
})
