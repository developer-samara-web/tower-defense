import {
	BURN_DURATION,
	CELL_SIZE,
	COLS,
	CRIT_MULTIPLIER,
	ENEMY_COUNT_BASE,
	ENEMY_COUNT_PER_WAVE,
	ENEMY_GROUP_SIZE_BASE,
	ENEMY_GROUP_SIZE_MAX,
	ENEMY_GROUP_SIZE_WAVES_PER_STEP,
	ENEMY_GROUP_SPAWN_INTERVAL,
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

// Башня стоит на площадке 2×2 клетки. Якорем служит верхняя левая клетка:
// курсор при клике всегда попадает внутрь площадки, а id башни остаётся
// ключом реальной клетки, как и в старых сохранениях.
export const TOWER_FOOTPRINT = 2

// Клетки площадки башни по её якорю.
export function towerFootprintCells({ x, y }: BoardPosition) {
	const cells: string[] = []

	for (let dy = 0; dy < TOWER_FOOTPRINT; dy++) {
		for (let dx = 0; dx < TOWER_FOOTPRINT; dx++) {
			cells.push(cellKey({ x: x + dx, y: y + dy }))
		}
	}

	return cells
}

// Клетки площадки по id башни — по ним ищем здание под курсором и освобождаем
// клетки при продаже.
export function towerFootprintKeys(id: string) {
	const [x, y] = id.split(',').map(Number)
	if (x === undefined || y === undefined) return []
	if (!Number.isInteger(x) || !Number.isInteger(y)) return []

	return towerFootprintCells({ x, y })
}

// Площадь башни в клетках: на первом уровне — одна клетка плюс 20%,
// на последнем — 90% площадки 2×2. Между уровнями площадь растёт линейно,
// поэтому сторона спрайта растёт как корень из неё.
const TOWER_AREA_FIRST_LEVEL = 1.2
const TOWER_AREA_LAST_LEVEL = TOWER_FOOTPRINT * TOWER_FOOTPRINT * 0.9

// Сторона спрайта башни в пикселях для её уровня.
export function towerSpriteSize(level: number) {
	const safeLevel = Math.min(Math.max(Math.trunc(level) || 1, 1), MAX_TOWER_LEVEL)
	const step = (TOWER_AREA_LAST_LEVEL - TOWER_AREA_FIRST_LEVEL) / (MAX_TOWER_LEVEL - 1)
	const area = TOWER_AREA_FIRST_LEVEL + step * (safeLevel - 1)

	return CELL_SIZE * Math.sqrt(area)
}

// Казарма — нейтральная зона: башня у самого выхода расстреливает волну
// ещё на старте. Радиус считаем квадратом в клетках, как и просеку вдоль
// дорог, чтобы запрет совпадал с формой остальной застройки поля.
export const SPAWNER_BUILD_CLEARANCE = 4

// Клетки вокруг казарм, где строить башни нельзя.
export function spawnerBuildCells(spawners: readonly BoardPosition[]) {
	const blocked = new Set<string>()

	for (const { x, y } of spawners) {
		for (let dy = -SPAWNER_BUILD_CLEARANCE; dy <= SPAWNER_BUILD_CLEARANCE; dy++) {
			for (let dx = -SPAWNER_BUILD_CLEARANCE; dx <= SPAWNER_BUILD_CLEARANCE; dx++) {
				blocked.add(cellKey({ x: x + dx, y: y + dy }))
			}
		}
	}

	return blocked
}

// Замок — последний рубеж: три свободные клетки вокруг него остаются
// пустыми, чтобы прорвавшиеся монстры не прятались за стеной башен.
export const CASTLE_BUILD_CLEARANCE = 3

// Между башнями оставляют одну свободную клетку: площадки 2×2,
// стоящие вплотную, читаются как одно здание и загораживают обзор.
export const TOWER_BUILD_CLEARANCE = 1

export function canBuildTower({ position, pathCells, waterCells, forestCells, spawnerCells, castleCells, towerCells, gold, towerType }: {
	position: BoardPosition
	pathCells: ReadonlySet<string>
	waterCells: ReadonlySet<string>
	forestCells: ReadonlySet<string>
	spawnerCells: ReadonlySet<string>
	castleCells: ReadonlySet<string>
	towerCells: ReadonlySet<string>
	gold: number
	towerType: TowerType
}) {
	const corner = { x: position.x + TOWER_FOOTPRINT - 1, y: position.y + TOWER_FOOTPRINT - 1 }
	if (!isBoardPosition(position) || !isBoardPosition(corner)) {
		return { allowed: false, reason: 'outside' as const }
	}

	// Площадка 2×2: башня занимает все четыре клетки, поэтому блокирует
	// любая из них — замок, дорога, вода, лес, казарма или соседняя башня.
	for (const key of towerFootprintCells(position)) {
		if (castleCells.has(key)) return { allowed: false, reason: 'castle' as const }
		if (pathCells.has(key)) return { allowed: false, reason: 'path' as const }
		if (waterCells.has(key)) return { allowed: false, reason: 'water' as const }
		if (forestCells.has(key)) return { allowed: false, reason: 'forest' as const }
		if (spawnerCells.has(key)) return { allowed: false, reason: 'spawner' as const }
		if (towerCells.has(key)) return { allowed: false, reason: 'occupied' as const }
	}

	// Отступ от чужих башен: клетка соседней площадки не должна попадать
	// в кольцо вокруг новой площадки. Проверка по занимаемым клеткам,
	// поэтому не требует отдельного множества для отступов.
	for (let fy = 0; fy < TOWER_FOOTPRINT; fy++) {
		for (let fx = 0; fx < TOWER_FOOTPRINT; fx++) {
			for (let dy = -TOWER_BUILD_CLEARANCE; dy <= TOWER_BUILD_CLEARANCE; dy++) {
				for (let dx = -TOWER_BUILD_CLEARANCE; dx <= TOWER_BUILD_CLEARANCE; dx++) {
					if (towerCells.has(cellKey({ x: position.x + fx + dx, y: position.y + fy + dy })))
						return { allowed: false, reason: 'crowded' as const }
				}
			}
		}
	}

	if (gold < TOWER_TYPES[towerType].cost) return { allowed: false, reason: 'gold' as const }
	return { allowed: true, reason: null }
}

export function waveEnemyCount(wave: number) {
	const safeWave = Math.max(1, Math.trunc(wave))
	return Math.round(ENEMY_COUNT_BASE + (safeWave - 1) * ENEMY_COUNT_PER_WAVE)
}

// Пауза перед новой группой врагов: сокращается с ростом волны.
export function enemySpawnInterval(wave: number) {
	const steps = Math.max(0, Math.trunc(wave) - 1)
	return Math.max(
		ENEMY_SPAWN_INTERVAL_MIN,
		ENEMY_SPAWN_INTERVAL - steps * ENEMY_SPAWN_INTERVAL_STEP,
	)
}

// Сколько врагов идёт в одной группе: на поздних волнах группы крупнее.
export function enemyGroupSize(wave: number) {
	const steps = Math.floor(
		Math.max(0, Math.trunc(wave) - 1) / ENEMY_GROUP_SIZE_WAVES_PER_STEP,
	)
	return Math.min(ENEMY_GROUP_SIZE_MAX, ENEMY_GROUP_SIZE_BASE + steps)
}

// Задержка перед следующим врагом: короткая внутри группы
// и длинная перед началом новой группы.
export function enemySpawnDelay(wave: number, spawnedCount: number) {
	const groupSize = enemyGroupSize(wave)
	const startsNewGroup = spawnedCount === 0 || spawnedCount % groupSize === 0
	return startsNewGroup ? enemySpawnInterval(wave) : ENEMY_GROUP_SPAWN_INTERVAL
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
export type TowerBuff = {
	damage: number
	range: number
	speed: number
	// Шанс критического удара (0..1) и его множитель.
	crit: number
	critPower: number
	// Урон в секунду от поджога и длительность горения.
	burn: number
	burnDuration: number
	// Сколько дополнительных целей задевает атака.
	chain: number
	// Доля здоровья, ниже которой враг погибает сразу (0..1).
	execute: number
}
export type TowerBuffs = Record<TowerType, TowerBuff>

function createBuff(): TowerBuff {
	return {
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
}

export function createEmptyBuffs(): TowerBuffs {
	return {
		ice: createBuff(),
		fire: createBuff(),
		earth: createBuff(),
	}
}

// Точка находится в пределах игрового поля (нужно для неуязвимости врагов вне поля).
export function isInsideBoardPoint(x: number, y: number) {
	return x >= 0 && x <= COLS * CELL_SIZE && y >= 0 && y <= ROWS * CELL_SIZE
}

export function towerStats(type: TowerType, level: number, buffs?: TowerBuffs) {
	const base = TOWER_TYPES[type]
	const steps = Math.max(0, Math.min(level, MAX_TOWER_LEVEL) - 1)
	const buff = buffs?.[type] ?? createBuff()

	return {
		damage: Math.round(base.damage * (1 + steps * TOWER_DAMAGE_GROWTH) * buff.damage),
		range: Math.round(base.range * (1 + steps * TOWER_RANGE_GROWTH) * buff.range),
		attackSpeed: Math.round(
			base.attackSpeed * Math.pow(TOWER_ATTACK_SPEED_GROWTH, steps) * buff.speed,
		),
		color: base.color,
		crit: buff.crit,
		critPower: buff.critPower,
		burn: buff.burn,
		burnDuration: buff.burnDuration,
		chain: buff.chain,
		execute: buff.execute,
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

// Одна строка сводки по выделению: башни одного типа идут вместе.
export type TowerSelectionGroup = {
	type: TowerType
	name: string
	count: number
	levelMin: number
	levelMax: number
}

// Сводка по выделенным башням для панели и пакетных действий.
export type TowerSelectionSummary = {
	count: number
	// Тип один на всех — в панели показываем его характеристики.
	type: TowerType | null
	groups: TowerSelectionGroup[]
	levelMin: number
	levelMax: number
	// Цена следующего уровня у всех, кто ещё растёт.
	upgradeCost: number
	upgradeable: number
	// Сколько башен вырастут с текущим золотом: кнопка улучшает по порядку
	// выделения и пропускает те, на которые денег не хватает.
	affordable: number
	// Дороже одной — все башни на максимуме.
	sellValue: number
	// Автоулучшение включено у каждой выбранной башни.
	autoUpgrade: boolean
	// Характеристики образца: только когда тип у выделения общий.
	stats: {
		damage: number
		range: number
		attackSpeed: number
		crit: number
		burn: number
		chain: number
		execute: number
	} | null
}

// Минимальные поля башни для сводки выделения — тестам не нужны объекты Phaser.
export type SelectableTower = {
	type: TowerType
	level: number
	invested: number
	autoUpgrade: boolean
}

// Считает сводку по выделению. Башни идут в порядке выбора — он же задаёт
// очередь пакетного улучшения.
export function summarizeTowerSelection(
	towers: readonly SelectableTower[],
	gold: number,
	buffs?: TowerBuffs,
): TowerSelectionSummary | null {
	if (towers.length === 0) return null

	const groups: TowerSelectionGroup[] = []
	let upgradeCost = 0
	let upgradeable = 0
	let affordable = 0
	let remaining = Math.max(0, gold)
	let sellValue = 0
	let autoUpgrade = true
	let levelMin = Number.MAX_SAFE_INTEGER
	let levelMax = 0

	for (const tower of towers) {
		sellValue += towerSellValue(tower.invested)
		if (!tower.autoUpgrade) autoUpgrade = false
		levelMin = Math.min(levelMin, tower.level)
		levelMax = Math.max(levelMax, tower.level)

		const cost = towerUpgradeCost(tower.type, tower.level)
		if (cost !== null) {
			upgradeable += 1
			upgradeCost += cost
			if (cost <= remaining) {
				remaining -= cost
				affordable += 1
			}
		}

		const group = groups.find((entry) => entry.type === tower.type)
		if (group) {
			group.count += 1
			group.levelMin = Math.min(group.levelMin, tower.level)
			group.levelMax = Math.max(group.levelMax, tower.level)
		} else {
			groups.push({
				type: tower.type,
				name: TOWER_TYPES[tower.type].name,
				count: 1,
				levelMin: tower.level,
				levelMax: tower.level,
			})
		}
	}

	const type = groups.length === 1 ? groups[0]?.type ?? null : null
	const stats = type === null ? null : pickStats(towerStats(type, towers[0].level, buffs))

	return {
		count: towers.length,
		type,
		groups,
		levelMin,
		levelMax,
		upgradeCost,
		upgradeable,
		affordable,
		sellValue,
		autoUpgrade,
		stats,
	}
}

function pickStats(stats: ReturnType<typeof towerStats>) {
	return {
		damage: stats.damage,
		range: stats.range,
		attackSpeed: stats.attackSpeed,
		crit: stats.crit,
		burn: stats.burn,
		chain: stats.chain,
		execute: stats.execute,
	}
}

export const initialResources = { gold: INITIAL_GOLD, lives: INITIAL_LIVES }
