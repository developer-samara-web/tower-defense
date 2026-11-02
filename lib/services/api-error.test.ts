import assert from 'node:assert/strict'
import test from 'node:test'

import { ApiError, isUnauthorized, readOk } from './api-error.ts'

function response(status: number, body?: unknown) {
	return new Response(body === undefined ? null : JSON.stringify(body), { status })
}

test('passes the parsed body through on success', async () => {
	assert.deepEqual(await readOk(response(200, { id: '1' }), 'запас'), { id: '1' })
})

test('uses the server text when the answer carries one', async () => {
	const error = await readOk(response(403, { error: 'Нет доступа к этой игре.' }), 'запас').catch(
		(error: unknown) => error,
	)

	assert.ok(error instanceof ApiError)
	assert.equal(error.status, 403)
	assert.equal(error.message, 'Нет доступа к этой игре.')
	assert.equal(isUnauthorized(error), false)
})

test('falls back to its own text when the answer is not json', async () => {
	const html = new Response('<html>500</html>', { status: 500 })
	const error = await readOk<{ id: string }>(html, 'Сервер временно недоступен').catch(
		(error: unknown) => error,
	)

	assert.ok(error instanceof ApiError)
	assert.equal(error.status, 500)
	assert.equal(error.message, 'Сервер временно недоступен')
})

test('only 401 asks the player to log in again', () => {
	assert.equal(isUnauthorized(new ApiError(401, 'x')), true)
	assert.equal(isUnauthorized(new ApiError(404, 'x')), false)
	assert.equal(isUnauthorized(new Error('x')), false)
	assert.equal(isUnauthorized(null), false)
})
