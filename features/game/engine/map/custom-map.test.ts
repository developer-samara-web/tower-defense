import assert from 'node:assert/strict'
import test from 'node:test'
import {
	BOARD_SIZE_MAX,
	BOARD_SIZE_MIN,
	CELL_SIZE,
	COLS,
	DEFAULT_COLS,
	DEFAULT_ROWS,
	ROWS,
} from '../../config/game.config.ts'
import { CASTLE_BUILD_CLEARANCE } from '../../domain/game-rules.ts'
import { CASTLE_SIZE } from './game-map.ts'
import { MAP_LIMITS } from './custom-map.ts'
import {
	castleApproachCells,
	castleBuildCells,
	castleCellKeys,
	cellKey,
	createCustomGameMap,
	createEmptyMapDraft,
	canPlaceSpawner,
	draftRoadSegments,
	normalizeMapDraft,
	resizeMapDraft,
	spawnerRoads,
	validateDraft,
	type MapDraft,
	type SpawnerTroop,
} from './custom-map.ts'

const CASTLE = { x: 50, y: 50, hp: 100 }

const SCOUT: SpawnerTroop = { type: 'scout', count: 5, speed: 70, strength: 1, health: 100 }

function draft(overrides: Partial<MapDraft> = {}): MapDraft {
	return {
		...createEmptyMapDraft(),
		castle: { ...CASTLE },
		spawners: [
			{
				id: 'barracks-1',
				x: 30,
				y: 30,
				troops: [{ type: 'scout', count: 10, speed: 70, strength: 1, health: 100 }],
			},
		],
		...overrides,
	}
}

test('starts with a completely empty draft', () => {
	const empty = createEmptyMapDraft()

	assert.equal(empty.castle, null)
	assert.deepEqual(empty.spawners, [])
	assert.deepEqual(empty.waterCells, [])
	assert.deepEqual(empty.forestCells, [])
	assert.deepEqual(empty.roadCells, [])
	assert.equal(empty.waves.useCommon, true)
	assert.deepEqual(empty.waves.waves, [])
})

test('builds a road from every barracks to the castle', () => {
	const roads = spawnerRoads(draft())
	const road = roads[0]?.road

	assert.ok(road)
	assert.deepEqual(road[0], [30, 30])
	assert.equal(road.length >= 2, true)

	const approach = castleApproachCells(CASTLE)
	const end = road[road.length - 1]
	assert.ok(end)
	assert.equal(approach.has(cellKey(end[0], end[1])), true)

	// Каждый сегмент дороги идёт строго вдоль одной оси.
	for (let i = 1; i < road.length; i++) {
		const previous: [number, number] | undefined = road[i - 1]
		const current: [number, number] | undefined = road[i]
		assert.ok(previous && current)
		const straight: boolean = previous[0] === current[0] || previous[1] === current[1]
		assert.equal(straight, true)
	}
})

test('keeps roads out of water, forest and other barracks', () => {
	const water: string[] = []

	// Стена воды между казармой и замком: дорога должна её обойти,
	// а не пройти сквозь.
	for (let y = 20; y <= 45; y++) water.push(cellKey(40, y))

	const withWater = draft({ waterCells: water })
	const road = spawnerRoads(withWater)[0]?.road

	assert.ok(road)
	for (const [x, y] of road) {
		assert.equal(water.includes(cellKey(x, y)), false)
	}
	assert.equal(road[0]?.[0], 30)
})

test('reports a barracks sealed off from the castle', () => {
	const wall: string[] = []
	for (let y = 0; y < ROWS; y++) {
		for (let x = 0; x < COLS; x++) {
			const nearCastle = Math.abs(x - CASTLE.x) <= 2 && Math.abs(y - CASTLE.y) <= 2
			if (nearCastle && !(Math.abs(x - CASTLE.x) <= 1 && Math.abs(y - CASTLE.y) <= 1)) {
				wall.push(cellKey(x, y))
			}
		}
	}

	const roads = spawnerRoads(draft({ waterCells: wall }))
	assert.equal(roads[0]?.road, null)
	assert.equal(validateDraft(draft({ waterCells: wall })) !== null, true)
})

test('never lets a barracks stand next to the castle', () => {
	assert.equal(canPlaceSpawner(CASTLE, 52, 50), false)
	assert.equal(canPlaceSpawner(CASTLE, 51, 51), false)
	assert.equal(canPlaceSpawner(CASTLE, 53, 50), true)
	assert.equal(canPlaceSpawner(null, 10, 10), true)
})

test('castle keeps three free cells around its platform', () => {
	const blocked = castleBuildCells({ x: 50, y: 50 })
	// Площадка 3×3 плюс кольцо в три клетки: квадрат 9×9.
	const side = CASTLE_SIZE + CASTLE_BUILD_CLEARANCE * 2

	assert.equal(blocked.size, side * side)
	assert.equal(blocked.has(cellKey(50, 50)), true)
	assert.equal(blocked.has(cellKey(48, 52)), true)
	assert.equal(blocked.has(cellKey(50 + side / 2, 50)), false)
})

test('normalizes numbers, duplicates and terrain under the castle', () => {
	const normalized = normalizeMapDraft({
		castle: { x: 50, y: 50, hp: 0 },
		spawners: [
			{ id: 'a', x: 10, y: 10, type: 'brute', count: 9999, speed: -1, strength: 0, health: 5 },
			{ id: 'b', x: 10, y: 10, type: 'scout', count: 5, speed: 70, strength: 1, health: 100 },
			{ id: 'c', x: 50, y: 50, type: 'scout', count: 5, speed: 70, strength: 1, health: 100 },
		],
		waterCells: ['10,10', '50,50', '999,999', 'not-a-cell', '11,11'],
		forestCells: ['12,12'],
		roadCells: ['20,20', '11,11', '12,12', '50,50', '10,10', '999,999'],
	})

	assert.ok(normalized)
	assert.ok(normalized.castle)
	assert.equal(normalized.castle.hp, MAP_LIMITS.castleHpMin)

	assert.equal(normalized.spawners.length, 1)
	const spawner = normalized.spawners[0]
	assert.ok(spawner)
	assert.equal(spawner.x, 10)
	// Старые поля одного монстра превращаются в список из одного вида.
	assert.equal(spawner.troops.length, 1)
	assert.equal(spawner.troops[0]?.type, 'brute')
	assert.equal(spawner.troops[0]?.count, MAP_LIMITS.countMax)
	assert.equal(spawner.troops[0]?.speed, MAP_LIMITS.speedMin)
	assert.equal(spawner.troops[0]?.strength, MAP_LIMITS.strengthMin)
	assert.equal(spawner.troops[0]?.health, MAP_LIMITS.healthMin)

	assert.deepEqual(normalized.waterCells, ['11,11'])
	assert.deepEqual(normalized.forestCells, ['12,12'])
	// Дорога не хранится на воде, в лесу, под замком и казармой.
	assert.deepEqual(normalized.roadCells, ['20,20'])

	const occupied = new Set([...castleCellKeys(normalized.castle), '10,10'])
	for (const key of [...normalized.waterCells, ...normalized.forestCells]) {
		assert.equal(occupied.has(key), false)
	}

	const clamped = normalizeMapDraft({ castle: { x: -5, y: 500, hp: 100 } })
	assert.ok(clamped?.castle)
	assert.equal(clamped.castle.x >= 1 && clamped.castle.x <= COLS - 2, true)
	assert.equal(clamped.castle.y >= 1 && clamped.castle.y <= ROWS - 2, true)
})

test('keeps several monster types in one barracks', () => {
	const normalized = normalizeMapDraft({
		castle: { x: 50, y: 50, hp: 100 },
		spawners: [
			{
				id: 'a',
				x: 10,
				y: 10,
				troops: [
					{ type: 'scout', count: 5, speed: 70, strength: 1, health: 100 },
					{ type: 'brute', count: 3, speed: 50, strength: 2, health: 200 },
					// Повтор вида не создаёт второго монстра того же типа.
					{ type: 'scout', count: 9, speed: 70, strength: 1, health: 100 },
				],
			},
		],
	})

	const troops = normalized?.spawners[0]?.troops ?? []
	assert.deepEqual(
		troops.map((troop) => [troop.type, troop.count]),
		[
			['scout', 5],
			['brute', 3],
		],
	)
})

test('normalizes the wave plan', () => {
	const normalized = normalizeMapDraft({
		castle: { x: 50, y: 50, hp: 100 },
		spawners: [
			{ id: 'a', x: 10, y: 10, troops: [{ type: 'scout', count: 5, speed: 70, strength: 1, health: 100 }] },
		],
		waves: {
			useCommon: false,
			waves: [
				{ id: 'w1', health: 0, speed: 99_999, count: 120 },
				{ id: 'w2', health: 150, speed: 90, count: 50 },
			],
		},
	})

	assert.ok(normalized)
	assert.equal(normalized.waves.useCommon, false)
	assert.equal(normalized.waves.waves.length, 2)
	assert.equal(normalized.waves.waves[0]?.health, MAP_LIMITS.wavePercentMin)
	assert.equal(normalized.waves.waves[0]?.speed, MAP_LIMITS.wavePercentMax)
	assert.equal(normalized.waves.waves[0]?.count, 120)
	assert.equal(normalized.waves.waves[1]?.health, 150)

	// Старые карты без плана волн играют по общим параметрам.
	const legacy = normalizeMapDraft({ castle: { x: 50, y: 50, hp: 100 }, spawners: [] })
	assert.equal(legacy?.waves.useCommon, true)
	assert.deepEqual(legacy?.waves.waves, [])

	// Пустой список тоже означает общие параметры.
	const emptyPlan = normalizeMapDraft({
		castle: { x: 50, y: 50, hp: 100 },
		spawners: [],
		waves: { useCommon: false, waves: [] },
	})
	assert.equal(emptyPlan?.waves.useCommon, true)
})

test('rejects garbage instead of half-built drafts', () => {
	assert.equal(normalizeMapDraft(null), null)
	assert.equal(normalizeMapDraft('map'), null)
	assert.equal(normalizeMapDraft({ castle: { x: 'left', y: 5 } })?.castle, null)
})

test('turns the draft into a playable map and drops cut-off barracks', () => {
	const map = createCustomGameMap(
		draft({
			spawners: [
				...draft().spawners,
				{
					id: 'barracks-2',
					x: 55,
					y: 30,
					troops: [{ type: 'boss', count: 2, speed: 40, strength: 5, health: 900 }],
				},
			],
			waterCells: [
				cellKey(54, 30),
				cellKey(56, 30),
				cellKey(55, 29),
				cellKey(55, 31),
			],
		}),
	)

	assert.equal(map.roads.length, 1)
	assert.equal(map.spawners.length, 1)
	assert.equal(map.spawners[0]?.id, 'barracks-1')
	assert.equal(map.roadPoints.length, 1)
	assert.equal(map.roadPoints[0]?.length, map.roads[0]?.length)
	assert.deepEqual(map.castle, CASTLE)
})

test('validates a map before saving', () => {
	assert.equal(validateDraft(createEmptyMapDraft()), 'Сначала поставьте замок')
	assert.equal(validateDraft(draft({ spawners: [] })), 'Поставьте хотя бы одну казарму')
	assert.equal(validateDraft(draft()), null)
})

// Дорожка от казармы (30,30) вправо до x=48 и вниз до клетки (48,50),
// которая примыкает к замку с запада.
function corridorCells(): string[] {
	const cells: string[] = []

	for (let x = 30; x <= 48; x++) cells.push(cellKey(x, 30))
	for (let y = 31; y <= 50; y++) cells.push(cellKey(48, y))

	return cells
}

test('routes monsters only along painted road cells', () => {
	const painted = corridorCells()
	const roads = spawnerRoads(draft({ roadCells: painted }))
	const route = roads[0]?.road

	assert.ok(route)
	assert.deepEqual(route[0], [30, 30])

	const end = route[route.length - 1]
	assert.ok(end)
	assert.equal(end[0], 48)
	assert.equal(castleApproachCells(CASTLE).has(cellKey(end[0], end[1])), true)

	const allowed = new Set([...painted, '30,30'])
	for (const [x, y] of route) {
		assert.equal(allowed.has(cellKey(x, y)), true)
	}

	assert.equal(route.length >= 2, true)
})

test('reports barracks whose painted road does not reach the castle', () => {
	const deadEnd = corridorCells().filter((_, index) => index < 19)
	const cut = draft({ roadCells: deadEnd })

	assert.equal(spawnerRoads(cut)[0]?.road, null)
	assert.equal(validateDraft(cut), 'Казарма не соединена дорогой с замком')

	// Без нарисованных дорог по-прежнему работает автоматический маршрут.
	assert.ok(spawnerRoads(draft())[0]?.road)
})

test('draws painted road as a network of single segments', () => {
	assert.deepEqual(draftRoadSegments(draft()), [])

	const segments = draftRoadSegments(
		draft({ roadCells: ['10,10', '11,10', '11,11', '5,5'] }),
	)

	// Два ребра между соседями и точка для одиночной клетки.
	assert.equal(segments.length, 3)
	assert.equal(
		segments.some(
			([start, end]) => start[0] === 5 && start[1] === 5 && end[0] === 5 && end[1] === 5,
		),
		true,
	)
})

test('keeps painted roads in the game map and routes separately', () => {
	const painted = corridorCells()
	const map = createCustomGameMap(draft({ roadCells: painted }))
	const segments = draftRoadSegments(draft({ roadCells: painted }))

	assert.equal(map.spawners.length, 1)
	assert.equal(map.roadPoints.length, segments.length)
	assert.equal(map.routes?.length, 1)

	const route = map.routes?.[0]
	assert.ok(route)
	assert.deepEqual(route[0], {
		x: 30 * CELL_SIZE + CELL_SIZE / 2,
		y: 30 * CELL_SIZE + CELL_SIZE / 2,
	})
	const end = route[route.length - 1]
	assert.ok(end)
	assert.equal(
		castleApproachCells(CASTLE).has(
			cellKey(Math.floor(end.x / CELL_SIZE), Math.floor(end.y / CELL_SIZE)),
		),
		true,
	)

	// Каждая точка пути лежит на нарисованной дороге.
	const allowed = new Set(painted)
	for (const point of route) {
		const key = cellKey(
			Math.floor(point.x / CELL_SIZE),
			Math.floor(point.y / CELL_SIZE),
		)
		assert.equal(allowed.has(key) || key === '30,30', true)
	}

	// Автоматические маршруты маркер ручных дорог не получают.
	assert.equal(createCustomGameMap(draft()).routes, undefined)
})

test('resizes the board and drops what falls outside', () => {
	const wide = draft({
		castle: { x: 20, y: 20, hp: 100 },
		spawners: [
			{ id: 'a', x: 10, y: 10, troops: [SCOUT] },
			{ id: 'b', x: 90, y: 90, troops: [SCOUT] },
		],
		waterCells: ['5,5', '95,95'],
		forestCells: ['6,6', '120,3'],
		roadCells: ['7,7', '88,12'],
	})

	const { draft: small, removed } = resizeMapDraft(wide, 40, 40)

	assert.equal(small.cols, 40)
	assert.equal(small.rows, 40)
	assert.equal(small.spawners.length, 1)
	assert.equal(small.spawners[0]?.id, 'a')
	assert.deepEqual(small.waterCells, ['5,5'])
	assert.deepEqual(small.forestCells, ['6,6'])
	assert.deepEqual(small.roadCells, ['7,7'])
	assert.equal(removed, 4)
})

test('pulls the castle back inside the resized board', () => {
	const { draft: small } = resizeMapDraft(
		draft({ castle: { x: 70, y: 80, hp: 100 } }),
		40,
		40,
	)

	assert.ok(small.castle)
	assert.equal(small.castle.x >= 1 && small.castle.x <= 38, true)
	assert.equal(small.castle.y >= 1 && small.castle.y <= 38, true)
})

test('clamps a requested size to the board limits', () => {
	const { draft: clamped } = resizeMapDraft(draft(), 9999, 1)

	assert.equal(clamped.cols, BOARD_SIZE_MAX)
	assert.equal(clamped.rows, BOARD_SIZE_MIN)
})

test('reads the board size from saved data', () => {
	const normalized = normalizeMapDraft({
		cols: 60,
		rows: 45,
		castle: { x: 500, y: 500, hp: 100 },
		spawners: [{ id: 'a', x: 90, y: 44, troops: [SCOUT] }],
		waterCells: ['10,10', '80,80'],
	})

	assert.ok(normalized)
	assert.equal(normalized.cols, 60)
	assert.equal(normalized.rows, 45)
	assert.equal(normalized.spawners.length, 0)
	assert.deepEqual(normalized.waterCells, ['10,10'])
	assert.ok(normalized.castle)
	assert.equal(normalized.castle.x < 60 && normalized.castle.y < 45, true)
})

test('defaults a draft without a size to the standard board', () => {
	const legacy = normalizeMapDraft({ castle: { x: 10, y: 10, hp: 100 }, spawners: [] })

	assert.equal(legacy?.cols, DEFAULT_COLS)
	assert.equal(legacy?.rows, DEFAULT_ROWS)
})

test('routes barracks over the map size stored in the draft', () => {
	const small = draft({
		cols: 40,
		rows: 40,
		castle: { x: 20, y: 20, hp: 100 },
		spawners: [{ id: 'a', x: 5, y: 5, troops: [SCOUT] }],
	})

	const road = spawnerRoads(small)[0]?.road
	assert.ok(road)
	for (const [x, y] of road) {
		assert.equal(x >= 0 && x < 40 && y >= 0 && y < 40, true)
	}
})
