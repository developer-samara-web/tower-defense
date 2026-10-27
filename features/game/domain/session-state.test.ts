import assert from 'node:assert/strict'
import test from 'node:test'
import { MAX_TOWER_LEVEL, TOWER_TYPES } from '../config/game.config.ts'
import { buildSnapshot, createGameState } from './game-state.ts'
import {
	hasSessionProgress,
	readSessionEnemies,
	readSessionEnemy,
	readSessionTower,
	restoreBuffs,
	restoreStats,
	toSessionGameState,
	type SessionEnemy,
} from './session-state.ts'

const validEnemy: SessionEnemy = {
	type: 'brute',
	x: 120.5,
	y: 64,
	hp: 30,
	maxHp: 90,
	speed: 40,
	reward: 12,
	pathIndex: 2,
	routeIndex: 1,
	slowTimer: 500,
}

test('detects whether a game is worth saving', () => {
	assert.equal(hasSessionProgress({}), false)
	assert.equal(hasSessionProgress({ wave: 0, towers: [] }), false)
	assert.equal(hasSessionProgress({ wave: 2 }), true)
	assert.equal(hasSessionProgress({ wave: 0, towers: [{ id: 'a' }] }), true)
})

test('serializes only the fields needed to resume', () => {
	const base = buildSnapshot(createGameState())
	const snapshot = {
		...base,
		wave: 3,
		gold: 250,
		waveActive: true,
		towers: [{ id: 't1', x: 64, y: 96, type: 'fire' as const, level: 2, invested: 200 }],
		enemyStates: [validEnemy],
	}

	const session = toSessionGameState(snapshot)

	assert.equal(session.wave, 3)
	assert.equal(session.gold, 250)
	assert.equal(session.waveActive, true)
	assert.deepEqual(session.towers, [{ id: 't1', type: 'fire', level: 2, invested: 200 }])
	assert.deepEqual(session.enemies, [validEnemy])
	assert.equal('x' in (session.towers[0] as object), false)
})

test('keeps valid enemies and clamps their health to the maximum', () => {
	const enemy = readSessionEnemy({ ...validEnemy, hp: 500 })

	assert.ok(enemy)
	assert.equal(enemy.hp, validEnemy.maxHp)
	assert.equal(enemy.slowTimer, validEnemy.slowTimer)
})

test('rejects enemies with unknown type or broken numbers', () => {
	assert.equal(readSessionEnemy({ ...validEnemy, type: 'dragon' }), null)
	assert.equal(readSessionEnemy({ ...validEnemy, hp: -1 }), null)
	assert.equal(readSessionEnemy({ ...validEnemy, x: Number.NaN }), null)
	assert.equal(readSessionEnemy({ ...validEnemy, pathIndex: -2 }), null)
	assert.equal(readSessionEnemy(null), null)
})

test('filters broken entries out of the saved enemy list', () => {
	const enemies = readSessionEnemies([
		validEnemy,
		null,
		{ ...validEnemy, type: 'unknown' },
		{ ...validEnemy, routeIndex: '3' },
	])

	assert.deepEqual(enemies, [validEnemy])
	assert.deepEqual(readSessionEnemies({}), [])
})

test('clamps restored towers to valid levels and falls back on invested gold', () => {
	assert.deepEqual(readSessionTower({ id: 't1', type: 'ice', level: 99, invested: 40 }), {
		id: 't1',
		type: 'ice',
		level: MAX_TOWER_LEVEL,
		invested: 40,
	})

	assert.deepEqual(readSessionTower({ id: 't2', type: 'fire', level: 0 }), {
		id: 't2',
		type: 'fire',
		level: 1,
		invested: TOWER_TYPES.fire.cost,
	})

	assert.equal(readSessionTower({ id: 't3', type: 'lava', level: 1 }), null)
	assert.equal(readSessionTower({ type: 'ice', level: 1 }), null)
})

test('restores buffs with safe defaults', () => {
	assert.deepEqual(restoreBuffs(undefined), {
		ice: { damage: 1, range: 1, speed: 1 },
		fire: { damage: 1, range: 1, speed: 1 },
		earth: { damage: 1, range: 1, speed: 1 },
	})

	assert.deepEqual(
		restoreBuffs({ ice: { damage: 1.5, range: -2, speed: 0 } }),
		{
			ice: { damage: 1.5, range: 1, speed: 1 },
			fire: { damage: 1, range: 1, speed: 1 },
			earth: { damage: 1, range: 1, speed: 1 },
		},
	)
})

test('restores stats without negative values', () => {
	assert.deepEqual(restoreStats(undefined), {
		monstersKilled: 0,
		buildingsBuilt: 0,
		moneySpent: 0,
		damageDealt: 0,
	})

	assert.deepEqual(
		restoreStats({ monstersKilled: 5, buildingsBuilt: -1, moneySpent: 120, damageDealt: 'many' }),
		{
			monstersKilled: 5,
			buildingsBuilt: 0,
			moneySpent: 120,
			damageDealt: 0,
		},
	)
})
