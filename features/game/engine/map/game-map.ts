import { CELL_SIZE, COLS, ROWS } from '../../config/game.config.ts'

export type Road = [number, number][]
export type RoadPoint = { x: number; y: number }

export type GameMap = {
	roads: Road[]
	roadPoints: RoadPoint[][]
}

// Центр карты — здесь стоит замок, который защищает игрок.
export const CENTER_CELL: [number, number] = [
	Math.floor(COLS / 2),
	Math.floor(ROWS / 2),
]

// Замок занимает квадрат 3×3 клетки вокруг центра.
export const CASTLE_SIZE = 3
export const CASTLE_CELLS: string[] = (() => {
	const [cx, cy] = CENTER_CELL
	const cells: string[] = []
	const half = Math.floor(CASTLE_SIZE / 2)

	for (let dy = -half; dy <= half; dy++) {
		for (let dx = -half; dx <= half; dx++) {
			cells.push(`${cx + dx},${cy + dy}`)
		}
	}

	return cells
})()

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
	const [cx, cy] = CENTER_CELL

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

// 4 дороги с разных сторон к воротам центрального замка.
export function createGameMap(seed: string | number): GameMap {
	const random = createSeededRandom(mapSeedToNumber(seed))
	const roads = buildRoads(random)

	return {
		roads,
		roadPoints: roads.map((road) => road.map(toPoint)),
	}
}

export const CENTER_POINT = toPoint(CENTER_CELL)

export const BOARD_PIXEL_WIDTH = COLS * CELL_SIZE
export const BOARD_PIXEL_HEIGHT = ROWS * CELL_SIZE
