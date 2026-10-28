import assert from 'node:assert/strict'
import test from 'node:test'
import { BURN_DURATION, CRIT_MULTIPLIER, MAX_TOWER_LEVEL, TOWER_TYPES } from '../config/game.config.ts'
import { buildSnapshot, createGameState } from './game-state.ts'
import {
	hasSessionProgress,
	readSessionEnemies,
	readSessionEnemy,
	readSessionTower,
	restoreBuffs,
	restoreProgress,
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
	xp: 18,
	pathIndex: 2,
	routeIndex: 1,
	slowTimer: 500,
	burnDamage: 0,
	burnTimer: 0,
}

const defaultBuff = {
	damage: 1,
	range: 1,
	speed: 1,
	crit: 0,
	critPower: CRIT_MULTIPLIER,
	burn: 0,
	burnDuration: BURN_DURATION,
	chain: 0,
	execute: 0,
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
		level: 4,
		xp: 120,
		pendingUpgrades: 1,
		towers: [{ id: 't1', x: 64, y: 96, type: 'fire' as const, level: 2, invested: 200 }],
		enemyStates: [validEnemy],
	}

	const session = toSessionGameState(snapshot)

	assert.equal(session.wave, 3)
	assert.equal(session.gold, 250)
	assert.equal(session.waveActive, true)
	assert.equal(session.level, 4)
	assert.equal(session.xp, 120)
	assert.equal(session.pendingUpgrades, 1)
	assert.deepEqual(session.towers, [{ id: 't1', type: 'fire', level: 2, invested: 200 }])
	assert.deepEqual(session.enemies, [validEnemy])
	assert.equal('x' in (session.towers[0] as object), false)
})

test('keeps valid enemies and clamps their health to the maximum', () => {
	const enemy = readSessionEnemy({ ...validEnemy, hp: 500 })

	assert.ok(enemy)
	assert.equal(enemy.hp, validEnemy.maxHp)
	assert.equal(enemy.slowTimer, validEnemy.slowTimer)
	assert.equal(enemy.xp, validEnemy.xp)
})

test('gives old enemies without xp a safe default', () => {
	const enemy = readSessionEnemy({ ...validEnemy, xp: undefined })

	assert.ok(enemy)
	assert.ok(enemy.xp > 0)
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
		ice: { ...defaultBuff },
		fire: { ...defaultBuff },
		earth: { ...defaultBuff },
	})

	assert.deepEqual(
		restoreBuffs({ ice: { damage: 1.5, range: -2, speed: 0, crit: 2, chain: 9 } }),
		{
			ice: { ...defaultBuff, damage: 1.5, crit: 0.75, chain: 4 },
			fire: { ...defaultBuff },
			earth: { ...defaultBuff },
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

test('restores level progress safely', () => {
	assert.deepEqual(restoreProgress(undefined), {
		level: 1,
		xp: 0,
		pendingUpgrades: 0,
	})

	assert.deepEqual(
		restoreProgress({ level: 7, xp: 210, pendingUpgrades: 2 }),
		{ level: 7, xp: 210, pendingUpgrades: 2 },
	)

	assert.deepEqual(
		restoreProgress({ level: 0, xp: -40, pendingUpgrades: 99 }),
		{ level: 1, xp: 0, pendingUpgrades: 5 },
	)
})
