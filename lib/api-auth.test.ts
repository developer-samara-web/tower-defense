import assert from 'node:assert/strict'
import test from 'node:test'

import jwt from 'jsonwebtoken'

import {
	BAD_REQUEST,
	NOT_AUTHORIZED,
	NO_ACCESS,
	SERVER_ERROR,
	SESSION_EXPIRED,
	badRequest,
	forbidden,
	notFound,
	readBearerToken,
	readJsonBody,
	readObjectId,
	requireUser,
	serverError,
	unauthorized,
} from './api-auth.ts'
import { signToken } from './auth.ts'

const env = process.env as Record<string, string | undefined>

// Токены подписываем своим секретом: тест не должен зависеть от того,
// что лежит в окружении разработчика.
const SECRET = 'api-auth-test-secret'

function requestWith(header: Record<string, string>) {
	return new Request('https://example.test/api/session', { headers: header })
}

function withSecret<T>(run: () => T): T {
	const original = env.JWT_SECRET
	env.JWT_SECRET = SECRET
	try {
		return run()
	} finally {
		if (original === undefined) delete env.JWT_SECRET
		else env.JWT_SECRET = original
	}
}

async function errorOf(response: Response) {
	return (await response.json()) as { error?: string }
}

test('reads only a well-formed Bearer token', () => {
	assert.equal(readBearerToken(requestWith({ authorization: 'Bearer abc ' })), 'abc')
	assert.equal(readBearerToken(requestWith({ authorization: 'abc' })), '')
	assert.equal(readBearerToken(requestWith({ authorization: 'bearer abc' })), '')
	assert.equal(readBearerToken(requestWith({})), '')
})

test('rejects a request without a token', async () => {
	const result = requireUser(requestWith({}))
	assert.equal(result.ok, false)
	if (result.ok) return

	assert.equal(result.response.status, 401)
	assert.equal((await errorOf(result.response)).error, NOT_AUTHORIZED)
})

test('separates an expired session from a broken token', async () => {
	await withSecret(async () => {
		const expired = jwt.sign({ userId: '1' }, SECRET, { algorithm: 'HS256', expiresIn: '-1s' })
		const expiredResult = requireUser(requestWith({ authorization: `Bearer ${expired}` }))
		assert.equal(expiredResult.ok, false)
		if (expiredResult.ok) return
		assert.equal((await errorOf(expiredResult.response)).error, SESSION_EXPIRED)

		// Чужая подпись — это не «истёкшая сессия»: игроку рано перелогиниваться,
		// токен просто не настоящий.
		const foreign = jwt.sign({ userId: '1' }, 'another-secret', { algorithm: 'HS256' })
		const foreignResult = requireUser(requestWith({ authorization: `Bearer ${foreign}` }))
		assert.equal(foreignResult.ok, false)
		if (foreignResult.ok) return
		assert.equal((await errorOf(foreignResult.response)).error, NOT_AUTHORIZED)
	})
})

test('refuses a token that is not signed with our algorithm', async () => {
	// Токен без подписи (alg=none) — классическая подделка: проверка
	// обязана отказать, а не распознать в нём «настоящего» игрока.
	const none = new Request('https://example.test/api/session', {
		headers: {
			authorization:
				'Bearer ' +
				Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url') +
				'.' +
				Buffer.from(JSON.stringify({ userId: '1' })).toString('base64url') +
				'.',
		},
	})

	const result = requireUser(none)
	assert.equal(result.ok, false)
	if (result.ok) return
	assert.equal(result.response.status, 401)
	assert.equal((await errorOf(result.response)).error, NOT_AUTHORIZED)
})

test('accepts a token we signed ourselves', async () => {
	await withSecret(() => {
		const token = signToken({ userId: '64f000000000000000000001', login: 'hero' })
		const result = requireUser(requestWith({ authorization: `Bearer ${token}` }))

		assert.equal(result.ok, true)
		if (!result.ok) return
		assert.equal(result.payload.userId, '64f000000000000000000001')
	})
})

test('missing secret is a server fault, not an unauthorized request', async () => {
	const originalSecret = env.JWT_SECRET
	const originalEnv = env.NODE_ENV
	delete env.JWT_SECRET
	env.NODE_ENV = 'production'

	try {
		const token = jwt.sign({ userId: '1' }, 'whatever', { algorithm: 'HS256' })
		const result = requireUser(requestWith({ authorization: `Bearer ${token}` }))
		assert.equal(result.ok, false)
		if (result.ok) return
		assert.equal(result.response.status, 500)
	} finally {
		env.NODE_ENV = originalEnv
		if (originalSecret !== undefined) env.JWT_SECRET = originalSecret
	}
})

test('each access error carries its own status and Russian text', async () => {
	const responses = [
		[401, NOT_AUTHORIZED, unauthorized()] as const,
		[403, NO_ACCESS, forbidden()] as const,
		[404, 'Не найдено.', notFound()] as const,
		[400, BAD_REQUEST, badRequest()] as const,
	]

	for (const [status, message, response] of responses) {
		assert.equal(response.status, status)
		assert.equal((await errorOf(response)).error, message)
	}

	const server = serverError()
	assert.equal(server.status, 500)
	assert.equal((await errorOf(server)).error, SERVER_ERROR)
})

test('reads object ids only in the shape MongoDB accepts', () => {
	assert.equal(readObjectId('64f000000000000000000001'), '64f000000000000000000001')
	assert.equal(readObjectId('64F000000000000000000001'), '64F000000000000000000001')
	assert.equal(readObjectId('../../etc/passwd'), null)
	assert.equal(readObjectId({ toString: () => 'x' } as unknown as string), null)
	assert.equal(readObjectId('64f0'), null)
	assert.equal(readObjectId(null), null)
	assert.equal(readObjectId(undefined), null)
})

test('json body parser never throws on garbage', async () => {
	const valid = new Request('https://example.test', {
		method: 'POST',
		body: JSON.stringify({ mapSeed: 'abc' }),
	})
	assert.deepEqual(await readJsonBody(valid), { mapSeed: 'abc' })

	const broken = new Request('https://example.test', { method: 'POST', body: '{' })
	assert.equal(await readJsonBody(broken), null)

	for (const body of ['[]', '"text"', '42', 'null']) {
		const request = new Request('https://example.test', { method: 'POST', body })
		assert.equal(await readJsonBody(request), null, body)
	}

	const empty = new Request('https://example.test', { method: 'POST', body: '' })
	assert.equal(await readJsonBody(empty), null)
})
