import assert from 'node:assert/strict'
import test from 'node:test'

import {
	cellKey,
	createCustomGameMap,
	normalizeMapDraft,
} from '../engine/map/custom-map.ts'
import { waveSpawnTotal, waveSpawnUnits } from '../engine/map/custom-waves.ts'
import {
	TOWER_BOSS_WAVES,
	TOWER_FLOOR_COLS,
	TOWER_FLOOR_ROWS,
	TOWER_FLOOR_WAVES,
	buildTowerFloorDraft,
	towerFloorReward,
	towerFloorSeed,
} from './tower-floor.ts'

test('tower floor is a stable 40×40 map with three windows', () => {
	const draft = buildTowerFloorDraft(1)

	assert.equal(draft.cols, TOWER_FLOOR_COLS)
	assert.equal(draft.rows, TOWER_FLOOR_ROWS)
	assert.equal(draft.spawners.length, 3)
	assert.equal(draft.castle?.x, 20)
	assert.equal(draft.castle?.y, 20)
	assert.equal(draft.wallCells?.length, (TOWER_FLOOR_COLS + TOWER_FLOOR_ROWS) * 2 - 4 - 3)

	// Карта детерминирована: сервер и клиент получают один и тот же этаж.
	assert.deepEqual(buildTowerFloorDraft(1), draft)
	assert.notDeepEqual(buildTowerFloorDraft(2), draft)
	assert.equal(towerFloorSeed(3), 'tower:3')
})

test('tower windows cut through the wall and roads reach the castle', () => {
	const draft = buildTowerFloorDraft(1)
	const walls = new Set(draft.wallCells ?? [])

	for (const spawner of draft.spawners) {
		const onBorder =
			spawner.x === 0 ||
			spawner.y === 0 ||
			spawner.x === TOWER_FLOOR_COLS - 1 ||
			spawner.y === TOWER_FLOOR_ROWS - 1

		assert.equal(onBorder, true)
		assert.equal(walls.has(cellKey(spawner.x, spawner.y)), false)
	}

	const map = createCustomGameMap(draft)
	assert.equal(map.spawners.length, draft.spawners.length)
	assert.equal(map.routes?.length, draft.spawners.length)
	assert.equal(map.wallCells?.length, draft.wallCells?.length)
})

test('tower floor has fifteen waves with bosses only on 10 and 15', () => {
	const draft = buildTowerFloorDraft(1)
	const map = createCustomGameMap(draft)

	assert.equal(draft.waves.waves.length, TOWER_FLOOR_WAVES)
	assert.deepEqual(
		draft.waves.waves.filter((wave) => wave.boss).map((wave) => wave.id),
		TOWER_BOSS_WAVES.map((wave) => `tower-1-${wave}`),
	)

	for (let wave = 1; wave <= TOWER_FLOOR_WAVES; wave++) {
		const hasBoss = waveSpawnUnits(map, wave).some((unit) => unit.troop.type === 'boss')
		assert.equal(hasBoss, TOWER_BOSS_WAVES.includes(wave), `wave ${wave}`)
	}
})

test('deeper floors are harder and pay more', () => {
	const first = createCustomGameMap(buildTowerFloorDraft(1))
	const fifth = createCustomGameMap(buildTowerFloorDraft(5))

	assert.ok(waveSpawnTotal(fifth, 15) >= waveSpawnTotal(first, 15))
	assert.ok(towerFloorReward(5) > towerFloorReward(1))
})

test('normalized tower draft keeps walls away from windows', () => {
	const draft = buildTowerFloorDraft(2)
	const normalized = normalizeMapDraft(draft)
	assert.ok(normalized)

	const walls = new Set(normalized.wallCells ?? [])
	for (const spawner of normalized.spawners) {
		assert.equal(walls.has(cellKey(spawner.x, spawner.y)), false)
	}
})
