import assert from 'node:assert/strict'
import test from 'node:test'

import { WAVE_HP_GROWTH } from '../../config/game.config.ts'
import { waveModifiers, waveSpawnTotal, waveSpawnUnits } from './custom-waves.ts'
import type { EnemyType } from '../../config/game.config.ts'
import type { GameMap, MapWaves } from './game-map.ts'

function troop(type: EnemyType, count: number) {
	return { type, count, speed: 70, strength: 1, health: 100 }
}

function makeMap(waves?: MapWaves): GameMap {
	return {
		roads: [],
		roadPoints: [],
		waterCells: [],
		forestCells: [],
		castle: { x: 50, y: 50, hp: 100 },
		spawners: [
			{ id: 'a', x: 10, y: 10, troops: [troop('scout', 4), troop('brute', 2)] },
			{ id: 'b', x: 20, y: 20, troops: [troop('sprinter', 3)] },
		],
		waves,
	}
}

test('common plan scales monsters with the wave number', () => {
	assert.deepEqual(waveModifiers(undefined, 1), { health: 1, speed: 1, count: 1 })

	const third = waveModifiers(undefined, 3)
	assert.equal(third.health, 1 + 2 * WAVE_HP_GROWTH)
	assert.equal(third.speed > 1, true)
	assert.equal(third.count, 1)
})

test('custom plan uses wave percentages and repeats the last wave', () => {
	const plan: MapWaves = {
		useCommon: false,
		waves: [
			{ id: 'w1', health: 50, speed: 120, count: 100 },
			{ id: 'w2', health: 200, speed: 100, count: 150 },
		],
	}

	assert.deepEqual(waveModifiers(plan, 1), { health: 0.5, speed: 1.2, count: 1 })
	assert.deepEqual(waveModifiers(plan, 2), { health: 2, speed: 1, count: 1.5 })
	assert.deepEqual(waveModifiers(plan, 5), { health: 2, speed: 1, count: 1.5 })

	// Отмеченные общие параметры игнорируют список.
	assert.deepEqual(
		waveModifiers({ ...plan, useCommon: true }, 1),
		{ health: 1, speed: 1, count: 1 },
	)
})

test('barracks growth scales on top of the map plan', () => {
	const growth = { health: 20, speed: 5, count: 50 }

	// Первая волна — базовая: рост прибавляется начиная со второй.
	assert.deepEqual(waveModifiers(undefined, 1, growth), {
		health: 1,
		speed: 1,
		count: 1,
	})

	const third = waveModifiers(undefined, 3, growth)
	assert.equal(third.health, (1 + 2 * WAVE_HP_GROWTH) * (1 + 0.2 * 2))
	assert.equal(third.count, 1 + 0.5 * 2)

	// Личный рост касается только своей казармы.
	const map = makeMap()
	const scaled: GameMap = {
		...map,
		spawners: [
			{ ...map.spawners[0]!, growth: { health: 0, speed: 0, count: 100 } },
			map.spawners[1]!,
		],
	}
	assert.equal(waveSpawnTotal(scaled, 1), 9)
	assert.equal(waveSpawnTotal(scaled, 2), 15)
})

test('spawn plan interleaves barracks and monster types', () => {
	const map = makeMap()

	assert.equal(waveSpawnTotal(map, 1), 9)
	assert.deepEqual(
		waveSpawnUnits(map, 1).map((unit) => `${unit.spawnerIndex}:${unit.troop.type}`),
		[
			'0:scout',
			'1:sprinter',
			'0:brute',
			'1:sprinter',
			'0:scout',
			'1:sprinter',
			'0:brute',
			'0:scout',
			'0:brute',
		],
	)
})

test('count percent scales the wave size', () => {
	const map = makeMap({
		useCommon: false,
		waves: [{ id: 'w1', health: 100, speed: 100, count: 50 }],
	})

	// 4 → 2, 2 → 1, 3 → 2 (половина округляется вверх).
	assert.equal(waveSpawnTotal(map, 1), 5)
	assert.equal(waveSpawnTotal(map, 2), 5)
})
