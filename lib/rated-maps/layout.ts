import {
	CASTLE_SIZE,
	type MapSpawner,
	type SpawnerGrowth,
	type SpawnerTroop,
} from '../../features/game/engine/map/game-map.ts'
import {
	castleCellKeys,
	cellKey,
	type MapCastle,
	type MapDraft,
} from '../../features/game/engine/map/custom-map.ts'

// Карты рисуются по частям, а не переписываются клетка за клеткой:
// дороги — ломаными, реки — лентами, лес — пятнами. Так правка одной
// детали не разъезжается со всем остальным, а результат остаётся
// детерминированным: у шумов явный сид.

export type CellPoint = readonly [number, number]

export type BoardSize = {
	cols: number
	rows: number
}

// Тот же генератор, что и в тестах баланса: шум берегов и леса обязан
// повторяться при каждом прогоне.
export function mulberry32(seed: number) {
	let a = seed >>> 0

	return () => {
		a = (a + 0x6d2b79f5) >>> 0
		let t = Math.imul(a ^ (a >>> 15), 1 | a)
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function inside(x: number, y: number, size: BoardSize) {
	return x >= 0 && y >= 0 && x < size.cols && y < size.rows
}

// Клетки ортогонального участка между двумя точками.
function runCells(from: CellPoint, to: CellPoint): CellPoint[] {
	const [x0, y0] = from
	const [x1, y1] = to
	const dx = Math.sign(x1 - x0)
	const dy = Math.sign(y1 - y0)
	const cells: CellPoint[] = [[x0, y0]]

	let x = x0
	let y = y0

	while (x !== x1 || y !== y1) {
		// Участок обязан быть прямым; если точка ушла по обеим осям,
		// сначала идём по горизонтали, потом по вертикали.
		if (x !== x1) x += dx
		else if (y !== y1) y += dy
		cells.push([x, y])
	}

	return cells
}

// Ломаная из клеток: соседние точки должны сходиться под прямым углом.
export function polylineCells(points: readonly CellPoint[]): CellPoint[] {
	const cells: CellPoint[] = []

	for (let i = 0; i < points.length - 1; i++) {
		const part = runCells(points[i]!, points[i + 1]!)
		cells.push(...(i === 0 ? part : part.slice(1)))
	}

	if (cells.length === 0 && points[0]) cells.push(points[0])

	return cells
}

// Размножение множества клеток на квадрат радиуса — так считают
// охранные зоны дорог, казарм и радиус башни.
export function dilate(
	keys: ReadonlySet<string>,
	radius: number,
	size: BoardSize,
): Set<string> {
	const out = new Set<string>()

	for (const key of keys) {
		const [x, y] = key.split(',').map(Number)
		for (let dy = -radius; dy <= radius; dy++) {
			for (let dx = -radius; dx <= radius; dx++) {
				const nx = (x ?? 0) + dx
				const ny = (y ?? 0) + dy
				if (inside(nx, ny, size)) out.add(cellKey(nx, ny))
			}
		}
	}

	return out
}

// Пятно леса: радиус дрожит по углу, поэтому край выходит органичным,
// а не ровным кругом из сетки.
export function blobCells(
	center: CellPoint,
	radius: number,
	size: BoardSize,
	rand: () => number,
	wobble = 0.35,
): string[] {
	const [cx, cy] = center
	// Две гармоники с произвольной фазой: край то выдаётся языком,
	// то выкусывается бухтой.
	const phaseA = rand() * Math.PI * 2
	const phaseB = rand() * Math.PI * 2
	const lobeA = 2 + Math.floor(rand() * 3)
	const lobeB = 5 + Math.floor(rand() * 4)
	const cells: string[] = []

	for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
		for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
			if (!inside(x, y, size)) continue

			const dx = x + 0.5 - cx
			const dy = y + 0.5 - cy
			const distance = Math.hypot(dx, dy)
			if (distance > radius) continue

			const angle = Math.atan2(dy, dx)
			const edge =
				radius *
				(1 -
					wobble *
						(0.6 * Math.sin(lobeA * angle + phaseA) +
							0.4 * Math.sin(lobeB * angle + phaseB)))

			if (distance <= edge) cells.push(cellKey(x, y))
		}
	}

	return cells
}

// Река — лента вокруг ломаной: каждая клетка поля проверяется на
// расстояние до ближайшего участка. Концы получаются скруглёнными,
// как у проточного озера, а не срезанными по сетке.
export function bandCells(
	points: readonly CellPoint[],
	width: number,
	size: BoardSize,
	rand: () => number,
	// Частота «дыхания» берега. Карточка карты задаёт её один раз на все
	// русла, иначе две реки одного района выглядят разными протоками.
	lobe = 1 + rand(),
): string[] {
	const half = width / 2
	const wave = rand() * Math.PI * 2
	const cells: string[] = []

	for (let y = 0; y < size.rows; y++) {
		for (let x = 0; x < size.cols; x++) {
			const px = x + 0.5
			const py = y + 0.5
			let best = Infinity
			let along = 0

			for (let i = 0; i < points.length - 1; i++) {
				const [ax, ay] = points[i]!
				const [bx, by] = points[i + 1]!
				const vx = bx - ax
				const vy = by - ay
				const length = Math.hypot(vx, vy) || 1
				let t = ((px - ax) * vx + (py - ay) * vy) / (length * length)
				t = clamp(t, 0, 1)
				const distance = Math.hypot(px - (ax + vx * t), py - (ay + vy * t))

				if (distance < best) {
					best = distance
					along = t * length
				}
			}

			// Берег дышит: ширина ленты гуляет вдоль русла.
			const edge = half + 0.45 * Math.sin(lobe * Math.PI + wave + along * 0.35)
			if (best <= Math.max(0.6, edge)) cells.push(cellKey(x, y))
		}
	}

	return cells
}

export type SpawnerSpec = {
	x: number
	y: number
	troops: SpawnerTroop[]
	growth?: SpawnerGrowth
}

export type BoardBuilder = {
	size: BoardSize
	castle: (x: number, y: number, hp: number) => BoardBuilder
	spawner: (spec: SpawnerSpec, id?: string) => BoardBuilder
	road: (points: readonly CellPoint[]) => BoardBuilder
	river: (points: readonly CellPoint[], width: number) => BoardBuilder
	forest: (center: CellPoint, radius: number, wobble?: number) => BoardBuilder
	forestPatch: (cells: readonly string[]) => BoardBuilder
	draft: () => MapDraft
}

// Собирает черновик карты по кусочкам. Порядок слоев фиксирован:
// дорога всегда важнее воды и леса, поэтому ни одна казарма не остаётся
// отрезанной, а вдоль дорог всегда есть полоса для башен.
export function createBoard(
	size: BoardSize,
	seed: number,
	castleHp: number,
	castle: CellPoint,
): BoardBuilder {
	const road = new Set<string>()
	const water = new Set<string>()
	const forest = new Set<string>()
	const spawners: MapSpawner[] = []
	const rand = mulberry32(seed)
	const castleCenter: MapCastle = { x: castle[0], y: castle[1], hp: castleHp }
	// сколько гармоник у берега — фиксируем на всю карту, чтобы реки
	// разных районов выглядели одним руслом
	const alobe = 1 + rand()

	const keep = (cells: Iterable<string>, guards: ReadonlySet<string>[]) => {
		for (const key of cells) {
			if (guards.some((guard) => guard.has(key))) continue
			water.add(key)
		}
	}

	const builder: BoardBuilder = {
		size,
		castle(x, y, hp) {
			castleCenter.x = clamp(x, 1, size.cols - 2)
			castleCenter.y = clamp(y, 1, size.rows - 2)
			castleCenter.hp = hp
			return builder
		},
		spawner(spec, id) {
			const index = spawners.length + 1
			spawners.push({
				id: id ?? `s${index}-${spec.x}-${spec.y}`,
				x: spec.x,
				y: spec.y,
				troops: spec.troops,
				growth: spec.growth ?? { health: 0, speed: 0, count: 0 },
			})
			return builder
		},
		road(points) {
			for (const [x, y] of polylineCells(points)) {
				if (!inside(x, y, size)) continue
				road.add(cellKey(x, y))
			}
			// Вода и лес не имеют права перерезать нарисованную дорогу.
			for (const key of road) {
				water.delete(key)
				forest.delete(key)
			}
			return builder
		},
		river(points, width) {
			const protectedCells = new Set([
				...road,
				...castleCellKeys(castleCenter),
				...spawners.map((spawner) => cellKey(spawner.x, spawner.y)),
			])
			keep(bandCells(points, width, size, rand, alobe), [protectedCells])
			return builder
		},
		forest(center, radius, wobble) {
			const guards = [
				// Посевы леса не должны наступать на дорогу и на площадки
				// у неё: башне нужно место, поэтому коридор шире самого леса.
				dilate(road, 2, size),
				new Set(castleCellKeys(castleCenter)),
				dilate(new Set(spawners.map((s) => cellKey(s.x, s.y))), CASTLE_SIZE + 2, size),
				water,
			]
			for (const key of blobCells(center, radius, size, rand, wobble)) {
				if (guards.some((guard) => guard.has(key))) continue
				forest.add(key)
			}
			return builder
		},
		forestPatch(cells) {
			const guards = [road, new Set(castleCellKeys(castleCenter)), water]
			for (const key of cells) {
				if (guards.some((guard) => guard.has(key))) continue
				forest.add(key)
			}
			return builder
		},
		draft() {
			const occupied = new Set([
				...castleCellKeys(castleCenter),
				...spawners.map((s) => cellKey(s.x, s.y)),
			])

			return {
				version: 1,
				cols: size.cols,
				rows: size.rows,
				castle: { ...castleCenter },
				spawners: spawners.map((spawner) => ({ ...spawner })),
				waterCells: Array.from(water).filter((key) => !occupied.has(key)),
				forestCells: Array.from(forest).filter((key) => !occupied.has(key)),
				roadCells: Array.from(road).filter((key) => !occupied.has(key)),
				waves: { useCommon: true, waves: [] },
			}
		},
	}

	return builder
}

// Полоса свободно травы вдоль дорог: без неё игрок не может приткнуть
// башню у поворота, и карта кажется нечестной уже в первой волне.
export function roadBuildCorridor(draft: MapDraft, width = 3): Set<string> {
	return dilate(new Set(draft.roadCells), width, { cols: draft.cols, rows: draft.rows })
}

// Сколько башен помещается в зоне поражения дороги. Считаем по
// фактическим блокирующим клеткам карты, а не «на глаз».
export function buildSlots(draft: MapDraft, rangeCells: number): number {
	const size = { cols: draft.cols, rows: draft.rows }
	const blocked = new Set([
		...draft.roadCells,
		...draft.waterCells,
		...draft.forestCells,
		...(draft.castle ? castleCellKeys(draft.castle) : []),
		...draft.spawners.map((spawner) => cellKey(spawner.x, spawner.y)),
	])
	const inRange = dilate(new Set(draft.roadCells), rangeCells, size)
	const footprint = new Set<string>()

	// Площадка башни — 2×2 клетки, якорь верхняя левая.
	for (let y = 0; y < size.rows - 1; y++) {
		for (let x = 0; x < size.cols - 1; x++) {
			const cells = [
				cellKey(x, y),
				cellKey(x + 1, y),
				cellKey(x, y + 1),
				cellKey(x + 1, y + 1),
			]
			if (cells.some((key) => blocked.has(key))) continue
			if (!cells.some((key) => inRange.has(key))) continue
			// Пересекающиеся площадки одной клетки — это один и тот же
			// промах игрока, считаем независимые места.
			if (cells.some((key) => footprint.has(key))) {
				for (const key of cells) footprint.add(key)
				continue
			}
			for (const key of cells) footprint.add(key)
		}
	}

	return footprint.size / 4
}
