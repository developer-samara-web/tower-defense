import {
	CELL_SIZE,
	COLS,
	clampBoardSize,
	DEFAULT_COLS,
	DEFAULT_ROWS,
	INITIAL_LIVES,
	ROWS,
	type EnemyType,
} from '../../config/game.config.ts'
import { CASTLE_BUILD_CLEARANCE } from '../../domain/game-rules.ts'
import {
	CASTLE_SIZE,
	type GameMap,
	type MapCastle,
	type MapSpawner,
	type MapWave,
	type MapWaves,
	type Road,
	type RoadPoint,
	type SpawnerGrowth,
	type SpawnerTroop,
} from './game-map.ts'

export type {
	MapCastle,
	MapSpawner,
	MapWave,
	MapWaves,
	SpawnerGrowth,
	SpawnerTroop,
} from './game-map.ts'

// Всё, что игрок создаёт в редакторе, кроме самой травы. Черновик
// хранится в карте и превращается в игровое поле теми же функциями,
// что и в редакторе, поэтому карта в игре совпадает с превью.
export type MapDraft = {
	version: 1
	// Размер поля в клетках: движок рисует и проверяет карту по нему.
	cols: number
	rows: number
	castle: MapCastle | null
	spawners: MapSpawner[]
	waterCells: string[]
	forestCells: string[]
	// Клетки дороги, нарисованные вручную. Если они есть, монстры идут
	// только по ним: игрок сам решает, где пройдёт путь к замку.
	roadCells: string[]
	// Настройки сложности волн: общая прогрессия или список волн.
	waves: MapWaves
}

export type BoardSize = {
	cols: number
	rows: number
}

export type SpawnerRoad = {
	spawnerId: string
	road: Road | null
}

export const MAP_LIMITS = {
	castleHpMin: 1,
	castleHpMax: 999_999,
	countMin: 1,
	countMax: 100,
	speedMin: 10,
	speedMax: 260,
	strengthMin: 1,
	strengthMax: 100,
	healthMin: 10,
	healthMax: 99_999,
	maxSpawners: 24,
	maxTerrainCells: 20_000,
	maxRoadCells: 20_000,
	// Все виды монстров в одной казарме — по одному каждого вида.
	maxTroops: 4,
	wavePercentMin: 10,
	wavePercentMax: 1000,
	maxWaves: 50,
	// Личный прирост казармы за волну, в процентах к общему множителю.
	growthMin: 0,
	growthMax: 100,
} as const

export const DEFAULT_CASTLE_HP = 100

export const DEFAULT_TROOP = {
	type: 'scout' as EnemyType,
	count: 10,
	speed: 70,
	strength: 1,
	health: 100,
} satisfies SpawnerTroop

export const DEFAULT_WAVES: MapWaves = {
	useCommon: true,
	waves: [],
}

// По умолчанию казарма не растёт быстрее общих настроек волн.
export const DEFAULT_SPAWNER_GROWTH: SpawnerGrowth = {
	health: 0,
	speed: 0,
	count: 0,
}

export const MAP_SPAWN_TYPES: EnemyType[] = ['scout', 'brute', 'sprinter', 'boss']

const DIRECTION_STEPS: ReadonlyArray<readonly [number, number]> = [
	[1, 0],
	[0, 1],
	[-1, 0],
	[0, -1],
]

// Пятое «направление» — старт: из него поворот штрафом не считается.
const NO_DIRECTION = 4
const DIRECTION_COUNT = 5

// Дорога с изгибами длиннее прямой на пару клеток, поэтому поворот
// стоит небольших дополнительных усилий — дороги остаются ровными.
const TURN_COST = 2.5

export function createEmptyMapDraft(): MapDraft {
	return {
		version: 1,
		cols: DEFAULT_COLS,
		rows: DEFAULT_ROWS,
		castle: null,
		spawners: [],
		waterCells: [],
		forestCells: [],
		roadCells: [],
		waves: { useCommon: true, waves: [] },
	}
}

export function cellKey(x: number, y: number) {
	return `${x},${y}`
}

export function parseCellKey(key: string): [number, number] {
	const [x = 0, y = 0] = key.split(',').map(Number)
	return [x, y]
}

// Размер по умолчанию — текущее поле сцены: редактор и игра выставляют
// его перед отрисовкой. Данные карты всегда носят размер сами, поэтому
// сервер и превью считают по ним, а не по глобальному полю.
export function draftSize(draft: Pick<MapDraft, 'cols' | 'rows'>): BoardSize {
	return { cols: draft.cols, rows: draft.rows }
}

// Середина поля карты: замок по умолчанию стоит именно там.
export function draftCenter(draft: Pick<MapDraft, 'cols' | 'rows'>): [number, number] {
	return [Math.floor(draft.cols / 2), Math.floor(draft.rows / 2)]
}

// Меняет размер поля. Всё, что вышло за новую границу, уходит с карты:
// иначе сохранённые клетки оказались бы за пределами мира.
export function resizeMapDraft(draft: MapDraft, cols: number, rows: number) {
	const size: BoardSize = {
		cols: clampBoardSize(cols, DEFAULT_COLS),
		rows: clampBoardSize(rows, DEFAULT_ROWS),
	}
	const inside = (key: string) => {
		const [x = 0, y = 0] = parseCellKey(key)
		return isBoardCell(x, y, size)
	}
	const keep = (keys: string[]) => keys.filter(inside)

	const spawners = draft.spawners.filter((spawner) =>
		isBoardCell(spawner.x, spawner.y, size),
	)
	let castle = draft.castle
	if (castle) {
		const [x, y] = clampCastleCell(castle.x, castle.y, size)
		castle = { ...castle, x, y }
	}
	const castleKeys = new Set(castle ? castleCellKeys(castle) : [])

	const waterCells = keep(draft.waterCells).filter((key) => !castleKeys.has(key))
	const forestCells = keep(draft.forestCells).filter((key) => !castleKeys.has(key))
	const occupied = new Set([...castleKeys, ...waterCells, ...forestCells])
	const roadCells = keep(draft.roadCells).filter((key) => !occupied.has(key))

	const removed =
		draft.spawners.length - spawners.length +
		draft.waterCells.length - waterCells.length +
		draft.forestCells.length - forestCells.length +
		draft.roadCells.length - roadCells.length

	return {
		draft: { ...draft, ...size, castle, spawners, waterCells, forestCells, roadCells },
		removed,
	}
}

export function isBoardCell(
	x: number,
	y: number,
	size: BoardSize = { cols: COLS, rows: ROWS },
) {
	return (
		Number.isInteger(x) &&
		Number.isInteger(y) &&
		x >= 0 &&
		y >= 0 &&
		x < size.cols &&
		y < size.rows
	)
}

export function clampCastleCell(
	x: number,
	y: number,
	size: BoardSize = { cols: COLS, rows: ROWS },
): [number, number] {
	const half = Math.floor(CASTLE_SIZE / 2)
	return [
		Math.min(size.cols - 1 - half, Math.max(half, Math.trunc(x))),
		Math.min(size.rows - 1 - half, Math.max(half, Math.trunc(y))),
	]
}

export function castleCellKeys(castle: Pick<MapCastle, 'x' | 'y'>): string[] {
	const half = Math.floor(CASTLE_SIZE / 2)
	const cells: string[] = []

	for (let dy = -half; dy <= half; dy++) {
		for (let dx = -half; dx <= half; dx++) {
			cells.push(cellKey(castle.x + dx, castle.y + dy))
		}
	}

	return cells
}

export function isCastleCell(
	castle: Pick<MapCastle, 'x' | 'y'>,
	x: number,
	y: number,
) {
	const half = Math.floor(CASTLE_SIZE / 2)
	return Math.abs(x - castle.x) <= half && Math.abs(y - castle.y) <= half
}

// Клетки вокруг замка, где башни не ставят. Зона считается от площадки 3×3,
// как запрет у казармы считается от её клетки.
export function castleBuildCells(castle: Pick<MapCastle, 'x' | 'y'>) {
	const reach = Math.floor(CASTLE_SIZE / 2) + CASTLE_BUILD_CLEARANCE
	const blocked = new Set<string>()

	for (let dy = -reach; dy <= reach; dy++) {
		for (let dx = -reach; dx <= reach; dx++) {
			blocked.add(cellKey(castle.x + dx, castle.y + dy))
		}
	}

	return blocked
}

let spawnerCounter = 0

// Новая казарма с настройками по умолчанию: игрок сразу видит
// рабочую карту и правит только то, что хочет.
export function createMapSpawner(x: number, y: number, id?: string): MapSpawner {
	spawnerCounter += 1

	return {
		id: id ?? `spawner-${Date.now().toString(36)}-${spawnerCounter}`,
		x,
		y,
		troops: [{ ...DEFAULT_TROOP }],
		growth: { ...DEFAULT_SPAWNER_GROWTH },
	}
}

let waveCounter = 0

export function createMapWave(): MapWave {
	waveCounter += 1

	return {
		id: `wave-${Date.now().toString(36)}-${waveCounter}`,
		health: 100,
		speed: 100,
		count: 100,
	}
}

// Клетки, куда может прийти дорога: всё, что примыкает к замку снаружи.
// Воды и леса тут быть не должно — иначе казарма останется без пути.
export function castleApproachCells(
	castle: Pick<MapCastle, 'x' | 'y'>,
	size: BoardSize = { cols: COLS, rows: ROWS },
): Set<string> {
	const half = Math.floor(CASTLE_SIZE / 2)
	const cells = new Set<string>()

	for (const key of castleCellKeys(castle)) {
		const [x, y] = parseCellKey(key)
		for (const [dx, dy] of DIRECTION_STEPS) {
			const nx = x + dx
			const ny = y + dy
			if (!isBoardCell(nx, ny, size)) continue
			if (Math.abs(nx - castle.x) <= half && Math.abs(ny - castle.y) <= half) continue
			cells.add(cellKey(nx, ny))
		}
	}

	return cells
}

export function castleCenterPoint(castle: Pick<MapCastle, 'x' | 'y'>): RoadPoint {
	return {
		x: castle.x * CELL_SIZE + CELL_SIZE / 2,
		y: castle.y * CELL_SIZE + CELL_SIZE / 2,
	}
}

export function spawnerCenterPoint(spawner: Pick<MapSpawner, 'x' | 'y'>): RoadPoint {
	return {
		x: spawner.x * CELL_SIZE + CELL_SIZE / 2,
		y: spawner.y * CELL_SIZE + CELL_SIZE / 2,
	}
}

// Казарма не должна стоять вплотную к замку: иначе враг рождается
// на клетке входа и мгновенно прорывается. Оставляем одну клетку зазора.
export function canPlaceSpawner(
	castle: Pick<MapCastle, 'x' | 'y'> | null,
	x: number,
	y: number,
	size: BoardSize = { cols: COLS, rows: ROWS },
) {
	if (!isBoardCell(x, y, size)) return false
	if (!castle) return true
	const half = Math.floor(CASTLE_SIZE / 2) + 1
	return Math.abs(x - castle.x) > half || Math.abs(y - castle.y) > half
}

function cellCenterPoint([x, y]: [number, number]): RoadPoint {
	return { x: x * CELL_SIZE + CELL_SIZE / 2, y: y * CELL_SIZE + CELL_SIZE / 2 }
}

// Дороги от каждой казармы к замку. Если игрок нарисовал дорогу,
// монстры идут только по её клеткам; иначе маршрут ищется по сухой
// земле в обход воды, леса и других казарм.
// Результат null — казарму отрезали.
export function spawnerRoads(draft: MapDraft): SpawnerRoad[] {
	const size = draftSize(draft)
	const result = draft.spawners.map((spawner) => ({
		spawnerId: spawner.id,
		road: null as Road | null,
	}))

	if (!draft.castle) return result

	const castle = draft.castle
	const approach = castleApproachCells(castle, size)
	const painted = new Set(draft.roadCells)
	const manual = painted.size > 0

	// Нарисованная дорога доводит врагов только до тех клеток у замка,
	// которые к ней примыкают. Если таких нет, путь невозможен.
	const targets = manual
		? new Set(Array.from(approach).filter((key) => painted.has(key)))
		: approach
	if (manual && targets.size === 0) return result

	const blocked = new Set<string>(draft.waterCells)
	for (const key of draft.forestCells) blocked.add(key)
	for (const key of castleCellKeys(castle)) blocked.add(key)
	for (const spawner of draft.spawners) blocked.add(cellKey(spawner.x, spawner.y))

	const startCells = new Set<string>()

	for (let i = 0; i < draft.spawners.length; i++) {
		const spawner = draft.spawners[i]
		const entry = result[i]
		if (!spawner || !entry) continue

		const startKey = cellKey(spawner.x, spawner.y)
		if (targets.has(startKey)) continue
		// Две казармы в одной клетке — путь нужен только первой.
		if (startCells.has(startKey)) continue
		startCells.add(startKey)

		const localBlocked = new Set(blocked)
		localBlocked.delete(startKey)

		// Казарма может стоять чуть в стороне от дороги: её собственная
		// клетка проходима, дальше путь идёт только по нарисованным.
		const walkable = manual ? new Set(painted) : undefined
		walkable?.add(startKey)

		entry.road = findRoad(
			[spawner.x, spawner.y],
			targets,
			localBlocked,
			walkable,
			size,
		)
	}

	return result
}

// Сеть нарисованных клеток в виде отрезков: каждая пара соседних клеток
// рисуется один раз, одиночная клетка — точкой. Так дорога в превью
// и в игре выглядит одинаково, без двойных теней на перекрёстках.
export function draftRoadSegments(draft: MapDraft): Road[] {
	const painted = new Set(draft.roadCells)
	if (painted.size === 0) return []

	const linked = new Set<string>()
	const segments: Road[] = []

	for (const key of painted) {
		const [x, y] = parseCellKey(key)

		for (const [dx, dy] of DIRECTION_STEPS.slice(0, 2)) {
			const neighbor = cellKey(x + dx, y + dy)
			if (!painted.has(neighbor)) continue

			segments.push([
				[x, y],
				[x + dx, y + dy],
			])
			linked.add(key)
			linked.add(neighbor)
		}
	}

	for (const key of painted) {
		if (linked.has(key)) continue
		const [x, y] = parseCellKey(key)
		segments.push([
			[x, y],
			[x, y],
		])
	}

	return segments
}

// null — если карту можно сохранять и играть на ней.
export function validateDraft(draft: MapDraft): string | null {
	if (!draft.castle) return 'Сначала поставьте замок'
	if (draft.spawners.length === 0) return 'Поставьте хотя бы одну казарму'

	const broken = spawnerRoads(draft).filter((entry) => !entry.road).length
	if (broken > 0) {
		const connected = draft.roadCells.length > 0
		if (broken === 1) {
			return connected
				? 'Казарма не соединена дорогой с замком'
				: 'Одна казарма не связана с замком'
		}
		return connected
			? `${broken} казармы не соединены дорогой с замком`
			: `${broken} казармы не связаны с замком`
	}

	return null
}

// Превращает черновик в карту для игрового движка. Несвязанные
// казармы отбрасываются, чтобы враги не рождались в тупике.
export function createCustomGameMap(draft: MapDraft): GameMap {
	const [centerX, centerY] = draftCenter(draft)
	const castle: MapCastle = draft.castle ?? {
		x: centerX,
		y: centerY,
		hp: INITIAL_LIVES,
	}

	const routes: Road[] = []
	const spawners: MapSpawner[] = []

	for (const entry of spawnerRoads({ ...draft, castle })) {
		if (!entry.road) continue
		const spawner = draft.spawners.find((item) => item.id === entry.spawnerId)
		if (!spawner) continue
		spawners.push(spawner)
		routes.push(entry.road)
	}

	// Нарисованные дороги рисуем сетью, а маршруты врагов держим
	// отдельно: несколько казарем могут пользоваться одной дорогой.
	const mappedRoutes = routes.map((road) =>
		road.map((cell) => cellCenterPoint(cell)),
	)
	const manual = draft.roadCells.length > 0
	const drawnRoads = manual ? draftRoadSegments(draft) : routes

	return {
		roads: drawnRoads,
		roadPoints: drawnRoads.map((road) =>
			road.map((cell) => cellCenterPoint(cell)),
		),
		...(manual ? { routes: mappedRoutes } : {}),
		waterCells: [...draft.waterCells],
		forestCells: [...draft.forestCells],
		castle,
		spawners,
		waves: draft.waves,
	}
}

// Приводит данные из редактора или запроса к безопасному виду:
// ограничивает числа, выкидывает клетки за полем и наложения.
export function normalizeMapDraft(value: unknown): MapDraft | null {
	if (!value || typeof value !== 'object') return null

	const raw = value as Record<string, unknown>
	const size: BoardSize = {
		cols: clampBoardSize(readNumber(raw.cols), DEFAULT_COLS),
		rows: clampBoardSize(readNumber(raw.rows), DEFAULT_ROWS),
	}
	const castle = readCastle(raw.castle, size)
	const spawners = readSpawners(raw.spawners, castle, size)
	const occupied = new Set<string>(spawners.map((spawner) => cellKey(spawner.x, spawner.y)))
	if (castle) {
		for (const key of castleCellKeys(castle)) occupied.add(key)
	}

	const waterCells = readTerrainCells(raw.waterCells, occupied, size)
	const forestCells = readTerrainCells(raw.forestCells, occupied, size)
	const terrain = new Set([...occupied, ...waterCells, ...forestCells])

	return {
		version: 1,
		cols: size.cols,
		rows: size.rows,
		castle,
		spawners,
		waterCells,
		forestCells,
		roadCells: readTerrainCells(
			raw.roadCells,
			terrain,
			size,
			MAP_LIMITS.maxRoadCells,
		),
		waves: readWaves(raw.waves),
	}
}

// Старые карты хранили один вид монстров полями казармы. Такие записи
// превращаются в список из одного вида, и карта продолжает работать.
function readTroops(raw: Record<string, unknown>): SpawnerTroop[] {
	const source = Array.isArray(raw.troops)
		? raw.troops
		: [{ ...raw }]

	const troops: SpawnerTroop[] = []
	const used = new Set<EnemyType>()

	for (const entry of source.slice(0, MAP_LIMITS.maxTroops)) {
		if (!entry || typeof entry !== 'object') continue

		const troop = entry as Record<string, unknown>
		const type = isEnemyType(troop.type) ? troop.type : DEFAULT_TROOP.type
		if (used.has(type)) continue
		used.add(type)

		troops.push({
			type,
			count: clampNumber(troop.count, MAP_LIMITS.countMin, MAP_LIMITS.countMax, DEFAULT_TROOP.count),
			speed: clampNumber(troop.speed, MAP_LIMITS.speedMin, MAP_LIMITS.speedMax, DEFAULT_TROOP.speed),
			strength: clampNumber(troop.strength, MAP_LIMITS.strengthMin, MAP_LIMITS.strengthMax, DEFAULT_TROOP.strength),
			health: clampNumber(troop.health, MAP_LIMITS.healthMin, MAP_LIMITS.healthMax, DEFAULT_TROOP.health),
		})
	}

	// Казарма без монстров не выпускает никого — оставляем разведчика.
	return troops.length > 0 ? troops : [{ ...DEFAULT_TROOP }]
}

function readWaves(value: unknown): MapWaves {
	if (!value || typeof value !== 'object') return { ...DEFAULT_WAVES }

	const raw = value as Record<string, unknown>
	const list = Array.isArray(raw.waves) ? raw.waves : []
	const waves: MapWave[] = []
	const usedIds = new Set<string>()

	for (const entry of list.slice(0, MAP_LIMITS.maxWaves)) {
		if (!entry || typeof entry !== 'object') continue

		const wave = entry as Record<string, unknown>
		let id = typeof wave.id === 'string' && wave.id.trim() ? wave.id.trim().slice(0, 64) : ''
		if (!id || usedIds.has(id)) id = `wave-${waves.length + 1}`
		usedIds.add(id)

		waves.push({
			id,
			health: clampWavePercent(wave.health),
			speed: clampWavePercent(wave.speed),
			count: clampWavePercent(wave.count),
		})
	}

	// Без собственных волн всегда работает общая прогрессия.
	return {
		useCommon: raw.useCommon !== false || waves.length === 0,
		waves,
	}
}

function clampWavePercent(value: unknown) {
	return clampNumber(value, MAP_LIMITS.wavePercentMin, MAP_LIMITS.wavePercentMax, 100)
}

function readCastle(value: unknown, size: BoardSize): MapCastle | null {
	if (!value || typeof value !== 'object') return null

	const raw = value as Record<string, unknown>
	if (typeof raw.x !== 'number' || typeof raw.y !== 'number') return null

	const [x, y] = clampCastleCell(raw.x, raw.y, size)
	return {
		x,
		y,
		hp: clampNumber(raw.hp, MAP_LIMITS.castleHpMin, MAP_LIMITS.castleHpMax, DEFAULT_CASTLE_HP),
	}
}

function readSpawners(
	value: unknown,
	castle: MapCastle | null,
	size: BoardSize,
): MapSpawner[] {
	if (!Array.isArray(value)) return []

	const spawners: MapSpawner[] = []
	const usedCells = new Set<string>()
	const usedIds = new Set<string>()

	for (const entry of value.slice(0, MAP_LIMITS.maxSpawners)) {
		if (!entry || typeof entry !== 'object') continue

		const raw = entry as Record<string, unknown>
		if (typeof raw.x !== 'number' || typeof raw.y !== 'number') continue
		if (!Number.isFinite(raw.x) || !Number.isFinite(raw.y)) continue

		const x = Math.trunc(raw.x)
		const y = Math.trunc(raw.y)
		if (!isBoardCell(x, y, size)) continue
		if (!canPlaceSpawner(castle, x, y, size)) continue

		const key = cellKey(x, y)
		if (usedCells.has(key)) continue
		usedCells.add(key)

		let id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim().slice(0, 64) : ''
		if (!id || usedIds.has(id)) id = `s${spawners.length + 1}-${x}-${y}`
		usedIds.add(id)

		spawners.push({
			id,
			x,
			y,
			troops: readTroops(raw),
			growth: readGrowth(raw.growth),
		})
	}

	return spawners
}

// Личный рост казармы: проценты к общим волновым множителям за каждую
// следующую волну. У старых карт поля нет — тогда рост нулевой.
function readGrowth(value: unknown): SpawnerGrowth {
	const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>

	return {
		health: clampNumber(raw.health, MAP_LIMITS.growthMin, MAP_LIMITS.growthMax, 0),
		speed: clampNumber(raw.speed, MAP_LIMITS.growthMin, MAP_LIMITS.growthMax, 0),
		count: clampNumber(raw.count, MAP_LIMITS.growthMin, MAP_LIMITS.growthMax, 0),
	}
}

function readTerrainCells(
	value: unknown,
	occupied: ReadonlySet<string>,
	size: BoardSize,
	limit = MAP_LIMITS.maxTerrainCells,
): string[] {
	if (!Array.isArray(value)) return []

	const cells: string[] = []
	const seen = new Set<string>()

	for (const entry of value.slice(0, limit)) {
		if (typeof entry !== 'string') continue
		if (!/^-?\d+,-?\d+$/.test(entry)) continue

		const [x, y] = parseCellKey(entry)
		if (!isBoardCell(x, y, size)) continue

		const key = cellKey(x, y)
		if (seen.has(key) || occupied.has(key)) continue

		seen.add(key)
		cells.push(key)
	}

	return cells
}

function isEnemyType(value: unknown): value is EnemyType {
	return value === 'scout' || value === 'brute' || value === 'sprinter' || value === 'boss'
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
	if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
	return Math.min(max, Math.max(min, Math.round(value)))
}

// Размер поля читаем как число: у старых карт его нет, и тогда
// работает поле по умолчанию.
function readNumber(value: unknown) {
	return typeof value === 'number' && Number.isFinite(value) ? value : Number.NaN
}

type HeapNode = {
	state: number
	score: number
}

// Двоичная куча: поиск пути обходит до 40 тысяч состояний,
// перебор массива на каждом шаге заметно тормозил бы редактор.
function heapPush(heap: HeapNode[], node: HeapNode) {
	heap.push(node)
	let index = heap.length - 1

	while (index > 0) {
		const parent = Math.floor((index - 1) / 2)
		const current = heap[index]
		const up = heap[parent]
		if (!current || !up || up.score <= current.score) break
		heap[index] = up
		heap[parent] = current
		index = parent
	}
}

function heapPop(heap: HeapNode[]): HeapNode {
	const top = heap[0]
	const last = heap.pop()
	if (!top || !last || heap.length === 0) return top ?? { state: -1, score: 0 }

	heap[0] = last
	let index = 0

	while (true) {
		const left = index * 2 + 1
		const right = left + 1
		let smallest = index

		if (left < heap.length && (heap[left]?.score ?? Infinity) < (heap[smallest]?.score ?? Infinity)) {
			smallest = left
		}
		if (right < heap.length && (heap[right]?.score ?? Infinity) < (heap[smallest]?.score ?? Infinity)) {
			smallest = right
		}
		if (smallest === index) break

		const current = heap[index]
		const next = heap[smallest]
		if (!current || !next) break
		heap[index] = next
		heap[smallest] = current
		index = smallest
	}

	return top
}

function findRoad(
	start: [number, number],
	targets: ReadonlySet<string>,
	blocked: ReadonlySet<string>,
	walkable: ReadonlySet<string> | undefined,
	size: BoardSize,
): Road | null {
	const cols = size.cols
	const [startX, startY] = start
	const startState = (startY * cols + startX) * DIRECTION_COUNT + NO_DIRECTION
	const total = cols * size.rows * DIRECTION_COUNT

	const cost = new Float64Array(total).fill(Infinity)
	const previous = new Int32Array(total).fill(-1)
	const heap: HeapNode[] = []

	cost[startState] = 0
	heapPush(heap, { state: startState, score: 0 })

	let goalState = -1

	while (heap.length > 0) {
		const node = heapPop(heap)
		if (node.state < 0) break
		if (node.score > (cost[node.state] ?? Infinity)) continue

		const cellIndex = Math.floor(node.state / DIRECTION_COUNT)
		const x = cellIndex % cols
		const y = Math.floor(cellIndex / cols)
		const direction = node.state % DIRECTION_COUNT

		if (targets.has(cellKey(x, y))) {
			goalState = node.state
			break
		}

		for (let step = 0; step < DIRECTION_STEPS.length; step++) {
			const [dx, dy] = DIRECTION_STEPS[step]!
			const nx = x + dx
			const ny = y + dy
			if (!isBoardCell(nx, ny, size)) continue
			if (blocked.has(cellKey(nx, ny))) continue
			if (walkable && !walkable.has(cellKey(nx, ny))) continue

			const nextState = (ny * cols + nx) * DIRECTION_COUNT + step
			const stepCost = 1 + (direction !== NO_DIRECTION && direction !== step ? TURN_COST : 0)
			const nextCost = (cost[node.state] ?? 0) + stepCost
			if (nextCost >= (cost[nextState] ?? Infinity)) continue

			cost[nextState] = nextCost
			previous[nextState] = node.state
			heapPush(heap, { state: nextState, score: nextCost })
		}
	}

	if (goalState === -1) return null

	const cells: Road = []
	let state = goalState

	while (state !== -1) {
		const cellIndex = Math.floor(state / DIRECTION_COUNT)
		cells.push([cellIndex % cols, Math.floor(cellIndex / cols)])
		state = previous[state] ?? -1
	}

	cells.reverse()
	return simplifyRoad(cells)
}

// Оставляет только повороты: враги и отрисовка ходят по точкам,
// и лишние клетки на прямых участках не нужны.
function simplifyRoad(cells: Road): Road {
	if (cells.length <= 2) return cells

	const result: Road = []
	const first = cells[0]
	if (!first) return cells
	result.push(first)

	for (let i = 1; i < cells.length - 1; i++) {
		const previous = cells[i - 1]
		const current = cells[i]
		const next = cells[i + 1]
		if (!previous || !current || !next) continue

		const sameX = Math.sign(current[0] - previous[0]) === Math.sign(next[0] - current[0])
		const sameY = Math.sign(current[1] - previous[1]) === Math.sign(next[1] - current[1])
		if (sameX && sameY) continue

		result.push(current)
	}

	const last = cells[cells.length - 1]
	if (last) result.push(last)

	return result
}
