import {
	CELL_SIZE,
	COLS,
	INITIAL_LIVES,
	ROWS,
	type EnemyType,
} from '../../config/game.config.ts'

export type Road = [number, number][]
export type RoadPoint = { x: number; y: number }

// Замок в редакторе ставится в любую точку поля. x, y — центральная
// клетка площадки 3×3, hp — запас прочности на всю игру.
export type MapCastle = {
	x: number
	y: number
	hp: number
}

// Один вид монстров в казарме: сколько выпустить за волну и с какими
// базовыми характеристиками. strength — сколько прочности замка
// снимает прорвавшийся монстр.
export type SpawnerTroop = {
	type: EnemyType
	count: number
	speed: number
	strength: number
	health: number
}

// Казарма может выпускать несколько видов монстров: они чередуются.
export type MapSpawner = {
	id: string
	x: number
	y: number
	troops: SpawnerTroop[]
}

// Правки характеристик волны в процентах от базовых значений казарм.
export type MapWave = {
	id: string
	health: number
	speed: number
	count: number
}

// План волн карты. useCommon — характеристики растут с номером волны
// по общим правилам игры; иначе берётся список waves, а после
// последней волны повторяется её настройка.
export type MapWaves = {
	useCommon: boolean
	waves: MapWave[]
}

export type GameMap = {
	roads: Road[]
	roadPoints: RoadPoint[][]
	// Маршруты врагов, если дороги нарисованы вручную: roadPoints тогда
	// описывают всю сеть дорог для отрисовки, а не путь каждой казармы.
	routes?: RoadPoint[][]
	// Клетки, занятые водой: на них нельзя строить башни.
	waterCells: string[]
	// Клетки, занятые лесом: тоже не застраиваются.
	forestCells: string[]
	castle: MapCastle
	// Пусто у карт, сгенерированных по сиду: там враги выходят с краёв.
	spawners: MapSpawner[]
	// Настройки волн пользовательской карты.
	waves?: MapWaves
}

// Центр карты — здесь стоит замок, который защищает игрок.
// Поле бывает разного размера, поэтому центр считаем на месте.
export function centerCell(): [number, number] {
	return [Math.floor(COLS / 2), Math.floor(ROWS / 2)]
}

// Замок занимает квадрат 3×3 клетки вокруг центра.
export const CASTLE_SIZE = 3

// Водоёмы занимают рамку не больше 6×6 клеток, но форму набирают
// случайно: это связная фигура из клеток, а не обязательно прямоугольник.
export const RIVER_COUNT = 18
export const RIVER_MAX_SIZE = 6
const RIVER_MIN_CELLS = 3

// Дороги, замок и ворота должны оставаться на суше.
const ROAD_CLEARANCE = 2

// Между водоёмами оставляем полосу травы, иначе они сливаются в одно озеро.
const RIVER_CLEARANCE = 1

// Лес заполняет всё свободное место, но пять клеток вдоль дорог
// остаются открытыми: только там игрок ставит башни.
export const FOREST_ROAD_CLEARANCE = 5

// Насколько кромка леса гуляет вглубь свободного поля.
const FOREST_EDGE_VARIANCE = 2

// Ниже этого значения шума вырастает поляна внутри чащи.
const FOREST_CLEARING_THRESHOLD = 0.12

const CELL_NEIGHBORS: Array<[number, number]> = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1],
]

export function castleCells(): string[] {
	const [cx, cy] = centerCell()
	const cells: string[] = []
	const half = Math.floor(CASTLE_SIZE / 2)

	for (let dy = -half; dy <= half; dy++) {
		for (let dx = -half; dx <= half; dx++) {
			cells.push(`${cx + dx},${cy + dy}`)
		}
	}

	return cells
}

// Один и тот же seed всегда даёт одну и ту же карту,
// поэтому сохранённую игру можно восстановить на прежних дорогах.
export function mapSeedToNumber(seed: string | number) {
	if (typeof seed === 'number') return seed >>> 0

	let hash = 0x811c9dc5
	for (let i = 0; i < seed.length; i++) {
		hash ^= seed.charCodeAt(i)
		hash = Math.imul(hash, 0x01000193)
	}

	return hash >>> 0
}

function createSeededRandom(seed: number) {
	let state = seed >>> 0

	return () => {
		state = (state + 0x6d2b79f5) | 0

		let value = state
		value = Math.imul(value ^ (value >>> 15), value | 1)
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61)

		return ((value ^ (value >>> 14)) >>> 0) / 4294967296
	}
}

// Случайное целое в диапазоне [min, max].
function randomInt(random: () => number, min: number, max: number) {
	const low = Math.min(min, max)
	const high = Math.max(min, max)
	return low + Math.floor(random() * (high - low + 1))
}

// Случайное целое, которое не подходит слишком близко к заданному значению.
// Нужно, чтобы соседние повороты дороги не сливались в один отрезок.
function randomIntAwayFrom(
	random: () => number,
	min: number,
	max: number,
	avoid: number,
	gap: number,
) {
	for (let attempt = 0; attempt < 40; attempt++) {
		const value = randomInt(random, min, max)
		if (Math.abs(value - avoid) >= gap) return value
	}

	return randomInt(random, min, max)
}

// Убирает повторяющиеся подряд точки, чтобы не рисовать нулевые отрезки.
function normalize(road: Road): Road {
	const result: Road = []

	for (const point of road) {
		const previous = result[result.length - 1]
		if (previous && previous[0] === point[0] && previous[1] === point[1]) {
			continue
		}
		result.push(point)
	}

	return result
}

// Строит 4 длинные извилистые дороги, которые входят в замок
// с четырёх сторон. Каждая дорога живёт в своей четверти карты,
// поэтому дороги гарантированно не пересекаются и не слипаются.
function buildRoads(random: () => number): Road[] {
	const [cx, cy] = centerCell()

	// Дорога выходит за пределы поля на одну клетку.
	const edge = 1

	// Ворота стоят в двух клетках от центра — сразу за стенами замка.
	const gate = 2

	// Минимальный зазор между соседними поворотами дороги.
	const turnGap = 6

	// Северная дорога: верхняя левая четверть, входит в северные ворота.
	const northX = randomInt(random, 4, cx - 2)
	const northY1 = randomInt(random, 8, Math.floor(cy / 2))
	const northY2 = randomInt(random, Math.floor(cy / 2) + turnGap, cy - 4)
	const northX2 = randomIntAwayFrom(random, 4, cx - 2, northX, turnGap)
	const north: Road = normalize([
		[northX, -edge],
		[northX, northY1],
		[northX2, northY1],
		[northX2, northY2],
		[cx, northY2],
		[cx, cy - gate],
	])

	// Восточная дорога: верхняя правая четверть, входит в восточные ворота.
	const eastY = randomInt(random, 4, cy - 4)
	const eastX1 = randomInt(random, cx + 16, COLS - 16)
	const eastX2 = randomInt(random, cx + 4, eastX1 - turnGap)
	const eastY2 = randomIntAwayFrom(random, 4, cy - 4, eastY, turnGap)
	const east: Road = normalize([
		[COLS + edge, eastY],
		[eastX1, eastY],
		[eastX1, eastY2],
		[eastX2, eastY2],
		[eastX2, cy],
		[cx + gate, cy],
	])

	// Южная дорога: нижняя правая четверть, входит в южные ворота.
	const southX = randomInt(random, cx + 2, COLS - 4)
	const southY1 = randomInt(
		random,
		Math.floor(cy + (ROWS - cy) / 2),
		ROWS - 8,
	)
	const southY2 = randomInt(random, cy + 4, southY1 - turnGap)
	const southX2 = randomIntAwayFrom(random, cx + 2, COLS - 4, southX, turnGap)
	const south: Road = normalize([
		[southX, ROWS + edge],
		[southX, southY1],
		[southX2, southY1],
		[southX2, southY2],
		[cx, southY2],
		[cx, cy + gate],
	])

	// Западная дорога: нижняя левая четверть, входит в западные ворота.
	const westY = randomInt(random, cy + 4, ROWS - 4)
	const westX1 = randomInt(random, 16, cx - 16)
	const westX2 = randomInt(random, westX1 + turnGap, cx - 4)
	const westY2 = randomIntAwayFrom(random, cy + 4, ROWS - 4, westY, turnGap)
	const west: Road = normalize([
		[-edge, westY],
		[westX1, westY],
		[westX1, westY2],
		[westX2, westY2],
		[westX2, cy],
		[cx - gate, cy],
	])

	return [north, east, south, west]
}

function toPoint([x, y]: [number, number]): RoadPoint {
	return {
		x: x * CELL_SIZE + CELL_SIZE / 2,
		y: y * CELL_SIZE + CELL_SIZE / 2,
	}
}

function parseCell(key: string): [number, number] {
	const [x = 0, y = 0] = key.split(',').map(Number)
	return [x, y]
}

// Помечает клетку вместе с запасом вокруг неё.
function reserveCell(reserved: Set<string>, key: string, clearance: number) {
	const [x, y] = parseCell(key)
	reserveArea(reserved, x, y, 1, 1, clearance)
}

// Помечает прямоугольник вместе с запасом вокруг него.
function reserveArea(
	reserved: Set<string>,
	x: number,
	y: number,
	width: number,
	height: number,
	clearance: number,
) {
	for (let cy = y - clearance; cy < y + height + clearance; cy++) {
		for (let cx = x - clearance; cx < x + width + clearance; cx++) {
			reserved.add(`${cx},${cy}`)
		}
	}
}

// Клетки вдоль осей дороги — по ним строим запас вокруг дорог.
function roadCells(roads: Road[]): string[] {
	const cells = new Set<string>()

	for (const road of roads) {
		for (let i = 0; i < road.length - 1; i++) {
			const [startX, startY] = road[i]
			const [endX, endY] = road[i + 1]
			const steps = Math.max(Math.abs(endX - startX), Math.abs(endY - startY))

			for (let step = 0; step <= steps; step++) {
				const t = step / Math.max(1, steps)
				const x = Math.round(startX + (endX - startX) * t)
				const y = Math.round(startY + (endY - startY) * t)
				cells.add(`${x},${y}`)
			}
		}
	}

	return Array.from(cells)
}

type WaterShape = {
	width: number
	height: number
	cells: Array<[number, number]>
}

// Случайная связная фигура внутри рамки: стартуем с одной клетки
// и наращиваем форму соседними клетками.
function buildWaterShape(random: () => number): WaterShape {
	const width = randomInt(random, 2, RIVER_MAX_SIZE)
	const height = randomInt(random, 2, RIVER_MAX_SIZE)
	const target = randomInt(random, RIVER_MIN_CELLS, width * height)

	const cells = new Set<string>()
	cells.add(`${randomInt(random, 0, width - 1)},${randomInt(random, 0, height - 1)}`)

	for (let attempt = 0; attempt < 200 && cells.size < target; attempt++) {
		const keys = Array.from(cells)
		const [x, y] = parseCell(keys[Math.floor(random() * keys.length)] ?? '0,0')
		const [dx, dy] = CELL_NEIGHBORS[Math.floor(random() * CELL_NEIGHBORS.length)] ?? [0, 0]
		const nx = x + dx
		const ny = y + dy

		if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue

		cells.add(`${nx},${ny}`)
	}

	fillWaterHoles(cells, width, height)

	return {
		width,
		height,
		cells: Array.from(cells).map((key) => parseCell(key)),
	}
}

// Наращивание формы может оставить внутри пустую клетку — водоём
// получится бубликом. Берег такого бублика рисует кольцо в воде,
// поэтому все замкнутые пустоты внутри рамки заливаем.
function fillWaterHoles(cells: Set<string>, width: number, height: number) {
	const outside = new Set<string>()
	const queue: Array<[number, number]> = []

	for (let x = 0; x < width; x++) {
		queue.push([x, 0], [x, height - 1])
	}

	for (let y = 0; y < height; y++) {
		queue.push([0, y], [width - 1, y])
	}

	// Всё, до чего можно дойти от края рамки по сухим клеткам, — не дырка.
	while (queue.length > 0) {
		const [x, y] = queue.pop() as [number, number]
		const key = `${x},${y}`

		if (cells.has(key) || outside.has(key)) continue
		outside.add(key)

		for (const [dx, dy] of CELL_NEIGHBORS) {
			const nx = x + dx
			const ny = y + dy

			if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
			if (!outside.has(`${nx},${ny}`)) queue.push([nx, ny])
		}
	}

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const key = `${x},${y}`
			if (!cells.has(key) && !outside.has(key)) cells.add(key)
		}
	}
}

// Разбрасывает водоёмы по свободной траве. Неудачные попытки просто
// пропускаем: карта должна остаться просторной, а не забитой водой.
function buildWaterCells(random: () => number, roads: Road[]): string[] {
	const reserved = new Set<string>()
	const [cx, cy] = centerCell()
	const castleHalf = Math.floor(CASTLE_SIZE / 2)

	reserveArea(reserved, cx - castleHalf, cy - castleHalf, CASTLE_SIZE, CASTLE_SIZE, ROAD_CLEARANCE)

	for (const key of roadCells(roads)) {
		reserveCell(reserved, key, ROAD_CLEARANCE)
	}

	const water: string[] = []

	for (let i = 0; i < RIVER_COUNT; i++) {
		for (let attempt = 0; attempt < 80; attempt++) {
			const shape = buildWaterShape(random)
			// Одна клетка отступа от края, чтобы водоём целиком лежал на поле.
			const offsetX = randomInt(random, 1, COLS - shape.width - 1)
			const offsetY = randomInt(random, 1, ROWS - shape.height - 1)

			const placed = shape.cells.map(
				([x, y]) => `${x + offsetX},${y + offsetY}`,
			)

			if (!placed.every((key) => !reserved.has(key))) continue

			water.push(...placed)
			for (const key of placed) reserveCell(reserved, key, RIVER_CLEARANCE)
			break
		}
	}

	return water
}

// Расстояние до ближайшей дороги или замка в клетках (шахматная метрика).
// Хватает самого поля: за его краем строить всё равно нельзя.
function buildRoadDistances(roads: Road[]): Int16Array {
	const distance = new Int16Array(COLS * ROWS).fill(-1)
	const queue: number[] = []

	const start = (x: number, y: number) => {
		if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return

		const index = y * COLS + x
		if (distance[index] !== -1) return

		distance[index] = 0
		queue.push(index)
	}

	for (const key of roadCells(roads)) {
		const [x, y] = parseCell(key)
		start(x, y)
	}

	for (const key of castleCells()) {
		const [x, y] = parseCell(key)
		start(x, y)
	}

	for (let head = 0; head < queue.length; head++) {
		const index = queue[head] ?? 0
		const x = index % COLS
		const y = Math.floor(index / COLS)
		const next = (distance[index] ?? 0) + 1

		for (let dy = -1; dy <= 1; dy++) {
			for (let dx = -1; dx <= 1; dx++) {
				if (dx === 0 && dy === 0) continue

				const nx = x + dx
				const ny = y + dy
				if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue

				const neighbor = ny * COLS + nx
				if (distance[neighbor] !== -1) continue

				distance[neighbor] = next
				queue.push(neighbor)
			}
		}
	}

	return distance
}

// Плавный шум по решётке: нужен, чтобы кромка леса и поляны были
// пятнами, а не ровной линией вдоль дороги.
function valueNoise(x: number, y: number, seed: number) {
	const x0 = Math.floor(x)
	const y0 = Math.floor(y)
	const fx = x - x0
	const fy = y - y0
	const sx = fx * fx * (3 - 2 * fx)
	const sy = fy * fy * (3 - 2 * fy)

	const top = lerp(nodeNoise(x0, y0, seed), nodeNoise(x0 + 1, y0, seed), sx)
	const bottom = lerp(nodeNoise(x0, y0 + 1, seed), nodeNoise(x0 + 1, y0 + 1, seed), sx)

	return lerp(top, bottom, sy)
}

function nodeNoise(x: number, y: number, seed: number) {
	let hash = seed ^ Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1)
	hash = Math.imul(hash ^ (hash >>> 15), 0x85ebca6b)
	hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35)

	return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296
}

function lerp(from: number, to: number, t: number) {
	return from + (to - from) * t
}

// Лес — не жёсткая сетка клеток: у кромки он редеет, в глубине становится
// сплошным, а поляны разбивают массив на купы. Воду деревья не занимают.
function buildForestCells(
	random: () => number,
	roads: Road[],
	waterCells: string[],
): string[] {
	const distance = buildRoadDistances(roads)
	const water = new Set(waterCells)

	// Берег водоёма оставляем открытым: кроны не должны заслонять воду.
	const shore = new Set(waterCells)
	for (const key of waterCells) {
		const [x, y] = parseCell(key)
		for (let dy = -1; dy <= 1; dy++) {
			for (let dx = -1; dx <= 1; dx++) shore.add(`${x + dx},${y + dy}`)
		}
	}

	const forest: string[] = []

	const edgeSeed = (random() * 0xffffffff) >>> 0
	const meadowSeed = (random() * 0xffffffff) >>> 0

	for (let y = 0; y < ROWS; y++) {
		for (let x = 0; x < COLS; x++) {
			const key = `${x},${y}`
			if (water.has(key) || shore.has(key)) continue

			const roadDistance = distance[y * COLS + x] ?? 0
			if (roadDistance <= FOREST_ROAD_CLEARANCE) continue

			// Кромка гуляет: где-то лес подходит к дороге почти вплотную,
			// где-то отступает на несколько клеток.
			const edge =
				valueNoise(x / 9, y / 9, edgeSeed) * FOREST_EDGE_VARIANCE
			if (roadDistance <= FOREST_ROAD_CLEARANCE + edge) continue

			const meadow = valueNoise(x / 6 + 13.5, y / 6 + 7.25, meadowSeed)
			if (meadow < FOREST_CLEARING_THRESHOLD) continue

			// У самой кромки деревья стоят реже, в глубине — сплошной массив.
			const depth = roadDistance - FOREST_ROAD_CLEARANCE - edge
			const density = Math.min(1, 0.7 + depth / 2)
			if (random() > density) continue

			forest.push(key)
		}
	}

	return forest
}

// 4 дороги с разных сторон к воротам центрального замка.
export function createGameMap(seed: string | number): GameMap {
	const seedNumber = mapSeedToNumber(seed)
	const random = createSeededRandom(seedNumber)
	const roads = buildRoads(random)
	const waterCells = buildWaterCells(random, roads)
	const forestCells = buildForestCells(
		createSeededRandom(seedNumber ^ 0x9e3779b9),
		roads,
		waterCells,
	)

	const [castleX, castleY] = centerCell()

	return {
		roads,
		roadPoints: roads.map((road) => road.map(toPoint)),
		waterCells,
		forestCells,
		castle: {
			x: castleX,
			y: castleY,
			hp: INITIAL_LIVES,
		},
		spawners: [],
	}
}

export function boardPixelWidth() {
	return COLS * CELL_SIZE
}

export function boardPixelHeight() {
	return ROWS * CELL_SIZE
}
