import assert from 'node:assert/strict'
import test from 'node:test'
import { INITIAL_GOLD, MAX_TOWER_LEVEL, TOWER_TYPES } from '../config/game.config.ts'
import { canBuildTower, enemyStats, enemyTypeForSpawn, towerStats, towerUpgradeCost, waveEnemyCount } from './game-rules.ts'

test('allows building on an empty board cell when resources are sufficient', () => {
	assert.deepEqual(canBuildTower({ position: { x: 2, y: 2 }, pathCells: new Set(), towerCells: new Set(), gold: INITIAL_GOLD, towerType: 'ice' }), { allowed: true, reason: null })
})

test('prevents invalid building placements', () => {
	assert.equal(canBuildTower({ position: { x: -1, y: 0 }, pathCells: new Set(), towerCells: new Set(), gold: 999, towerType: 'ice' }).reason, 'outside')
	assert.equal(canBuildTower({ position: { x: 2, y: 2 }, pathCells: new Set(['2,2']), towerCells: new Set(), gold: 999, towerType: 'ice' }).reason, 'path')
	assert.equal(canBuildTower({ position: { x: 2, y: 2 }, pathCells: new Set(), towerCells: new Set(['2,2']), gold: 999, towerType: 'ice' }).reason, 'occupied')
	assert.equal(canBuildTower({ position: { x: 2, y: 2 }, pathCells: new Set(), towerCells: new Set(), gold: TOWER_TYPES.ice.cost - 1, towerType: 'ice' }).reason, 'gold')
})

test('scales wave composition predictably', () => {
	assert.equal(waveEnemyCount(1), 7)
	assert.equal(enemyTypeForSpawn(1, 0), 'scout')
	assert.equal(enemyTypeForSpawn(2, 1), 'brute')
	assert.equal(enemyTypeForSpawn(3, 2), 'sprinter')
	assert.equal(enemyTypeForSpawn(5, waveEnemyCount(5) - 1), 'boss')
	assert.deepEqual(enemyStats(3, 2), { type: 'sprinter', hp: 57, speed: 95, reward: 15, radius: 8, color: 0xf59e57 })
})

test('makes each wave noticeably stronger than the previous one', () => {
	const firstWave = enemyStats(1, 0)
	const tenthWave = enemyStats(10, 0)
	assert.ok(tenthWave.hp >= firstWave.hp * 3)
	assert.ok(tenthWave.speed > firstWave.speed)
})

test('improves tower stats with each level', () => {
	assert.deepEqual(towerStats('ice', 1), { damage: 10, range: 140, attackSpeed: 600, color: TOWER_TYPES.ice.color })

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
