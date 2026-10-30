import assert from 'node:assert/strict'
import test from 'node:test'
import {
	BURN_DURATION,
	CRIT_MULTIPLIER,
	ENEMY_GROUP_SPAWN_INTERVAL,
	ENEMY_SPAWN_INTERVAL_MIN,
	ENEMY_TYPES,
	INITIAL_GOLD,
	MAX_TOWER_LEVEL,
	TOWER_TYPES,
	WAVE_COMPLETION_BASE_REWARD,
	WAVE_REWARD_GROWTH,
	XP_WAVE_GROWTH,
} from '../config/game.config.ts'
import {
	addExperience,
	canBuildTower,
	enemyGroupSize,
	enemySpawnDelay,
	enemySpawnInterval,
	enemyStats,
	enemyTypeForSpawn,
	towerStats,
	towerUpgradeCost,
	waveCompletionReward,
	waveEnemyCount,
	xpForKill,
	xpToNextLevel,
} from './game-rules.ts'

test('allows building on an empty board cell when resources are sufficient', () => {
	assert.deepEqual(canBuildTower({ position: { x: 2, y: 2 }, pathCells: new Set(), waterCells: new Set(), forestCells: new Set(), towerCells: new Set(), gold: INITIAL_GOLD, towerType: 'ice' }), { allowed: true, reason: null })
})

test('prevents invalid building placements', () => {
	assert.equal(canBuildTower({ position: { x: -1, y: 0 }, pathCells: new Set(), waterCells: new Set(), forestCells: new Set(), towerCells: new Set(), gold: 999, towerType: 'ice' }).reason, 'outside')
	assert.equal(canBuildTower({ position: { x: 2, y: 2 }, pathCells: new Set(['2,2']), waterCells: new Set(), forestCells: new Set(), towerCells: new Set(), gold: 999, towerType: 'ice' }).reason, 'path')
	assert.equal(canBuildTower({ position: { x: 2, y: 2 }, pathCells: new Set(), waterCells: new Set(['2,2']), forestCells: new Set(), towerCells: new Set(), gold: 999, towerType: 'ice' }).reason, 'water')
	assert.equal(canBuildTower({ position: { x: 2, y: 2 }, pathCells: new Set(), waterCells: new Set(), forestCells: new Set(['2,2']), towerCells: new Set(), gold: 999, towerType: 'ice' }).reason, 'forest')
	assert.equal(canBuildTower({ position: { x: 2, y: 2 }, pathCells: new Set(), waterCells: new Set(), forestCells: new Set(), towerCells: new Set(['2,2']), gold: 999, towerType: 'ice' }).reason, 'occupied')
	assert.equal(canBuildTower({ position: { x: 2, y: 2 }, pathCells: new Set(), waterCells: new Set(), forestCells: new Set(), towerCells: new Set(), gold: TOWER_TYPES.ice.cost - 1, towerType: 'ice' }).reason, 'gold')
})

test('scales wave composition predictably', () => {
	assert.equal(waveEnemyCount(1), 10)
	assert.deepEqual(
		[1, 2, 3, 5, 10, 20].map(waveEnemyCount),
		[10, 12, 14, 18, 28, 48],
	)
	assert.equal(enemyTypeForSpawn(1, 0), 'scout')
	assert.equal(enemyTypeForSpawn(2, 1), 'brute')
	assert.equal(enemyTypeForSpawn(3, 2), 'sprinter')
	assert.equal(enemyTypeForSpawn(5, waveEnemyCount(5) - 1), 'boss')
	// Награды берутся из настраиваемого баланса, поэтому сверяем их
	// с формулой, а не с буквальными числами.
	assert.deepEqual(enemyStats(3, 2), {
		type: 'sprinter',
		hp: 52,
		speed: 124,
		reward: Math.round(ENEMY_TYPES.sprinter.reward * (1 + 2 * WAVE_REWARD_GROWTH)),
		xp: Math.round(ENEMY_TYPES.sprinter.xp * (1 + 2 * XP_WAVE_GROWTH)),
		radius: 8,
		color: 0xf59e57,
	})
})

test('sends enemies in growing groups', () => {
	assert.deepEqual([1, 5, 9, 13, 100].map(enemyGroupSize), [3, 4, 5, 6, 6])

	// Внутри группы враги появляются почти одновременно,
	// а перед новой группой выдерживается заметная пауза.
	assert.equal(enemySpawnDelay(1, 0), enemySpawnInterval(1))
	assert.equal(enemySpawnDelay(1, 1), ENEMY_GROUP_SPAWN_INTERVAL)
	assert.equal(enemySpawnDelay(1, 2), ENEMY_GROUP_SPAWN_INTERVAL)
	assert.equal(enemySpawnDelay(1, 3), enemySpawnInterval(1))
})

test('spawns enemies faster each wave, but not faster than the limit', () => {
	assert.ok(enemySpawnInterval(2) < enemySpawnInterval(1))
	assert.ok(enemySpawnInterval(10) < enemySpawnInterval(2))
	assert.equal(enemySpawnInterval(100), ENEMY_SPAWN_INTERVAL_MIN)
})

test('pays a bigger bonus for later waves', () => {
	assert.equal(waveCompletionReward(1), WAVE_COMPLETION_BASE_REWARD)
	assert.ok(waveCompletionReward(10) > waveCompletionReward(1))
	assert.equal(
		waveCompletionReward(10) - waveCompletionReward(9),
		waveCompletionReward(2) - waveCompletionReward(1),
	)
})

test('increases experience from kills with every wave', () => {
	assert.equal(xpForKill('scout', 1), ENEMY_TYPES.scout.xp)
	assert.ok(xpForKill('scout', 5) > xpForKill('scout', 1))
	assert.ok(xpForKill('boss', 10) > xpForKill('boss', 5))
})

test('levels up and queues an upgrade for each filled bar', () => {
	const first = addExperience({ level: 1, xp: 0, pendingUpgrades: 0 }, xpToNextLevel(1))
	assert.deepEqual(first, { level: 2, xp: 0, pendingUpgrades: 1 })

	// Один крупный пакет опыта может дать сразу несколько уровней.
	const many = addExperience({ level: 1, xp: 0, pendingUpgrades: 0 }, 1000)
	assert.equal(many.level, 4)
	assert.equal(many.pendingUpgrades, 3)
	assert.ok(many.xp < xpToNextLevel(many.level))
})

test('caps the queued upgrades and preserves progress', () => {
	const capped = addExperience({ level: 1, xp: 0, pendingUpgrades: 5 }, 5000)
	assert.equal(capped.pendingUpgrades, 5)
	assert.equal(capped.level, 1)
	assert.equal(capped.xp, xpToNextLevel(1) - 1)
})

test('makes each wave noticeably stronger than the previous one', () => {
	const firstWave = enemyStats(1, 0)
	const tenthWave = enemyStats(10, 0)
	assert.ok(tenthWave.hp >= firstWave.hp * 2.5)
	assert.ok(tenthWave.speed > firstWave.speed)
	assert.ok(tenthWave.reward > firstWave.reward)
})

test('improves tower stats with each level', () => {
	assert.deepEqual(towerStats('ice', 1), {
		damage: 10,
		range: 140,
		attackSpeed: 600,
		color: TOWER_TYPES.ice.color,
		crit: 0,
		critPower: CRIT_MULTIPLIER,
		burn: 0,
		burnDuration: BURN_DURATION,
		chain: 0,
		execute: 0,
	})

	const levelThree = towerStats('ice', 3)
	assert.equal(levelThree.damage, 16)
	assert.equal(levelThree.range, 162)
	assert.equal(levelThree.attackSpeed, 486)

	// Уровень выше максимума не должен давать бесконечный рост.
	assert.deepEqual(towerStats('ice', MAX_TOWER_LEVEL + 5), towerStats('ice', MAX_TOWER_LEVEL))
})

test('charges more for each next upgrade and stops at max level', () => {
	assert.equal(towerUpgradeCost('ice', 1), 48)
	assert.equal(towerUpgradeCost('ice', 4), 192)
	assert.ok(towerUpgradeCost('ice', 3)! > towerUpgradeCost('ice', 2)!)
	assert.equal(towerUpgradeCost('ice', MAX_TOWER_LEVEL), null)
})
