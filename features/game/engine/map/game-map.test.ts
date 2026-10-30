import assert from 'node:assert/strict'
import test from 'node:test'
import { COLS, ROWS } from '../../config/game.config.ts'
import {
	boardPixelHeight,
	boardPixelWidth,
	castleCells,
	centerCell,
	createGameMap,
	FOREST_ROAD_CLEARANCE,
	mapSeedToNumber,
	RIVER_COUNT,
	RIVER_MAX_SIZE,
} from './game-map.ts'

test('hashes seeds to stable unsigned numbers', () => {
	assert.equal(mapSeedToNumber('alpha'), mapSeedToNumber('alpha'))
	assert.notEqual(mapSeedToNumber('alpha'), mapSeedToNumber('beta'))
	assert.equal(mapSeedToNumber(-1), 0xffffffff)
	assert.ok(mapSeedToNumber('alpha') >= 0)
})

test('builds the same map for the same seed', () => {
	assert.deepEqual(createGameMap('resume-me'), createGameMap('resume-me'))
	assert.notDeepEqual(createGameMap('resume-me').roads, createGameMap('other').roads)
})

test('makes four roads from the edges to the castle gates', () => {
	const map = createGameMap(42)
	const [cx, cy] = centerCell()

	assert.equal(map.roads.length, 4)

	for (const road of map.roads) {
		const start = road[0]
		const end = road[road.length - 1]
		assert.ok(start && end)

		const startsOutside =
			start[0] < 0 || start[0] > COLS || start[1] < 0 || start[1] > ROWS
		assert.equal(startsOutside, true)

		const endsAtGate =
			(end[0] === cx && Math.abs(end[1] - cy) === 2) ||
			(end[1] === cy && Math.abs(end[0] - cx) === 2)
		assert.equal(endsAtGate, true)
	}
})

test('converts every road cell to a board point', () => {
	const map = createGameMap('points')

	assert.equal(map.roadPoints.length, map.roads.length)
	for (let i = 0; i < map.roads.length; i++) {
		assert.equal(map.roadPoints[i]?.length, map.roads[i]?.length)
	}

	assert.equal(boardPixelWidth(), COLS * 32)
	assert.equal(boardPixelHeight(), ROWS * 32)
})

test('scatters rivers inside the board', () => {
	const map = createGameMap('rivers')

	assert.ok(map.waterCells.length > 0)
	assert.equal(new Set(map.waterCells).size, map.waterCells.length)

	for (const key of map.waterCells) {
		const [x = -1, y = -1] = key.split(',').map(Number)
		assert.ok(x >= 0 && x < COLS && y >= 0 && y < ROWS, `river cell ${key} is outside the board`)
	}
})

test('keeps every river inside the size limit', () => {
	const map = createGameMap('rivers')
	const rivers = waterComponents(map.waterCells)

	assert.ok(rivers.length > 0)
	assert.ok(rivers.length <= RIVER_COUNT)

	for (const river of rivers) {
		const xs = river.map((key) => Number(key.split(',')[0]))
		const ys = river.map((key) => Number(key.split(',')[1]))
		const width = Math.max(...xs) - Math.min(...xs) + 1
		const height = Math.max(...ys) - Math.min(...ys) + 1

		assert.ok(width <= RIVER_MAX_SIZE, `river is ${width} cells wide`)
		assert.ok(height <= RIVER_MAX_SIZE, `river is ${height} cells tall`)
	}
})

test('leaves no dry holes inside rivers', () => {
	const map = createGameMap('rivers')
	const water = new Set(map.waterCells)

	// Заливаем сушу от края поля: всё недостижимое окружено водой.
	const seen = new Set<string>()
	const queue: Array<[number, number]> = []

	for (let x = 0; x < COLS; x++) queue.push([x, 0], [x, ROWS - 1])
	for (let y = 0; y < ROWS; y++) queue.push([0, y], [COLS - 1, y])

	while (queue.length > 0) {
		const [x, y] = queue.pop()!
		const key = `${x},${y}`

		if (!water.has(key) && !seen.has(key)) {
			seen.add(key)
		} else {
			continue
		}

		for (const [dx, dy] of CELL_NEIGHBORS) {
			const nx = x + dx
			const ny = y + dy
			if (nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS) queue.push([nx, ny])
		}
	}

	for (let y = 1; y < ROWS - 1; y++) {
		for (let x = 1; x < COLS - 1; x++) {
			const key = `${x},${y}`
			if (!water.has(key)) {
				assert.equal(seen.has(key), true, `dry hole at ${key}`)
			}
		}
	}
})

test('keeps a five-cell clearing around roads for towers', () => {
	const map = createGameMap('forest')
	const nearRoads = expandCells(
		[...roadLineCells(map.roads), ...castleCells()],
		FOREST_ROAD_CLEARANCE,
	)

	for (const key of map.forestCells) {
		const [x = -1, y = -1] = key.split(',').map(Number)
		assert.ok(x >= 0 && x < COLS && y >= 0 && y < ROWS, `forest cell ${key} is outside the board`)
		assert.equal(nearRoads.has(key), false, `forest cell ${key} blocks the build area`)
	}
})

test('keeps forest out of rivers and off their shores', () => {
	const map = createGameMap('forest')
	const water = new Set(map.waterCells)
	const shore = expandCells(water, 1)

	assert.equal(new Set(map.forestCells).size, map.forestCells.length)

	for (const key of map.forestCells) {
		assert.equal(water.has(key), false, `forest grows in water at ${key}`)
		assert.equal(shore.has(key), false, `forest covers the shore at ${key}`)
	}
})

test('fills the free ground with forest but leaves clearings', () => {
	const map = createGameMap('forest')
	const forest = new Set(map.forestCells)

	// Лес занимает заметную часть поля: порция считается от площади,
	// чтобы тест не зависел от выбранного базового размера карты.
	assert.ok(
		forest.size > COLS * ROWS * 0.2,
		`forest is too sparse: ${forest.size} cells`,
	)

	// Разнообразие по рядам: где-то лес разрывается поляной, а не лежит
	// сплошным прямоугольником.
	const runsByRow = new Map<number, number>()
	const sorted = map.forestCells
		.map((key) => key.split(',').map(Number) as [number, number])
		.sort((a, b) => a[1] - b[1] || a[0] - b[0])

	let previousRow = -1
	let previousX = -2
	let runs = 0

	for (const [x, y] of sorted) {
		if (y !== previousRow) {
			runs = 0
			previousX = -2
		}

		if (x !== previousX + 1) runs++

		runsByRow.set(y, runs)
		previousRow = y
		previousX = x
	}

	assert.ok(
		Array.from(runsByRow.values()).some((count) => count >= 3),
		'forest has no clearings: every row is a single solid run',
	)
})

test('keeps rivers off roads, the castle and each other', () => {
	const map = createGameMap('rivers')
	const dryCells = expandCells([...roadLineCells(map.roads), ...castleCells()], 1)

	for (const key of map.waterCells) {
		assert.equal(dryCells.has(key), false, `river cell ${key} touches a road`)
	}

	const rivers = waterComponents(map.waterCells).map((river) => new Set(river))

	for (let i = 0; i < rivers.length; i++) {
		const wet = expandCells(rivers[i]!, 1)

		for (let j = i + 1; j < rivers.length; j++) {
			for (const key of rivers[j]!) {
				assert.equal(wet.has(key), false, `river cell ${key} touches another river`)
			}
		}
	}
})

// Раскладывает клетки воды на связные фигуры.
function waterComponents(cells: string[]) {
	const remaining = new Set(cells)
	const components: string[][] = []

	while (remaining.size > 0) {
		const start = remaining.values().next().value as string
		remaining.delete(start)

		const queue = [start]
		const component: string[] = []

		while (queue.length > 0) {
			const key = queue.pop()!
			component.push(key)

			const [x = 0, y = 0] = key.split(',').map(Number)
			for (const [dx, dy] of CELL_NEIGHBORS) {
				const next = `${x + dx},${y + dy}`
				if (remaining.delete(next)) queue.push(next)
			}
		}

		components.push(component)
	}

	return components
}

const CELL_NEIGHBORS: Array<[number, number]> = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1],
]

function roadLineCells(roads: [number, number][][]) {
	const cells = new Set<string>()

	for (const road of roads) {
		for (let i = 0; i < road.length - 1; i++) {
			const [startX, startY] = road[i]!
			const [endX, endY] = road[i + 1]!
			const steps = Math.max(Math.abs(endX - startX), Math.abs(endY - startY))

			for (let step = 0; step <= steps; step++) {
				const t = step / Math.max(1, steps)
				cells.add(
					`${Math.round(startX + (endX - startX) * t)},${Math.round(startY + (endY - startY) * t)}`,
				)
			}
		}
	}

	return cells
}

function expandCells(cells: Iterable<string>, radius: number) {
	const result = new Set<string>()

	for (const key of cells) {
		const [x = 0, y = 0] = key.split(',').map(Number)

		for (let dy = -radius; dy <= radius; dy++) {
			for (let dx = -radius; dx <= radius; dx++) {
				result.add(`${x + dx},${y + dy}`)
			}
		}
	}

	return result
}
