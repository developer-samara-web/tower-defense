import type Phaser from 'phaser'

import { CELL_SIZE, COLS, ROWS } from '../../config/game.config'
import {
	CASTLE_CELLS,
	CASTLE_SIZE,
	CENTER_POINT,
	type GameMap,
} from '../map/game-map'

// Палитра Pixel Art D&D
const PIXEL_COLORS = {
	grassDark: 0x4a7f2a,
	grassLight: 0x6fa83c,
	grassBright: 0x80b64a,

	stone: 0x65513a,
	stoneDark: 0x40352a,
	stoneBorder: 0x89704a,
	stoneLight: 0xa18a5c,

	gold: 0xf3d477,
	goldDim: 0xd1bd68,
}

// Рисует всё игровое поле и возвращает множество клеток, занятых дорогой.
export function drawBoard(
	scene: Phaser.Scene,
	map: GameMap,
	seed = 1,
): Set<string> {
	drawGrass(scene)
	drawGrid(scene)
	drawEdgeShade(scene)

	const pathCells = drawPath(scene, map)
	drawRivers(scene, map)

	// Декор не рисуем ни на дороге, ни на воде.
	const occupiedCells = new Set(pathCells)
	for (const cell of map.waterCells) occupiedCells.add(cell)

	drawTerrainDetails(scene, occupiedCells, seed)
	drawPathEndpoints(scene, map)

	return pathCells
}

// Водные текстуры-канвасы пересоздаются при каждом старте сцены,
// поэтому старые ключи снимаем, чтобы они не копились.
const RIVER_TEXTURE_PREFIX = 'river-shape-'

// Текстура воды 800×800 крупнее клетки: уменьшаем её вдвое,
// чтобы рябь читалась в масштабе поля.
const RIVER_TEXTURE_SCALE = 0.5

// Берег: снаружи воды сначала тёмная тень, ближе к воде — мокрая земля,
// изнутри — светлая отмель. Вместе они дают плавный переход к траве
// вместо резкого стыка текстур.
const RIVER_BANK_MARGIN = 9
const RIVER_SHADOW_WIDTH = 7
const RIVER_SHADOW_COLOR = 'rgba(28, 54, 24, 0.28)'
const RIVER_SHORE_WIDTH = 3
const RIVER_SHORE_COLOR = 'rgba(108, 88, 50, 0.5)'
const RIVER_SHALLOW_WIDTH = 3.5
const RIVER_SHALLOW_COLOR = 'rgba(210, 250, 255, 0.38)'

// Водоёмы — связные фигуры из клеток. Рисуем их как дороги: круг
// в центре каждой клетки и перемычки к соседям, поэтому углы
// скруглены, а форма остаётся произвольной.
function drawRivers(scene: Phaser.Scene, map: GameMap) {
	if (map.waterCells.length === 0) return

	for (const key of scene.textures.getTextureKeys()) {
		if (key.startsWith(RIVER_TEXTURE_PREFIX)) scene.textures.remove(key)
	}

	for (const cells of groupWaterCells(map.waterCells)) {
		const image = createRiverImage(scene, cells)
		if (!image) continue

		scene.add
			.image(image.left, image.top, image.key)
			.setOrigin(0, 0)
			.setDepth(0.4)
	}
}

// Каждый водоём — отдельная картинка: текстура воды, обрезанная
// по форме фигуры, и береговая полоса вокруг неё.
function createRiverImage(
	scene: Phaser.Scene,
	cells: string[],
): { key: string; left: number; top: number } | null {
	const positions = cells.map(
		(cell) => cell.split(',').map(Number) as [number, number],
	)
	const minX = Math.min(...positions.map(([x]) => x))
	const maxX = Math.max(...positions.map(([x]) => x))
	const minY = Math.min(...positions.map(([, y]) => y))
	const maxY = Math.max(...positions.map(([, y]) => y))

	const shapeWidth = (maxX - minX + 1) * CELL_SIZE
	const shapeHeight = (maxY - minY + 1) * CELL_SIZE

	// Холст чуть больше фигуры: запас под береговую полосу.
	const left = minX * CELL_SIZE - RIVER_BANK_MARGIN
	const top = minY * CELL_SIZE - RIVER_BANK_MARGIN
	const width = shapeWidth + RIVER_BANK_MARGIN * 2
	const height = shapeHeight + RIVER_BANK_MARGIN * 2

	const key = `${RIVER_TEXTURE_PREFIX}${minX}-${minY}`
	const texture = scene.textures.createCanvas(key, width, height)
	if (!texture) return null

	const context = texture.getContext()
	const source = scene.textures
		.get('river')
		.getSourceImage() as HTMLImageElement
	const pattern = context.createPattern(source, 'repeat')
	if (!pattern) return null

	// Сдвигаем узор по положению водоёма на карте: так соседние
	// водоёмы не показывают одинаковый кусок текстуры. Сдвиг ограничен
	// периодом за вычетом размера водоёма, чтобы фигура целиком легла
	// внутрь одного повтора и на ней не было шва текстуры.
	const tile = source.width * RIVER_TEXTURE_SCALE
	pattern.setTransform(
		new DOMMatrix()
			.translate(
				-(left % Math.max(1, tile - width)),
				-(top % Math.max(1, tile - height)),
			)
			.scale(RIVER_TEXTURE_SCALE),
	)

	context.fillStyle = pattern
	context.fillRect(0, 0, width, height)

	const water = new Set(cells)

	// Оставляем текстуру только внутри формы, остальное — прозрачное.
	context.globalCompositeOperation = 'destination-in'
	context.fillStyle = '#ffffff'
	traceWaterShape(context, water, left, top, 0)
	context.fill()
	context.globalCompositeOperation = 'source-over'

	// Берег рисуем кольцами от края воды: сначала тень, затем
	// полоса мокрой земли, а отмель — уже поверх воды.
	const scratch = document.createElement('canvas')
	scratch.width = width
	scratch.height = height
	const scratchContext = scratch.getContext('2d')
	if (!scratchContext) return null

	paintWaterRing({
		context,
		scratchContext,
		water,
		offsetX: left,
		offsetY: top,
		width,
		height,
		outerExpand: RIVER_SHADOW_WIDTH,
		innerExpand: 0,
		color: RIVER_SHADOW_COLOR,
	})
	paintWaterRing({
		context,
		scratchContext,
		water,
		offsetX: left,
		offsetY: top,
		width,
		height,
		outerExpand: RIVER_SHORE_WIDTH,
		innerExpand: 0,
		color: RIVER_SHORE_COLOR,
	})
	paintWaterRing({
		context,
		scratchContext,
		water,
		offsetX: left,
		offsetY: top,
		width,
		height,
		outerExpand: 0,
		innerExpand: -RIVER_SHALLOW_WIDTH,
		color: RIVER_SHALLOW_COLOR,
		clipToWater: true,
	})

	texture.refresh()

	return { key, left, top }
}

// Рисует кольцо между двумя расширениями формы воды: полоса снаружи
// (outerExpand → innerExpand) или отмель внутри (0 → отрицательное
// расширение). Кольцо собираем на отдельном холсте, чтобы внутренние
// швы перемычек не попали на воду.
function paintWaterRing({
	context,
	scratchContext,
	water,
	offsetX,
	offsetY,
	width,
	height,
	outerExpand,
	innerExpand,
	color,
	clipToWater = false,
}: {
	context: CanvasRenderingContext2D
	scratchContext: CanvasRenderingContext2D
	water: ReadonlySet<string>
	offsetX: number
	offsetY: number
	width: number
	height: number
	outerExpand: number
	innerExpand: number
	color: string
	clipToWater?: boolean
}) {
	scratchContext.clearRect(0, 0, width, height)
	scratchContext.globalCompositeOperation = 'source-over'
	scratchContext.fillStyle = color
	traceWaterShape(scratchContext, water, offsetX, offsetY, outerExpand)
	scratchContext.fill()

	scratchContext.globalCompositeOperation = 'destination-out'
	traceWaterShape(scratchContext, water, offsetX, offsetY, innerExpand)
	scratchContext.fill()
	scratchContext.globalCompositeOperation = 'source-over'

	context.globalCompositeOperation = clipToWater ? 'source-atop' : 'source-over'
	context.drawImage(scratchContext.canvas, 0, 0)
	context.globalCompositeOperation = 'source-over'
}

// Форма воды: круг в клетке, перемычки к правому и нижнему соседу
// и заплатка на стыке четырёх клеток. positive expand расширяет форму,
// отрицательный — сужает (эрозия для отмели). Координаты — в пикселях
// холста водоёма, поэтому сдвигаем их на его левый верхний угол.
function traceWaterShape(
	context: CanvasRenderingContext2D,
	water: ReadonlySet<string>,
	offsetX: number,
	offsetY: number,
	expand: number,
) {
	const width = CELL_SIZE - 6
	const radius = width / 2 + expand
	const bridgeWidth = width + expand * 2

	// На стыке четырёх водных клеток между кругами и перемычками
	// остаётся квадратная дырка. Заливаем её с запасом, чтобы
	// не было шва на сглаженных краях.
	const notch = CELL_SIZE / 2 - radius + 1

	context.beginPath()

	for (const key of water) {
		const [x = 0, y = 0] = key.split(',').map(Number)
		const centerX = x * CELL_SIZE + CELL_SIZE / 2 - offsetX
		const centerY = y * CELL_SIZE + CELL_SIZE / 2 - offsetY

		context.moveTo(centerX + radius, centerY)
		context.arc(centerX, centerY, radius, 0, Math.PI * 2)

		if (water.has(`${x + 1},${y}`)) {
			context.rect(centerX, centerY - radius, CELL_SIZE, bridgeWidth)
		}

		if (water.has(`${x},${y + 1}`)) {
			context.rect(centerX - radius, centerY, bridgeWidth, CELL_SIZE)
		}

		// У сильно расширенной формы круги соседей уже перекрываются,
		// и заплатка не нужна — отрицательный размер не рисуем.
		if (
			notch > 0 &&
			water.has(`${x + 1},${y}`) &&
			water.has(`${x},${y + 1}`) &&
			water.has(`${x + 1},${y + 1}`)
		) {
			context.rect(
				centerX + CELL_SIZE / 2 - notch,
				centerY + CELL_SIZE / 2 - notch,
				notch * 2,
				notch * 2,
			)
		}
	}
}

// Делит клетки воды на связные фигуры: у каждой свой холст с текстурой.
function groupWaterCells(cells: string[]): string[][] {
	const remaining = new Set(cells)
	const groups: string[][] = []

	for (const start of cells) {
		if (!remaining.has(start)) continue

		const group: string[] = []
		const queue = [start]
		remaining.delete(start)

		while (queue.length > 0) {
			const cell = queue.pop() as string
			group.push(cell)

			const [x = 0, y = 0] = cell.split(',').map(Number)

			for (const [dx, dy] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1],
			] as const) {
				const neighbor = `${x + dx},${y + dy}`
				if (!remaining.has(neighbor)) continue

				remaining.delete(neighbor)
				queue.push(neighbor)
			}
		}

		groups.push(group)
	}

	return groups
}

// Мягкая тень по краю поля. Без неё яркая трава обрывается
// резкой линией о лесной фон, когда камера доезжает до границы мира.
function drawEdgeShade(scene: Phaser.Scene) {
	const graphics = scene.add.graphics()
	const width = COLS * CELL_SIZE
	const height = ROWS * CELL_SIZE

	// Ширина затемнения и количество ступеней градиента.
	const band = CELL_SIZE * 2
	const steps = 8
	const stepSize = band / steps

	for (let i = 0; i < steps; i++) {
		const alpha = 0.45 * (1 - i / steps)
		const offset = i * stepSize

		graphics.fillStyle(0x1e4b22, alpha)

		graphics.fillRect(offset, offset, width - offset * 2, stepSize)
		graphics.fillRect(
			offset,
			height - offset - stepSize,
			width - offset * 2,
			stepSize,
		)
		graphics.fillRect(offset, offset, stepSize, height - offset * 2)
		graphics.fillRect(
			width - offset - stepSize,
			offset,
			stepSize,
			height - offset * 2,
		)
	}

	graphics.setDepth(0.05)
}

// Рисует игровое поле с пиксельной текстурой.
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

// Клетки травы закрываем текстурой-тайлом: один спрайт на всё поле,
// поэтому повтор узора на карте 3200×3200 не стоит лишних вызовов.
function drawGrass(scene: Phaser.Scene) {
	const width = COLS * CELL_SIZE
	const height = ROWS * CELL_SIZE

	scene.add
		.tileSprite(0, 0, width, height, 'grass')
		.setOrigin(0, 0)
		.setDepth(0)
}

// Тонкая сетка по клеткам поверх текстуры травы. Тот же цвет
// и прозрачность, что были в процедурной траве, — поле читается по клеткам.
function drawGrid(scene: Phaser.Scene) {
	const width = COLS * CELL_SIZE
	const height = ROWS * CELL_SIZE
	const graphics = scene.add.graphics()

	graphics.lineStyle(1, 0x1e4b22, 0.18)

	for (let x = 0; x <= COLS; x++) {
		graphics.lineBetween(x * CELL_SIZE, 0, x * CELL_SIZE, height)
	}

	for (let y = 0; y <= ROWS; y++) {
		graphics.lineBetween(0, y * CELL_SIZE, width, y * CELL_SIZE)
	}

	graphics.setDepth(0.02)
}

// Текстура дороги 800×800: уменьшаем её в восемь раз, чтобы камни
// были размером с мелкие детали травы и ясно читались на клетке.
const PATH_TEXTURE_PREFIX = 'path-shape-'
const PATH_TEXTURE_SCALE = 0.05

// Скругление площадки под замком — меньше дорожных капсул.
const ROAD_PLATE_RADIUS = 2

// Рисует дороги текстурой камня и возвращает занятые ими клетки.
function drawPath(scene: Phaser.Scene, map: GameMap): Set<string> {
	// Канвасы прошлых запусков сцены не нужны, а ключи у них те же.
	for (const key of scene.textures.getTextureKeys()) {
		if (key.startsWith(PATH_TEXTURE_PREFIX)) scene.textures.remove(key)
	}

	const roadWidth = CELL_SIZE - 6
	const roadRadius = roadWidth / 2
	const shadowPad = 3

	// Тень по краю полотна лежит под всеми сегментами сразу: так на стыках
	// капсул не проступают тёмные дуги от соседних теней.
	const shadow = scene.add.graphics()
	shadow.fillStyle(0x1c3618, 0.22)
	shadow.setDepth(0.9)

	const drawShadow = (
		start: { x: number; y: number },
		end: { x: number; y: number },
	) => {
		if (start.x === end.x) {
			const top = Math.min(start.y, end.y)
			shadow.fillRoundedRect(
				start.x - roadRadius - shadowPad,
				top - roadRadius - shadowPad,
				roadWidth + shadowPad * 2,
				Math.abs(end.y - start.y) + roadWidth + shadowPad * 2,
				roadRadius + shadowPad,
			)
			return
		}

		const left = Math.min(start.x, end.x)
		shadow.fillRoundedRect(
			left - roadRadius - shadowPad,
			start.y - roadRadius - shadowPad,
			Math.abs(end.x - start.x) + roadWidth + shadowPad * 2,
			roadWidth + shadowPad * 2,
			roadRadius + shadowPad,
		)
	}

	let imageIndex = 0

	for (const originalPoints of map.roadPoints) {
		const points = getInsetRoadPoints(originalPoints)

		// Заводим конец дороги под площадку замка: её скруглённый торец
		// скрыт площадкой, и дорога примыкает к ней прямым краем.
		const last = points[points.length - 1]
		const previous = points[points.length - 2]
		const lastLength =
			Math.hypot(last.x - previous.x, last.y - previous.y) || 1
		const endOverlap = roadRadius + 4

		points[points.length - 1] = {
			x: last.x + ((last.x - previous.x) / lastLength) * endOverlap,
			y: last.y + ((last.y - previous.y) / lastLength) * endOverlap,
		}

		// Каждый сегмент — капсула со скруглёнными торцами. Соседние капсулы
		// перекрываются в общих точках, поэтому повороты тоже выходят круглыми.
		for (let i = 0; i < points.length - 1; i++) {
			drawShadow(points[i], points[i + 1])

			const image = createRoadSegment(
				scene,
				points[i],
				points[i + 1],
				`${PATH_TEXTURE_PREFIX}${imageIndex++}`,
			)
			if (!image) continue

			scene.add
				.image(image.left, image.top, image.key)
				.setOrigin(0, 0)
				.setDepth(1)
		}
	}

	//* Площадка 3×3 клетки под замком: сквозь прозрачные края
	//* спрайта крепости просвечивает дорога, а не трава. *
	const plateSize = CELL_SIZE * CASTLE_SIZE
	const plateLeft = CENTER_POINT.x - plateSize / 2
	const plateTop = CENTER_POINT.y - plateSize / 2

	shadow.fillRoundedRect(
		plateLeft - shadowPad,
		plateTop - shadowPad,
		plateSize + shadowPad * 1,
		plateSize + shadowPad * 1,
		ROAD_PLATE_RADIUS + shadowPad,
	)

	const plate = createRoadPlate(
		scene,
		plateLeft,
		plateTop,
		plateSize,
		`${PATH_TEXTURE_PREFIX}plate`,
	)

	if (plate) {
		scene.add
			.image(plate.left, plate.top, plate.key)
			.setOrigin(0, 0)
			.setDepth(1)
	}

	//* Возвращаем клетки пути для размещения башен и декора. *
	const pathCells = new Set<string>()

	for (const road of map.roads) {
		for (let i = 0; i < road.length - 1; i++) {
			addLineCells(pathCells, road[i], road[i + 1])
		}
	}

	// Замок занимает клетки в центре — строить на них нельзя.
	for (const cell of CASTLE_CELLS) {
		pathCells.add(cell)
	}

	return pathCells
}

// Капсула сегмента: канвас по габаритам и скруглённый прямоугольник
// как силуэт. Радиус равен половине ширины, поэтому торцы круглые.
function createRoadSegment(
	scene: Phaser.Scene,
	start: { x: number; y: number },
	end: { x: number; y: number },
	key: string,
) {
	const roadWidth = CELL_SIZE - 6
	const radius = roadWidth / 2

	if (start.x === end.x) {
		const left = Math.round(start.x - radius)
		const top = Math.round(Math.min(start.y, end.y) - radius)
		const width = Math.round(roadWidth)
		const height = Math.round(Math.abs(end.y - start.y) + roadWidth)

		return createRoadCanvas(scene, key, left, top, width, height, (context) => {
			context.roundRect(0, 0, width, height, radius)
		})
	}

	const left = Math.round(Math.min(start.x, end.x) - radius)
	const top = Math.round(start.y - radius)
	const width = Math.round(Math.abs(end.x - start.x) + roadWidth)
	const height = Math.round(roadWidth)

	return createRoadCanvas(scene, key, left, top, width, height, (context) => {
		context.roundRect(0, 0, width, height, radius)
	})
}

// Площадка под замком — прямоугольник с мягкими углами.
function createRoadPlate(
	scene: Phaser.Scene,
	left: number,
	top: number,
	size: number,
	key: string,
) {
	return createRoadCanvas(
		scene,
		key,
		Math.round(left),
		Math.round(top),
		Math.round(size),
		Math.round(size),
		(context) => {
			context.roundRect(0, 0, size, size, ROAD_PLATE_RADIUS)
		},
	)
}

// Заливает канвас текстурой камня и оставляет её только внутри силуэта.
// Узор привязан к мировым координатам, поэтому соседние сегменты
// продолжают друг друга без шва на стыке.
function createRoadCanvas(
	scene: Phaser.Scene,
	key: string,
	left: number,
	top: number,
	width: number,
	height: number,
	traceShape: (context: CanvasRenderingContext2D) => void,
): { key: string; left: number; top: number } | null {
	const texture = scene.textures.createCanvas(key, width, height)
	if (!texture) return null

	const context = texture.getContext()
	const source = scene.textures.get('path').getSourceImage() as HTMLImageElement
	const pattern = context.createPattern(source, 'repeat')
	if (!pattern) return null

	const tile = source.width * PATH_TEXTURE_SCALE
	pattern.setTransform(
		new DOMMatrix()
			.translate(-(left % tile), -(top % tile))
			.scale(PATH_TEXTURE_SCALE),
	)

	context.fillStyle = pattern
	context.fillRect(0, 0, width, height)

	context.globalCompositeOperation = 'destination-in'
	context.fillStyle = '#ffffff'
	context.beginPath()
	traceShape(context)
	context.fill()
	context.globalCompositeOperation = 'source-over'

	texture.refresh()

	return { key, left, top }
}

// Безопасно добавляет все клетки отрезка, включая концы.
// Ограниченное число шагов гарантирует отсутствие бесконечного цикла.
function addLineCells(
	cells: Set<string>,
	[startX, startY]: [number, number],
	[endX, endY]: [number, number],
) {
	const dx = endX - startX
	const dy = endY - startY
	const steps = Math.max(Math.abs(dx), Math.abs(dy))

	if (steps === 0) {
		cells.add(`${startX},${startY}`)
		return
	}

	for (let i = 0; i <= steps; i++) {
		const x = Math.round(startX + (dx * i) / steps)
		const y = Math.round(startY + (dy * i) / steps)
		cells.add(`${x},${y}`)
	}
}

// Пиксельный ландшафт: кусты, трава, камни в стиле D&D.
function drawTerrainDetails(
	scene: Phaser.Scene,
	pathCells: ReadonlySet<string>,
	seed: number,
) {
	const graphics = scene.add.graphics()
	const random = createSeededRandom(seed ^ 0x45d9f3b)

	graphics.setDepth(0.5)

	//* Декор рисуем только внутри игрового поля. *
	for (let y = 0; y < ROWS; y++) {
		for (let x = 0; x < COLS; x++) {
			if (pathCells.has(`${x},${y}`)) continue

			const centerX = x * CELL_SIZE + CELL_SIZE / 2
			const centerY = y * CELL_SIZE + CELL_SIZE / 2

			//* На большой карте декорируем чаще, чем раньше,
			//* чтобы поле не выглядело пустым. *
			if (random() > 0.12) continue

			const offsetX = (random() - 0.5) * CELL_SIZE * 0.45
			const offsetY = (random() - 0.5) * CELL_SIZE * 0.45

			const px = Math.floor(centerX + offsetX)
			const py = Math.floor(centerY + offsetY)

			const type = random()

			if (type < 0.55) {
				//* Пучок травы. *
				const grassColor =
					random() > 0.5
						? PIXEL_COLORS.grassDark
						: PIXEL_COLORS.grassLight

				graphics.fillStyle(grassColor, 0.85)

				const height = 4 + Math.floor(random() * 5)

				graphics.fillRect(px - 4, py, 2, height)
				graphics.fillRect(px, py - 3, 2, height + 3)
				graphics.fillRect(px + 3, py + 1, 2, height - 1)

				//* Светлые кончики травы. *
				graphics.fillStyle(PIXEL_COLORS.grassBright, 0.8)
				graphics.fillRect(px - 4, py, 2, 2)
				graphics.fillRect(px, py - 3, 2, 2)

			} else if (type < 0.78) {
				//* Камень с тенью и светлой гранью. *
				const size = 5 + Math.floor(random() * 5)

				graphics.fillStyle(PIXEL_COLORS.stoneDark, 0.8)
				graphics.fillRect(
					px - size / 2 + 1,
					py - size / 2 + 2,
					size,
					size - 1,
				)

				graphics.fillStyle(PIXEL_COLORS.stoneBorder, 1)
				graphics.fillRect(
					px - size / 2,
					py - size / 2,
					size,
					size - 1,
				)

				graphics.fillStyle(PIXEL_COLORS.stoneLight, 0.9)
				graphics.fillRect(
					px - size / 2 + 1,
					py - size / 2,
					Math.max(2, size - 3),
					2,
				)

			} else if (type < 0.92) {
				//* Полевой цветок с маленьким стеблем. *
				graphics.fillStyle(PIXEL_COLORS.grassDark, 1)
				graphics.fillRect(px, py, 2, 5)

				const flowerColor =
					random() > 0.5 ? 0xffe8a0 : 0xf4f0dc

				graphics.fillStyle(flowerColor, 1)
				graphics.fillRect(px - 2, py - 2, 5, 3)

				graphics.fillStyle(0xffffff, 1)
				graphics.fillRect(px, py - 2, 2, 2)

			} else {
				//* Небольшой участок мха. *
				graphics.fillStyle(PIXEL_COLORS.grassDark, 0.8)
				graphics.fillRect(px - 3, py, 4, 3)

				graphics.fillStyle(PIXEL_COLORS.grassBright, 0.85)
				graphics.fillRect(px + 1, py - 2, 4, 3)
				graphics.fillRect(px - 4, py - 2, 2, 2)
			}
		}
	}
}

// Во сколько раз спрайт крепости больше занимаемых ею клеток.
// Дорога и площадка под замком при этом не меняются.
const CASTLE_VISUAL_SCALE = 1.5

// На сколько пикселей поднять спрайт крепости относительно центра площадки.
const CASTLE_VISUAL_OFFSET_Y = 20

// Левая и правая казармы приподняты относительно точки входа на дорогу.
const GATE_VISUAL_OFFSET_Y: Record<string, number> = {
    'gate-left': 45,
    'gate-top': 40,
}

// Пиксельные ворота у входа на каждую дорогу и крепость в центре.
function drawPathEndpoints(scene: Phaser.Scene, map: GameMap) {
    const gateTextures = [
        'gate-bottom',
        'gate-left',
        'gate-right',
        'gate-top',
    ]

    map.roadPoints.forEach((originalPoints, index) => {
        const points = getInsetRoadPoints(originalPoints)
        const start = points[0]
        const texture = gateTextures[index]
        const offsetY = GATE_VISUAL_OFFSET_Y[texture] ?? 0

        scene.add
            .image(start.x, start.y - offsetY, texture)
            .setDisplaySize(CELL_SIZE * 4, CELL_SIZE * 4)
            .setDepth(2)
    })

    // Спрайт крепости крупнее своей площадки: дорога под замком
    // остаётся 3×3 клетки, а сама крепость выступает за её края.
    const castleSize = CELL_SIZE * CASTLE_SIZE * CASTLE_VISUAL_SCALE

    scene.add
        .image(CENTER_POINT.x, CENTER_POINT.y - CASTLE_VISUAL_OFFSET_Y, 'castle')
        .setDisplaySize(castleSize, castleSize)
        .setDepth(2)
}

function getInsetRoadPoints(
	points: { x: number; y: number }[],
) {
	const [start, next, ...rest] = points

	const dx = Math.sign(next.x - start.x)
	const dy = Math.sign(next.y - start.y)

	return [
		{
			x: start.x + dx * (CELL_SIZE * 5),
			y: start.y + dy * (CELL_SIZE * 5),
		},
		next,
		...rest,
	]
}

