import { CELL_SIZE, COLS, ROWS } from '../../config/game.config'

export type Road = [number, number][]

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

// Случайное целое в диапазоне [min, max].
function randomInt(min: number, max: number) {
	const low = Math.min(min, max)
	const high = Math.max(min, max)
	return low + Math.floor(Math.random() * (high - low + 1))
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

// Возвращает все клетки, через которые проходит дорога.
function roadCells(road: Road): [number, number][] {
	const cells: [number, number][] = []

	for (let i = 0; i < road.length - 1; i++) {
		const [startX, startY] = road[i]
		const [endX, endY] = road[i + 1]

		const dx = endX - startX
		const dy = endY - startY
		const steps = Math.max(Math.abs(dx), Math.abs(dy))

		if (steps === 0) {
			cells.push([startX, startY])
			continue
		}

		for (let step = 0; step <= steps; step++) {
			cells.push([
				Math.round(startX + (dx * step) / steps),
				Math.round(startY + (dy * step) / steps),
			])
		}
	}

	return cells
}

// Дороги не должны пересекаться и обязаны отстоять друг от друга
// минимум на одну свободную клетку (расстояние Чебышёва >= 2).
function roadsAreSeparated(roads: Road[]): boolean {
	const cells = roads.map(roadCells)

	for (let first = 0; first < cells.length; first++) {
		for (let second = first + 1; second < cells.length; second++) {
			for (const [firstX, firstY] of cells[first]) {
				for (const [secondX, secondY] of cells[second]) {
					const distance = Math.max(
						Math.abs(firstX - secondX),
						Math.abs(firstY - secondY),
					)

					if (distance < 2) return false
				}
			}
		}
	}

	return true
}

// Строит случайный вариант 4 дорог, ведущих к воротам замка.
function buildRoads(): Road[] {
	const [cx, cy] = CENTER_CELL

	// Северная дорога: сверху, затем поворот к северным воротам.
	const northX = randomInt(2, COLS - 3)
	const northRow = randomInt(2, cy - 3)
	const north: Road = normalize([
		[northX, -2],
		[northX, northRow],
		[cx, northRow],
		[cx, cy - 2],
	])

	// Восточная дорога: справа, затем поворот к восточным воротам.
	const eastRow = randomInt(2, ROWS - 3)
	const eastCol = randomInt(cx + 3, COLS - 3)
	const east: Road = normalize([
		[COLS + 2, eastRow],
		[eastCol, eastRow],
		[eastCol, cy],
		[cx + 2, cy],
	])

	// Южная дорога: снизу, затем поворот к южным воротам.
	const southX = randomInt(2, COLS - 3)
	const southRow = randomInt(cy + 3, ROWS - 2)
	const south: Road = normalize([
		[southX, ROWS + 2],
		[southX, southRow],
		[cx, southRow],
		[cx, cy + 2],
	])

	// Западная дорога: слева, затем поворот к западным воротам.
	const westRow = randomInt(2, ROWS - 3)
	const westCol = randomInt(2, cx - 3)
	const west: Road = normalize([
		[-2, westRow],
		[westCol, westRow],
		[westCol, cy],
		[cx - 2, cy],
	])

	return [north, east, south, west]
}

// Запасной безопасный вариант на случай, если случайная генерация
// не найдёт подходящую раскладку за отведённое число попыток.
const FALLBACK_ROADS: Road[] = [
	[[4, -2], [4, 3], [12, 3], [12, 5]],
	[[26, 3], [19, 3], [19, 7], [14, 7]],
	[[20, 16], [20, 11], [12, 11], [12, 9]],
	[[-2, 11], [5, 11], [5, 7], [10, 7]],
]

// Генерирует 4 непересекающиеся дороги с четырёх сторон света.
// Все отрезки строго горизонтальные или вертикальные, поэтому
// построение клеток пути никогда не зацикливается.
function generateRoads(): Road[] {
	for (let attempt = 0; attempt < 300; attempt++) {
		const roads = buildRoads()

		if (roadsAreSeparated(roads)) {
			return roads
		}
	}

	return FALLBACK_ROADS
}

// 4 дороги с разных сторон к воротам центрального замка.
export const ROADS: Road[] = generateRoads()

function toPoint([x, y]: [number, number]) {
	return {
		x: x * CELL_SIZE + CELL_SIZE / 2,
		y: y * CELL_SIZE + CELL_SIZE / 2,
	}
}

// Пиксельные координаты всех дорог.
export const ROAD_POINTS = ROADS.map((road) => road.map(toPoint))

export const CENTER_POINT = toPoint(CENTER_CELL)

export const BOARD_PIXEL_WIDTH = COLS * CELL_SIZE
export const BOARD_PIXEL_HEIGHT = ROWS * CELL_SIZE
