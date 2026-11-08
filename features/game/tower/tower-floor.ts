import { INITIAL_LIVES } from '../config/game.config.ts'
import {
	cellKey,
	type MapDraft,
} from '../engine/map/custom-map.ts'
import type {
	MapSpawner,
	MapWave,
	MapWaves,
	SpawnerTroop,
} from '../engine/map/game-map.ts'
import {
	TOWER_BOSS_WAVES,
	TOWER_FLOOR_COLS,
	TOWER_FLOOR_ROWS,
	TOWER_FLOOR_WAVES,
	towerFloorSeed,
} from './tower-rules.ts'

export {
	TOWER_BOSS_WAVES,
	TOWER_FLOOR_COLS,
	TOWER_FLOOR_ROWS,
	TOWER_FLOOR_WAVES,
	isTowerFloorCompleted,
	towerFloorReward,
	towerFloorSeed,
} from './tower-rules.ts'

// Этаж башни — общая для всех игроков карта: поле 40×40, каменные стены
// по краю с окнами и пятнадцать волн. Карта генерируется один раз по
// номеру этажа и хранится в базе, поэтому у всех она одинаковая.

type WindowSide = 'top' | 'right' | 'bottom' | 'left'

type TowerWindow = {
	side: WindowSide
	x: number
	y: number
}

const SIDES: readonly WindowSide[] = ['top', 'right', 'bottom', 'left']

// Три окна на этаж: каждый следующий этаж теряет другую сторону, поэтому
// карты не повторяются, но всегда остаются проходимыми.
const WINDOWS_PER_FLOOR = 3

// Отступ окна от угла: стена должна оставаться цельной.
const WINDOW_MARGIN = 6

// Расстояние от края до внутренней дорожной полосы.
const ROAD_LANE = 5

export function buildTowerFloorDraft(floor: number): MapDraft {
	const safeFloor = Math.max(1, Math.trunc(floor))
	const random = createSeededRandom(hashSeed(towerFloorSeed(safeFloor)))

	const cols = TOWER_FLOOR_COLS
	const rows = TOWER_FLOOR_ROWS
	const centerX = Math.floor(cols / 2)
	const centerY = Math.floor(rows / 2)

	const windows = buildWindows(random, safeFloor, cols, rows)
	const windowKeys = new Set(windows.map((window) => cellKey(window.x, window.y)))

	const spawners: MapSpawner[] = windows.map((window, index) =>
		buildSpawner(window, index, safeFloor),
	)

	const roadCells = new Set<string>()
	for (const window of windows) {
		for (const key of windowRoad(window, cols, rows, centerX, centerY)) {
			roadCells.add(key)
		}
	}

	return {
		version: 1,
		cols,
		rows,
		castle: { x: centerX, y: centerY, hp: INITIAL_LIVES },
		spawners,
		waterCells: [],
		forestCells: [],
		wallCells: buildWalls(cols, rows, windowKeys),
		roadCells: Array.from(roadCells),
		waves: buildWaves(safeFloor),
	}
}

function buildWindows(
	random: () => number,
	floor: number,
	cols: number,
	rows: number,
): TowerWindow[] {
	const start = (floor - 1) % SIDES.length
	const windows: TowerWindow[] = []

	for (let index = 0; index < WINDOWS_PER_FLOOR; index++) {
		const side = SIDES[(start + index) % SIDES.length]
		if (!side) continue

		if (side === 'top' || side === 'bottom') {
			windows.push({
				side,
				x: randomInt(random, WINDOW_MARGIN, cols - 1 - WINDOW_MARGIN),
				y: side === 'top' ? 0 : rows - 1,
			})
		} else {
			windows.push({
				side,
				x: side === 'left' ? 0 : cols - 1,
				y: randomInt(random, WINDOW_MARGIN, rows - 1 - WINDOW_MARGIN),
			})
		}
	}

	return windows
}

function buildWalls(cols: number, rows: number, windows: ReadonlySet<string>) {
	const walls: string[] = []

	for (let y = 0; y < rows; y++) {
		for (let x = 0; x < cols; x++) {
			const border = x === 0 || y === 0 || x === cols - 1 || y === rows - 1
			if (!border) continue

			const key = cellKey(x, y)
			if (windows.has(key)) continue

			walls.push(key)
		}
	}

	return walls
}

function buildSpawner(
	window: TowerWindow,
	index: number,
	floor: number,
): MapSpawner {
	return {
		id: `tower-window-${index + 1}`,
		x: window.x,
		y: window.y,
		troops: buildTroops(floor),
		growth: { health: 0, speed: 0, count: 0 },
	}
}

// Состав волны на этаже. С ростом этажа монстров становится больше,
// а их характеристики поднимает план волн.
function buildTroops(floor: number): SpawnerTroop[] {
	const step = floor - 1

	return [
		{
			type: 'scout',
			count: 4 + Math.min(4, Math.floor(step / 4)),
			speed: 70,
			strength: 1,
			health: 100,
		},
		{
			type: 'brute',
			count: 1 + Math.min(3, Math.floor(step / 5)),
			speed: 48,
			strength: 2,
			health: 180,
		},
		{
			type: 'sprinter',
			count: 1 + Math.min(3, Math.floor(step / 6)),
			speed: 100,
			strength: 1,
			health: 70,
		},
	]
}

// План из пятнадцати волн: здоровье, скорость и количество растут от
// волны к волне и от этажа к этажу. Боссы отмечены на 10-й и 15-й.
function buildWaves(floor: number): MapWaves {
	const step = floor - 1
	const waves: MapWave[] = []

	for (let wave = 1; wave <= TOWER_FLOOR_WAVES; wave++) {
		const boss = TOWER_BOSS_WAVES.includes(wave)
		const bossBonus = boss ? 30 : 0

		waves.push({
			id: `tower-${floor}-${wave}`,
			health: Math.min(900, 100 + (wave - 1) * 16 + step * 10 + bossBonus),
			speed: Math.min(220, 100 + (wave - 1) * 4 + step * 2),
			count: Math.min(400, 100 + (wave - 1) * 8 + step * 5),
			...(boss ? { boss: true } : {}),
		})
	}

	return { useCommon: false, waves }
}

// Дорога от окна к замку: сначала внутрь поля, потом по внутренней
// полосе к оси замка и в его приёмную клетку. Углы дают узнаваемый
// рисунок этажа, а разные стороны не пересекаются.
function windowRoad(
	window: TowerWindow,
	cols: number,
	rows: number,
	centerX: number,
	centerY: number,
): string[] {
	const laneX = ROAD_LANE
	const laneY = ROAD_LANE
	const farLaneX = cols - 1 - ROAD_LANE
	const farLaneY = rows - 1 - ROAD_LANE

	if (window.side === 'top') {
		return expandPath([
			[window.x, window.y],
			[window.x, laneY],
			[centerX, laneY],
			[centerX, centerY - 2],
		])
	}

	if (window.side === 'bottom') {
		return expandPath([
			[window.x, window.y],
			[window.x, farLaneY],
			[centerX, farLaneY],
			[centerX, centerY + 2],
		])
	}

	if (window.side === 'left') {
		return expandPath([
			[window.x, window.y],
			[laneX, window.y],
			[laneX, centerY],
			[centerX - 2, centerY],
		])
	}

	return expandPath([
		[window.x, window.y],
		[farLaneX, window.y],
		[farLaneX, centerY],
		[centerX + 2, centerY],
	])
}

// Разворачивает углы дороги в клетки: каждая пара соседних точек даёт
// горизонтальный или вертикальный отрезок без пропусков.
function expandPath(points: Array<[number, number]>): string[] {
	const cells = new Set<string>()

	for (let index = 0; index < points.length - 1; index++) {
		const start = points[index]
		const end = points[index + 1]
		if (!start || !end) continue

		const [startX, startY] = start
		const [endX, endY] = end
		const steps = Math.max(Math.abs(endX - startX), Math.abs(endY - startY))

		for (let step = 0; step <= steps; step++) {
			const t = steps === 0 ? 0 : step / steps
			const x = Math.round(startX + (endX - startX) * t)
			const y = Math.round(startY + (endY - startY) * t)
			cells.add(cellKey(x, y))
		}
	}

	return Array.from(cells)
}

function hashSeed(text: string) {
	let hash = 0x811c9dc5

	for (let index = 0; index < text.length; index++) {
		hash ^= text.charCodeAt(index)
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

function randomInt(random: () => number, min: number, max: number) {
	const low = Math.min(min, max)
	const high = Math.max(min, max)
	return low + Math.floor(random() * (high - low + 1))
}
