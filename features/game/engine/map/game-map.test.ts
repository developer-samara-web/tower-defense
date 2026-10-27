import assert from 'node:assert/strict'
import test from 'node:test'
import { COLS, ROWS } from '../../config/game.config.ts'
import {
	BOARD_PIXEL_HEIGHT,
	BOARD_PIXEL_WIDTH,
	CENTER_CELL,
	createGameMap,
	mapSeedToNumber,
} from './game-map.ts'

test('hashes seeds to stable unsigned numbers', () => {
	assert.equal(mapSeedToNumber('alpha'), mapSeedToNumber('alpha'))
	assert.notEqual(mapSeedToNumber('alpha'), mapSeedToNumber('beta'))
	assert.equal(mapSeedToNumber(-1), 0xffffffff)
	assert.ok(mapSeedToNumber('alpha') >= 0)
})

test('builds the same map for the same seed', () => {
	assert.deepEqual(createGameMap('resume-me'), createGameMap('resume-me'))
	assert.notDeepEqual(createGameMap('resume-me').roads, createGameMap('other').roads)
})

test('makes four roads from the edges to the castle gates', () => {
	const map = createGameMap(42)
	const [cx, cy] = CENTER_CELL

	assert.equal(map.roads.length, 4)

	for (const road of map.roads) {
		const start = road[0]
		const end = road[road.length - 1]
		assert.ok(start && end)

		const startsOutside =
			start[0] < 0 || start[0] > COLS || start[1] < 0 || start[1] > ROWS
		assert.equal(startsOutside, true)

		const endsAtGate =
			(end[0] === cx && Math.abs(end[1] - cy) === 2) ||
			(end[1] === cy && Math.abs(end[0] - cx) === 2)
		assert.equal(endsAtGate, true)
	}
})

test('converts every road cell to a board point', () => {
	const map = createGameMap('points')

	assert.equal(map.roadPoints.length, map.roads.length)
	for (let i = 0; i < map.roads.length; i++) {
		assert.equal(map.roadPoints[i]?.length, map.roads[i]?.length)
	}

	assert.equal(BOARD_PIXEL_WIDTH, COLS * 32)
	assert.equal(BOARD_PIXEL_HEIGHT, ROWS * 32)
})
