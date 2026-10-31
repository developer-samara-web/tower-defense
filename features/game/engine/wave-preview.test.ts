import assert from 'node:assert/strict'
import test from 'node:test'

import { ENEMY_TYPES, WAVE_HP_GROWTH } from '../config/game.config.ts'
import { waveEnemyCount } from '../domain/game-rules.ts'
import { waveSpawnTotal } from './map/custom-waves.ts'
import { wavePreview } from './wave-preview.ts'
import type { EnemyType } from '../config/game.config.ts'
import type { MapDraft } from './map/custom-map.ts'

function troop(type: EnemyType, count: number) {
	return { type, count, speed: 70, strength: 2, health: 100 }
}

// Для свода волны нужны только казармы и настройки волн.
function makeDraft(): MapDraft {
	return {
		version: 1,
		cols: 60,
		rows: 60,
		castle: null,
		waterCells: [],
		forestCells: [],
		roadCells: [],
		waves: { useCommon: true, waves: [] },
		spawners: [
			{ id: 'a', x: 10, y: 10, troops: [troop('scout', 4), troop('brute', 2)] },
			{ id: 'b', x: 20, y: 20, troops: [troop('sprinter', 3)] },
		],
	}
}

test('seed map preview matches the common wave rules', () => {
	const first = wavePreview(null, 1)

	assert.equal(first.custom, false)
	assert.equal(first.total, waveEnemyCount(1))
	assert.equal(
		first.rows.reduce((sum, row) => sum + row.count, 0),
		first.total,
	)

	// Первая волна идёт по базовым характеристикам.
	const scout = first.rows.find((row) => row.type === 'scout')
	assert.equal(scout?.hp, ENEMY_TYPES.scout.baseHp)
	assert.equal(scout?.speed, ENEMY_TYPES.scout.baseSpeed)
	assert.equal(scout?.damage, 1)

	// На пятой волне появляется босс, а здоровье растёт по общей формуле.
	const fifth = wavePreview(null, 5)
	assert.equal(fifth.rows.some((row) => row.type === 'boss'), true)
	assert.equal(
		fifth.rows.find((row) => row.type === 'scout')?.hp,
		Math.round(ENEMY_TYPES.scout.baseHp * (1 + 4 * WAVE_HP_GROWTH)),
	)
})

test('custom map preview counts the same units the barracks will send', () => {
	const draft = makeDraft()
	const preview = wavePreview(draft, 3)

	assert.equal(preview.custom, true)
	assert.equal(preview.total, waveSpawnTotal(draft, 3))
	assert.equal(preview.groupSize, 0)

	// Круговая очередь казармы даёт по три разведчика и громилы.
	assert.equal(preview.rows.find((row) => row.type === 'scout')?.count, 3)
	assert.equal(preview.rows.find((row) => row.type === 'brute')?.count, 3)
	assert.equal(preview.rows.find((row) => row.type === 'sprinter')?.count, 3)

	// Пользовательская карта берёт здоровье казармы и рост общей волны.
	assert.equal(
		preview.rows.find((row) => row.type === 'scout')?.hp,
		Math.round(100 * (1 + 2 * WAVE_HP_GROWTH)),
	)
	assert.equal(preview.rows.find((row) => row.type === 'scout')?.damage, 2)
})
