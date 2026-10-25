import {
	CELL_SIZE,
	COLS,
	ENEMY_TYPES,
	INITIAL_GOLD,
	INITIAL_LIVES,
	MAX_TOWER_LEVEL,
	ROWS,
	TOWER_ATTACK_SPEED_GROWTH,
	TOWER_DAMAGE_GROWTH,
	TOWER_RANGE_GROWTH,
	TOWER_TYPES,
	TOWER_UPGRADE_COST_FACTOR,
	WAVE_HP_GROWTH,
	WAVE_SPEED_GROWTH,
	WAVE_SPEED_GROWTH_CAP,
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
	return 5 + wave * 2
}

export function enemyTypeForSpawn(wave: number, spawnIndex: number): EnemyType {
	if (wave > 0 && wave % 5 === 0 && spawnIndex === waveEnemyCount(wave) - 1) return 'boss'
	if (wave >= 3 && spawnIndex % 4 === 2) return 'sprinter'
	if (wave >= 2 && spawnIndex % 3 === 1) return 'brute'
	return 'scout'
}

export function enemyStats(wave: number, spawnIndex: number) {
	const type = enemyTypeForSpawn(wave, spawnIndex)
	const base = ENEMY_TYPES[type]
	const level = Math.max(0, wave - 1)
	return {
		type,
		hp: Math.round(base.baseHp * (1 + level * WAVE_HP_GROWTH)),
		speed: Math.round(base.baseSpeed * (1 + Math.min(level, WAVE_SPEED_GROWTH_CAP) * WAVE_SPEED_GROWTH)),
		reward: base.reward + Math.floor(level / 3),
		radius: base.radius,
		color: base.color,
	}
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

export const initialResources = { gold: INITIAL_GOLD, lives: INITIAL_LIVES }
