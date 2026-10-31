import assert from 'node:assert/strict'
import test from 'node:test'
import {
	BURN_DURATION,
	CELL_SIZE,
	COLS,
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
	type TowerType,
} from '../config/game.config.ts'
import {
	addExperience,
	canBuildTower,
	cellKey,
	enemyGroupSize,
	enemySpawnDelay,
	enemySpawnInterval,
	enemyStats,
	enemyTypeForSpawn,
	spawnerBuildCells,
	SPAWNER_BUILD_CLEARANCE,
	summarizeTowerSelection,
	towerFootprintCells,
	towerSellValue,
	towerSpriteSize,
	towerStats,
	towerUpgradeCost,
	waveCompletionReward,
	waveEnemyCount,
	xpForKill,
	xpToNextLevel,
} from './game-rules.ts'

test('allows building on an empty board cell when resources are sufficient', () => {
	assert.deepEqual(canBuildTower({ position: { x: 2, y: 2 }, pathCells: new Set(), waterCells: new Set(), forestCells: new Set(), spawnerCells: new Set(), castleCells: new Set(), towerCells: new Set(), gold: INITIAL_GOLD, towerType: 'ice' }), { allowed: true, reason: null })
})

test('prevents invalid building placements', () => {
	assert.equal(canBuildTower({ position: { x: -1, y: 0 }, pathCells: new Set(), waterCells: new Set(), forestCells: new Set(), spawnerCells: new Set(), castleCells: new Set(), towerCells: new Set(), gold: 999, towerType: 'ice' }).reason, 'outside')
	assert.equal(canBuildTower({ position: { x: 2, y: 2 }, pathCells: new Set(['2,2']), waterCells: new Set(), forestCells: new Set(), spawnerCells: new Set(), castleCells: new Set(), towerCells: new Set(), gold: 999, towerType: 'ice' }).reason, 'path')
	assert.equal(canBuildTower({ position: { x: 2, y: 2 }, pathCells: new Set(), waterCells: new Set(['2,2']), forestCells: new Set(), spawnerCells: new Set(), castleCells: new Set(), towerCells: new Set(), gold: 999, towerType: 'ice' }).reason, 'water')
	assert.equal(canBuildTower({ position: { x: 2, y: 2 }, pathCells: new Set(), waterCells: new Set(), forestCells: new Set(['2,2']), spawnerCells: new Set(), castleCells: new Set(), towerCells: new Set(), gold: 999, towerType: 'ice' }).reason, 'forest')
	assert.equal(canBuildTower({ position: { x: 2, y: 2 }, pathCells: new Set(), waterCells: new Set(), forestCells: new Set(), spawnerCells: new Set(['2,2']), castleCells: new Set(), towerCells: new Set(), gold: 999, towerType: 'ice' }).reason, 'spawner')
	assert.equal(canBuildTower({ position: { x: 2, y: 2 }, pathCells: new Set(), waterCells: new Set(), forestCells: new Set(), spawnerCells: new Set(), castleCells: new Set(), towerCells: new Set(['2,2']), gold: 999, towerType: 'ice' }).reason, 'occupied')
	assert.equal(canBuildTower({ position: { x: 2, y: 2 }, pathCells: new Set(), waterCells: new Set(), forestCells: new Set(), spawnerCells: new Set(), castleCells: new Set(), towerCells: new Set(), gold: TOWER_TYPES.ice.cost - 1, towerType: 'ice' }).reason, 'gold')
})

test('tower occupies a 2×2 platform', () => {
	assert.deepEqual(towerFootprintCells({ x: 4, y: 3 }), ['4,3', '5,3', '4,4', '5,4'])

	const build = (x: number, y: number, towerCells = new Set<string>()) => canBuildTower({
		position: { x, y },
		pathCells: new Set(),
		waterCells: new Set(),
		forestCells: new Set(),
		spawnerCells: new Set(),
		castleCells: new Set(),
		towerCells,
		gold: 999,
		towerType: 'ice',
	}).reason

	// Занята любая клетка площадки — строить нельзя.
	assert.equal(build(4, 3), null)
	assert.equal(build(4, 3, new Set(['5,4'])), 'occupied')
	// Последний ряд: якорь ещё на поле, но площадка выходит за край.
	assert.equal(build(COLS - 1, 5), 'outside')
})

test('tower sprite grows with its level', () => {
	const area = (level: number) => towerSpriteSize(level) ** 2 / CELL_SIZE ** 2

	// Первый уровень — клетка плюс 20%, максимальный — 90% четырёх клеток.
	assert.equal(Math.round(area(1) * 1000) / 1000, 1.2)
	assert.equal(Math.round(area(MAX_TOWER_LEVEL) * 1000) / 1000, 3.6)
	assert.equal(towerSpriteSize(MAX_TOWER_LEVEL) < CELL_SIZE * 2, true)

	// Каждый следующий уровень больше предыдущего.
	for (let level = 2; level <= MAX_TOWER_LEVEL; level++) {
		assert.equal(towerSpriteSize(level) > towerSpriteSize(level - 1), true)
	}

	// Уровень вне диапазона не делает спрайт меньше первого.
	assert.equal(towerSpriteSize(0), towerSpriteSize(1))
	assert.equal(towerSpriteSize(99), towerSpriteSize(MAX_TOWER_LEVEL))
})

test('blocks building in a four-cell square around every barracks', () => {
	const blocked = spawnerBuildCells([{ x: 20, y: 20 }, { x: 60, y: 40 }])
	const side = SPAWNER_BUILD_CLEARANCE * 2 + 1

	assert.equal(blocked.size, side * side * 2)
	assert.equal(blocked.has(cellKey({ x: 20, y: 20 })), true)
	assert.equal(blocked.has(cellKey({ x: 20 + SPAWNER_BUILD_CLEARANCE, y: 20 + SPAWNER_BUILD_CLEARANCE })), true)
	assert.equal(blocked.has(cellKey({ x: 20, y: 20 + SPAWNER_BUILD_CLEARANCE + 1 })), false)
	assert.equal(blocked.has(cellKey({ x: 60 - SPAWNER_BUILD_CLEARANCE, y: 40 })), true)

	const build = (x: number, y: number) => canBuildTower({
		position: { x, y },
		pathCells: new Set(),
		waterCells: new Set(),
		forestCells: new Set(),
		spawnerCells: blocked,
		castleCells: new Set(),
		towerCells: new Set(),
		gold: 999,
		towerType: 'ice',
	}).reason

	assert.equal(build(20 + SPAWNER_BUILD_CLEARANCE, 20), 'spawner')
	assert.equal(build(20 + SPAWNER_BUILD_CLEARANCE + 1, 20), null)
})

test('keeps the castle zone clear and towers a cell apart', () => {
	const castleCells = new Set(['30,30', '31,30', '30,31', '31,31'])
	const towerCells = new Set(['10,10', '11,10', '10,11', '11,11'])

	const build = (x: number, y: number) => canBuildTower({
		position: { x, y },
		pathCells: new Set(),
		waterCells: new Set(),
		forestCells: new Set(),
		spawnerCells: new Set(),
		castleCells,
		towerCells,
		gold: 999,
		towerType: 'ice',
	}).reason

	// Клетка замка блокирует постройку раньше, чем соседняя клетка поля.
	assert.equal(build(30, 30), 'castle')
	assert.equal(build(29, 30), 'castle')

	// Внахлёст и вплотную к соседней башне ставить нельзя.
	assert.equal(build(11, 11), 'occupied')
	assert.equal(build(12, 10), 'crowded')
	assert.equal(build(8, 10), 'crowded')

	// Одна свободная клетка между площадками — уже можно.
	assert.equal(build(13, 10), null)
	assert.equal(build(7, 7), null)
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

// Башни для сводки выделения: объекты Phaser тестам не нужны.
function selectableTower(
	type: TowerType,
	level: number,
	autoUpgrade = false,
): SelectableTowerFixture {
	return {
		type,
		level,
		invested: TOWER_TYPES[type].cost + (level - 1) * 100,
		autoUpgrade,
	}
}

type SelectableTowerFixture = Parameters<typeof summarizeTowerSelection>[0][number]

test('describes a single selected tower with its own stats', () => {
	const only = summarizeTowerSelection([selectableTower('ice', 3)], 0)
	assert.ok(only)

	assert.equal(only.count, 1)
	assert.equal(only.type, 'ice')
	assert.equal(only.levelMin, 3)
	assert.equal(only.levelMax, 3)
	assert.equal(only.upgradeCost, towerUpgradeCost('ice', 3))
	assert.equal(only.sellValue, towerSellValue(TOWER_TYPES.ice.cost + 2 * 100))
	assert.deepEqual(only.stats?.damage, towerStats('ice', 3).damage)
	assert.equal(only.affordable, 0)
})

test('summarises a mixed group without per-tower stats', () => {
	const towers = [
		selectableTower('ice', 1),
		selectableTower('ice', 2),
		selectableTower('fire', 1, true),
	]
	const group = summarizeTowerSelection(towers, 10_000)
	assert.ok(group)

	assert.equal(group.count, 3)
	assert.equal(group.type, null)
	assert.equal(group.stats, null)
	assert.deepEqual(
		group.groups.map((entry) => [entry.type, entry.count, entry.levelMin, entry.levelMax]),
		[['ice', 2, 1, 2], ['fire', 1, 1, 1]],
	)
	assert.equal(group.upgradeable, 3)
	assert.equal(
		group.upgradeCost,
		towerUpgradeCost('ice', 1)! + towerUpgradeCost('ice', 2)! + towerUpgradeCost('fire', 1)!,
	)
	assert.equal(
		group.sellValue,
		towers.reduce((sum, tower) => sum + towerSellValue(tower.invested), 0),
	)
	// Автоулучшение включено не у всех — кнопка показывает «выключено».
	assert.equal(group.autoUpgrade, false)
})

test('counts batch upgrades in selection order and skips what gold cannot buy', () => {
	const cheapFirst = summarizeTowerSelection(
		[selectableTower('ice', 1), selectableTower('ice', 4)],
		towerUpgradeCost('ice', 1)!,
	)
	assert.ok(cheapFirst)
	assert.equal(cheapFirst.upgradeable, 2)
	assert.equal(cheapFirst.affordable, 1)

	// Дороговатая башня не блокирует следующую: деньги уходят на ту, что дешевле.
	const expensiveFirst = summarizeTowerSelection(
		[selectableTower('ice', 4), selectableTower('ice', 1)],
		towerUpgradeCost('ice', 1)!,
	)
	assert.ok(expensiveFirst)
	assert.equal(expensiveFirst.affordable, 1)

	assert.equal(summarizeTowerSelection([], 1000), null)

	const maxed = summarizeTowerSelection(
		[selectableTower('ice', MAX_TOWER_LEVEL, true)],
		1000,
	)
	assert.ok(maxed)
	assert.equal(maxed.upgradeable, 0)
	assert.equal(maxed.upgradeCost, 0)
	assert.equal(maxed.autoUpgrade, true)
})
