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
	ENEMY_SLOW_MULTIPLIER,
	ENEMY_SPAWN_INTERVAL,
	ENEMY_SPAWN_INTERVAL_MIN,
	ENEMY_SPAWN_INTERVAL_STEP,
	ENEMY_TYPES,
	FIRE_BURN_HP_PERCENT,
	FIRE_BURN_MIN_LEVEL,
	ICE_SLOW_BONUS_MIN_LEVEL,
	ICE_SLOW_BONUS_PER_LEVEL,
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
	TOWER_MULTI_TARGET_LEVEL,
	TOWER_RANGE_GROWTH,
	TOWER_SELL_REFUND,
	TOWER_TRIPLE_TARGET_LEVEL,
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

// Замок — последний рубеж: одна свободная клетка вокруг площадки остаётся
// пустой, чтобы прорвавшиеся монстры не прятались за стеной башен.
export const CASTLE_BUILD_CLEARANCE = 1

// Башня, поставленная в очередь: ждёт золото на той же площадке 2×2,
// что и построенная. Якорь и id совпадают с future-башней, поэтому
// отмена и постройка работают по одному ключу.
export type QueuedBuild = {
	id: string
	type: TowerType
	x: number
	y: number
}

// Казарма строит одну башню за раз, а очередь длиннее только для того,
// чтобы игрок успел разметить оборону до следующей волны.
export const MAX_BUILD_QUEUE = 8

// Клетки, зарезервированные очередью: по ним проходит та же проверка
// площадки, что по клеткам построенных башен.
export function buildQueueCells(queue: readonly QueuedBuild[]) {
	const cells = new Set<string>()

	for (const item of queue) {
		for (const key of towerFootprintCells({ x: item.x, y: item.y })) {
			cells.add(key)
		}
	}

	return cells
}

type BuildCellSets = {
	pathCells: ReadonlySet<string>
	waterCells: ReadonlySet<string>
	forestCells: ReadonlySet<string>
	wallCells?: ReadonlySet<string>
	spawnerCells: ReadonlySet<string>
	castleCells: ReadonlySet<string>
	towerCells: ReadonlySet<string>
	queuedCells?: ReadonlySet<string>
}

// Что мешает поставить башню на площадку, кроме золота. Порядок проверок
// важен: занятая клетка важнее нехватки денег, поэтому игрок видит
// настоящую причину, а не «мало золота» на месте чужой башни.
function buildBlockReason(position: BoardPosition, cells: BuildCellSets) {
	const corner = { x: position.x + TOWER_FOOTPRINT - 1, y: position.y + TOWER_FOOTPRINT - 1 }
	if (!isBoardPosition(position) || !isBoardPosition(corner)) {
		return 'outside' as const
	}

	// Площадка 2×2: башня занимает все четыре клетки, поэтому блокирует
	// любая из них — замок, дорога, вода, лес, казарма или соседняя башня.
	// Всё, что осталось за пределами занятых клеток, свободно для стройки.
	for (const key of towerFootprintCells(position)) {
		if (cells.castleCells.has(key)) return 'castle' as const
		if (cells.pathCells.has(key)) return 'path' as const
		if (cells.waterCells.has(key)) return 'water' as const
		if (cells.forestCells.has(key)) return 'forest' as const
		if (cells.wallCells?.has(key)) return 'wall' as const
		if (cells.spawnerCells.has(key)) return 'spawner' as const
		if (cells.towerCells.has(key)) return 'occupied' as const
		if (cells.queuedCells?.has(key)) return 'queued' as const
	}

	return null
}

// Башня занимает только свою площадку 2×2: отступ между соседними
// площадками не требуется, блокируют лишь уже занятые клетки.
export function canBuildTower({ position, towerCells, gold, towerType, ...cells }: BuildCellSets & {
	position: BoardPosition
	gold: number
	towerType: TowerType
}) {
	const blocked = buildBlockReason(position, { ...cells, towerCells })
	if (blocked) return { allowed: false, reason: blocked }

	if (gold < TOWER_TYPES[towerType].cost) return { allowed: false, reason: 'gold' as const }
	return { allowed: true, reason: null }
}

// Можно ли поставить башню в очередь. Золото здесь не причина отказа:
// в очередь как раз становятся тогда, когда денег не хватает.
export function canQueueTower({ position, queue, towerCells, ...cells }: BuildCellSets & {
	position: BoardPosition
	queue: readonly QueuedBuild[]
}) {
	const queuedCells = buildQueueCells(queue)
	const blocked = buildBlockReason(position, { ...cells, towerCells, queuedCells })
	if (blocked) return { allowed: false, reason: blocked }

	if (queue.length >= MAX_BUILD_QUEUE) {
		return { allowed: false, reason: 'full' as const }
	}

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

// Перки уровня башни: считаются только из уровня, а не из карточек, поэтому
// награда остаётся с башней навсегда. `level` здесь уже ограничен сверху
// MAX_TOWER_LEVEL внутри towerStats.
function towerTargets(level: number) {
	if (level >= TOWER_TRIPLE_TARGET_LEVEL) return 3
	if (level >= TOWER_MULTI_TARGET_LEVEL) return 2
	return 1
}

// Сила замедления льда: множитель скорости врага. Базовое −50%, плюс по 10%
// за 3-й и 4-й уровни. Бонус не убывает на 5-м: там наградой становится
// третья цель, а не откат замедления назад.
function towerSlowFactor(type: TowerType, level: number) {
	if (type !== 'ice') return 1
	const cap = TOWER_TRIPLE_TARGET_LEVEL - 1
	const steps = Math.min(level, cap) - (ICE_SLOW_BONUS_MIN_LEVEL - 1)
	return Math.max(0.1, ENEMY_SLOW_MULTIPLIER - Math.max(0, steps) * ICE_SLOW_BONUS_PER_LEVEL)
}

// Поджог от уровня: доля максимального здоровья врага в секунду. Держится
// и на 5-м уровне — по той же причине, что и замедление льда.
function towerBurnPercent(type: TowerType, level: number) {
	if (type !== 'fire') return 0
	return level >= FIRE_BURN_MIN_LEVEL ? FIRE_BURN_HP_PERCENT : 0
}

// Что игрок получает именно на этом уровне — для статуса после улучшения.
// Сравниваем перки двух соседних уровней: объявляется только то, что реально
// изменилось, поэтому «Земля» на 3-м уровне молчит, а 5-й отдаёт приоритет
// новой цели, а не сохранившемуся замедлению.
export function towerLevelPerk(type: TowerType, level: number): string | null {
	if (level <= 1) return null

	const prev = towerStats(type, level - 1)
	const now = towerStats(type, level)

	if (now.targets > prev.targets) return `Залп по ${now.targets} целям`
	if (now.slowFactor < prev.slowFactor) {
		return `Замедление усилено до −${Math.round((1 - now.slowFactor) * 100)}%`
	}
	if (now.burnPercent > prev.burnPercent) {
		return `Поджог ${Math.round(now.burnPercent * 100)}% здоровья в секунду`
	}

	return null
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
		// Перки уровня.
		targets: towerTargets(steps + 1),
		slowFactor: towerSlowFactor(type, steps + 1),
		burnPercent: towerBurnPercent(type, steps + 1),
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
		// Перки уровня: тоже часть сводки, иначе панель башни их скрывает.
		targets: number
		slowFactor: number
		burnPercent: number
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
		targets: stats.targets,
		slowFactor: stats.slowFactor,
		burnPercent: stats.burnPercent,
	}
}

export const initialResources = { gold: INITIAL_GOLD, lives: INITIAL_LIVES }
