import {
	CELL_SIZE,
	COLS,
	ENEMY_COUNT_BASE,
	ENEMY_COUNT_PER_WAVE,
	ENEMY_SPAWN_INTERVAL,
	ENEMY_SPAWN_INTERVAL_MIN,
	ENEMY_SPAWN_INTERVAL_STEP,
	ENEMY_TYPES,
	INITIAL_GOLD,
	INITIAL_LIVES,
	LEVEL_XP_BASE,
	LEVEL_XP_SQUARE,
	LEVEL_XP_STEP,
	MAX_PENDING_UPGRADES,
	MAX_TOWER_LEVEL,
	ROWS,
	TOWER_ATTACK_SPEED_GROWTH,
	TOWER_DAMAGE_GROWTH,
	TOWER_RANGE_GROWTH,
	TOWER_SELL_REFUND,
	TOWER_TYPES,
	TOWER_UPGRADE_COST_FACTOR,
	WAVE_COMPLETION_BASE_REWARD,
	WAVE_COMPLETION_REWARD_PER_WAVE,
	WAVE_HP_GROWTH,
	WAVE_REWARD_GROWTH,
	WAVE_SPEED_GROWTH,
	WAVE_SPEED_GROWTH_CAP,
	XP_WAVE_GROWTH,
	type EnemyType,
	type TowerType,
} from '../config/game.config.ts'

export type BoardPosition = { x: number; y: number }

export function cellKey({ x, y }: BoardPosition) {
	return `${x},${y}`
}

export function isBoardPosition({ x, y }: BoardPosition) {
	return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < COLS && y >= 0 && y < ROWS
}

export function canBuildTower({ position, pathCells, towerCells, gold, towerType }: {
	position: BoardPosition
	pathCells: ReadonlySet<string>
	towerCells: ReadonlySet<string>
	gold: number
	towerType: TowerType
}) {
	const key = cellKey(position)
	if (!isBoardPosition(position)) return { allowed: false, reason: 'outside' as const }
	if (pathCells.has(key)) return { allowed: false, reason: 'path' as const }
	if (towerCells.has(key)) return { allowed: false, reason: 'occupied' as const }
	if (gold < TOWER_TYPES[towerType].cost) return { allowed: false, reason: 'gold' as const }
	return { allowed: true, reason: null }
}

export function waveEnemyCount(wave: number) {
	const safeWave = Math.max(1, Math.trunc(wave))
	return Math.round(ENEMY_COUNT_BASE + (safeWave - 1) * ENEMY_COUNT_PER_WAVE)
}

// Враги появляются чаще с каждой волной, но не чаще нижнего предела.
export function enemySpawnInterval(wave: number) {
	const steps = Math.max(0, Math.trunc(wave) - 1)
	return Math.max(
		ENEMY_SPAWN_INTERVAL_MIN,
		ENEMY_SPAWN_INTERVAL - steps * ENEMY_SPAWN_INTERVAL_STEP,
	)
}

// Бонус за пройденную волну растёт вместе с её номером.
export function waveCompletionReward(wave: number) {
	return WAVE_COMPLETION_BASE_REWARD +
		Math.max(0, Math.trunc(wave) - 1) * WAVE_COMPLETION_REWARD_PER_WAVE
}

export function enemyTypeForSpawn(
	wave: number,
	spawnIndex: number,
	total: number = waveEnemyCount(wave),
): EnemyType {
	if (wave > 0 && wave % 5 === 0 && spawnIndex === total - 1) return 'boss'
	if (wave >= 3 && spawnIndex % 4 === 2) return 'sprinter'
	if (wave >= 2 && spawnIndex % 3 === 1) return 'brute'
	return 'scout'
}

// Опыт за убийство растёт с каждой волной.
export function xpForKill(type: EnemyType, wave: number) {
	const level = Math.max(0, Math.trunc(wave) - 1)
	return Math.round(ENEMY_TYPES[type].xp * (1 + level * XP_WAVE_GROWTH))
}

export function enemyStats(wave: number, spawnIndex: number) {
	const type = enemyTypeForSpawn(wave, spawnIndex)
	const base = ENEMY_TYPES[type]
	const level = Math.max(0, wave - 1)
	return {
		type,
		hp: Math.round(base.baseHp * (1 + level * WAVE_HP_GROWTH)),
		speed: Math.round(
			base.baseSpeed *
				(1 + Math.min(level, WAVE_SPEED_GROWTH_CAP) * WAVE_SPEED_GROWTH),
		),
		reward: Math.round(base.reward * (1 + level * WAVE_REWARD_GROWTH)),
		xp: xpForKill(type, wave),
		radius: base.radius,
		color: base.color,
	}
}

// Сколько опыта нужно, чтобы перейти с уровня level на следующий.
export function xpToNextLevel(level: number) {
	const steps = Math.max(0, Math.trunc(level) - 1)
	return LEVEL_XP_BASE + LEVEL_XP_STEP * steps + LEVEL_XP_SQUARE * steps * steps
}

export type LevelProgress = {
	level: number
	xp: number
	pendingUpgrades: number
}

// Начисляет опыт и повышает уровень, пока хватает опыта.
// Каждый новый уровень добавляет одну карточку улучшения в очередь.
export function addExperience(
	progress: LevelProgress,
	amount: number,
): LevelProgress {
	let { level, xp, pendingUpgrades } = progress
	xp += Math.max(0, Math.round(amount))

	let requirement = xpToNextLevel(level)

	while (xp >= requirement) {
		if (pendingUpgrades >= MAX_PENDING_UPGRADES) {
			// Больше карточек в очередь не ставим, но прогресс не теряем.
			xp = requirement - 1
			break
		}

		xp -= requirement
		level += 1
		pendingUpgrades += 1
		requirement = xpToNextLevel(level)
	}

	return { level, xp, pendingUpgrades }
}

// Характеристики башни с учётом уровня улучшения и бонусов от карточек.
export type TowerBuff = { damage: number; range: number; speed: number }
export type TowerBuffs = Record<TowerType, TowerBuff>

export function createEmptyBuffs(): TowerBuffs {
	return {
		ice: { damage: 1, range: 1, speed: 1 },
		fire: { damage: 1, range: 1, speed: 1 },
		earth: { damage: 1, range: 1, speed: 1 },
	}
}

// Точка находится в пределах игрового поля (нужно для неуязвимости врагов вне поля).
export function isInsideBoardPoint(x: number, y: number) {
	return x >= 0 && x <= COLS * CELL_SIZE && y >= 0 && y <= ROWS * CELL_SIZE
}

export function towerStats(type: TowerType, level: number, buffs?: TowerBuffs) {
	const base = TOWER_TYPES[type]
	const steps = Math.max(0, Math.min(level, MAX_TOWER_LEVEL) - 1)
	const buff = buffs?.[type] ?? { damage: 1, range: 1, speed: 1 }

	return {
		damage: Math.round(base.damage * (1 + steps * TOWER_DAMAGE_GROWTH) * buff.damage),
		range: Math.round(base.range * (1 + steps * TOWER_RANGE_GROWTH) * buff.range),
		attackSpeed: Math.round(
			base.attackSpeed * Math.pow(TOWER_ATTACK_SPEED_GROWTH, steps) * buff.speed,
		),
		color: base.color,
	}
}

// Стоимость следующего улучшения или null, если достигнут максимум.
export function towerUpgradeCost(type: TowerType, level: number) {
	if (level >= MAX_TOWER_LEVEL) return null
	return Math.round(TOWER_TYPES[type].cost * TOWER_UPGRADE_COST_FACTOR * level)
}

// Сколько золота вернётся при продаже башни с учётом всех вложений.
export function towerSellValue(invested: number) {
	return Math.floor(Math.max(0, invested) * TOWER_SELL_REFUND)
}

export const initialResources = { gold: INITIAL_GOLD, lives: INITIAL_LIVES }
