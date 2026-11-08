import type Phaser from 'phaser'

import { CELL_SIZE, COLS, ROWS } from '../../config/game.config'
import { CASTLE_SIZE, type GameMap } from '../map/game-map'
import {
	castleApproachCells,
	castleCellKeys,
	cellKey,
	isBoardCell,
} from '../map/custom-map'
import {
	applyPackTextures,
	PACK_DECOR,
	PACK_ROAD_TILE_SIZE,
	packRoadTexturesReady,
	packRoadTileKey,
} from './pack-textures'

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
	drawStaticBoard(scene)
	drawWallLayer(scene, map.wallCells, seed)
	drawForestLayer(scene, map.forestCells, seed)
	drawRiverLayer(scene, map.waterCells, seed)

	const pathCells = drawPath(scene, map, seed)

	// Декор не рисуем ни на дороге, ни на воде, ни под деревьями, ни на стенах.
	const occupiedCells = new Set(pathCells)
	for (const cell of map.waterCells) occupiedCells.add(cell)
	for (const cell of map.forestCells) occupiedCells.add(cell)
	for (const cell of map.wallCells ?? []) occupiedCells.add(cell)

	drawTerrainDetails(scene, occupiedCells, seed)
	scatterPackDecor(scene, occupiedCells, seed)
	drawPathEndpoints(scene, map)

	return pathCells
}

// Пустая карта: трава, сетка и затемнение по краю. Редактор
// дорисовывает на неё воду, лес, дороги и пропсы.
export function drawStaticBoard(scene: Phaser.Scene) {
	// Ковры пака подменяют текстуру поля и полотна дороги, поэтому их
	// собираем до первой отрисовки: за ними придут и дороги, и площадка
	// под замком.
	applyPackTextures(scene)

	drawGrass(scene)
	drawGrid(scene)
	drawEdgeShade(scene)
}

// Каменная стена этажа: сплошной пояс по краю поля. Клетки рисуем
// одной графикой, чтобы швы между прямоугольниками не складывались
// в сетку; кирпичная расшивка и случайный оттенок дают фактуру.
export function drawWallLayer(
	scene: Phaser.Scene,
	wallCells: string[] | undefined,
	seed: number,
) {
	if (!wallCells || wallCells.length === 0) return

	const random = createSeededRandom(seed ^ 0x2f6b1a3d)
	const graphics = scene.add.graphics().setDepth(0.55)

	for (const key of wallCells) {
		const [x = 0, y = 0] = key.split(',').map(Number)
		const left = x * CELL_SIZE
		const top = y * CELL_SIZE

		const shade = random() < 0.5 ? PIXEL_COLORS.stone : PIXEL_COLORS.stoneDark
		graphics.fillStyle(shade, 1)
		graphics.fillRect(left, top, CELL_SIZE, CELL_SIZE)

		// Верхняя грань светлее: стена читается объёмной даже без спрайтов.
		graphics.fillStyle(PIXEL_COLORS.stoneLight, 0.22)
		graphics.fillRect(left, top, CELL_SIZE, 3)

		graphics.lineStyle(1, PIXEL_COLORS.stoneDark, 0.55)
		graphics.lineBetween(left, top + CELL_SIZE / 2, left + CELL_SIZE, top + CELL_SIZE / 2)
		graphics.lineBetween(left + CELL_SIZE / 2, top, left + CELL_SIZE / 2, top + CELL_SIZE / 2)
		graphics.lineBetween(left, top + CELL_SIZE / 2, left + CELL_SIZE / 2, top + CELL_SIZE)
		graphics.lineBetween(left + CELL_SIZE / 2, top + CELL_SIZE / 2, left + CELL_SIZE, top + CELL_SIZE)

		graphics.lineStyle(1, PIXEL_COLORS.stoneBorder, 0.28)
		graphics.strokeRect(left + 0.5, top + 0.5, CELL_SIZE - 1, CELL_SIZE - 1)
	}
}

export function drawForestLayer(
	scene: Phaser.Scene,
	forestCells: string[],
	seed: number,
) {
	drawForest(scene, forestCells, seed)
}

export function drawRiverLayer(
	scene: Phaser.Scene,
	waterCells: string[],
	seed: number,
) {
	drawRivers(scene, waterCells, seed)
}

// Водные текстуры-канвасы пересоздаются при каждом старте сцены,
// поэтому старые ключи снимаем, чтобы они не копились.
const RIVER_TEXTURE_PREFIX = 'river-shape-'

// Текстура воды 800×800 крупнее клетки: уменьшаем её вдвое,
// чтобы рябь читалась в масштабе поля.
const RIVER_TEXTURE_SCALE = 0.15

// Берег: снаружи воды мягкая тень, затем полоса песка, а у самой кромки —
// потемневший мокрый песок и светлая отмель. Вместе они дают плавный
// переход к траве вместо резкого стыка текстур.
const RIVER_BANK_MARGIN = 18
const RIVER_SHADOW_WIDE_WIDTH = 16
const RIVER_SHADOW_WIDE_COLOR = 'rgba(28, 54, 24, 0.10)'
const RIVER_SHADOW_WIDTH = 11
const RIVER_SHADOW_COLOR = 'rgba(28, 54, 24, 0.14)'
const RIVER_SHORE_WIDTH = 9
const RIVER_SHORE_TEXTURE_KEY = 'river-bank'
const RIVER_WET_TEXTURE_KEY = 'river-bank-wet'
const RIVER_SHORE_TEXTURE_SCALE = 0.05
const RIVER_WET_WIDTH = 4
const RIVER_SHALLOW_WIDTH = 3.5
const RIVER_SHALLOW_COLOR = 'rgba(210, 250, 255, 0.38)'

// Берега из пака: те же плитки, что у дороги, поэтому река и дорога
// выглядят одним арт-сетом. Флаг держим — векторный берег остаётся рабочей
// fallback веткой, если пака в сцене нет.
const RIVER_PACK_BANK = true

// На сколько мирных пикселей паковая плитка свешивается за клетку: волна
// кромки залезает в соседнюю клетку.
const PACK_RIVER_OVERHANG = (PACK_ROAD_TILE_SIZE - CELL_SIZE) / 2

// Насколько силуэт воды отступает от внешнего края банки. Кромка плитки
// занимает ~4 px, остаток до песчаной банки.
const RIVER_PACK_WATER_INSET = 8

// Шаг морфологической эрозии: силуэт прорезаем пересечением копий маски,
// сдвинутых на пиксель в каждую из сторон.
const RIVER_EROSION_SHIFTS: ReadonlyArray<readonly [number, number]> = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1],
]

// Водоёмы — связные фигуры из клеток: у каждой свой холст. Берег либо
// из пака (плитки дороги, внутри которых прорезана вода), либо векторными
// кольцами вокруг формы.
function drawRivers(scene: Phaser.Scene, waterCells: string[], seed: number) {
	if (waterCells.length === 0) return

	for (const key of scene.textures.getTextureKeys()) {
		if (key.startsWith(RIVER_TEXTURE_PREFIX)) scene.textures.remove(key)
	}

	const groups = groupWaterCells(waterCells)
	const pack = RIVER_PACK_BANK && packRoadTexturesReady(scene)
	const vectorGroups: string[][] = []

	for (const cells of groups) {
		const image = createRiverImage(scene, cells, pack)
		if (!image) continue

		scene.add
			.image(image.left, image.top, image.key)
			.setOrigin(0, 0)
			.setDepth(0.4)

		if (!image.pack) vectorGroups.push(cells)
	}

	// Пучки травы нужны только векторным берегам: у пакового банки их роль
	// играет травяная кромка плитки.
	if (vectorGroups.length > 0) scatterRiverDressing(scene, vectorGroups, seed)
}

// Каждый водоём — отдельная картинка: текстура воды, обрезанная
// по форме фигуры, и береговая полоса вокруг неё.
function createRiverImage(
	scene: Phaser.Scene,
	cells: string[],
	usePack: boolean,
): { key: string; left: number; top: number; pack: boolean } | null {
	const positions = cells.map(
		(cell) => cell.split(',').map(Number) as [number, number],
	)
	const minX = Math.min(...positions.map(([x]) => x))
	const maxX = Math.max(...positions.map(([x]) => x))
	const minY = Math.min(...positions.map(([, y]) => y))
	const maxY = Math.max(...positions.map(([, y]) => y))

	const shapeWidth = (maxX - minX + 1) * CELL_SIZE
	const shapeHeight = (maxY - minY + 1) * CELL_SIZE

	// Холст чуть больше фигуры: запас под береговую полосу и под волну
	// пакового силуэта, свешивающуюся за крайние клетки.
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

	const water = new Set(cells)

	const scratch = document.createElement('canvas')
	scratch.width = width
	scratch.height = height
	const scratchContext = scratch.getContext('2d')
	if (!scratchContext) return null

	const pack =
		usePack &&
		drawPackRiverSurface(scene, context, scratchContext, water, source, left, top)

	if (!pack) {
		const pattern = createRiverPattern(context, source, left, top, width, height)
		if (!pattern) return null

		context.fillStyle = pattern
		context.fillRect(0, 0, width, height)

		// Оставляем текстуру только внутри формы, остальное — прозрачное.
		context.globalCompositeOperation = 'destination-in'
		context.fillStyle = '#ffffff'
		traceWaterShape(context, water, left, top, 0)
		context.fill()
		context.globalCompositeOperation = 'source-over'
	}

	// Тень набирается из двух колец: далёкое совсем прозрачное,
	// ближнее плотнее — край берега не обрывается в траву тёмной каймой.
	if (!pack) {
		paintWaterRing({
			context,
			scratchContext,
			water,
			offsetX: left,
			offsetY: top,
			width,
			height,
			outerExpand: RIVER_SHADOW_WIDE_WIDTH,
			innerExpand: 0,
			color: RIVER_SHADOW_WIDE_COLOR,
		})

		// Песок берега лежит на мировых координатах, как и вода: соседние
		// водоёмы продолжают друг друга, а текстура не плывёт при движении камеры.
		const bankSource = scene.textures
			.get(RIVER_SHORE_TEXTURE_KEY)
			.getSourceImage() as HTMLImageElement
		const wetSource = scene.textures
			.get(RIVER_WET_TEXTURE_KEY)
			.getSourceImage() as HTMLImageElement
		const bankPattern = createWorldPattern(
			scratchContext,
			bankSource,
			left,
			top,
			RIVER_SHORE_TEXTURE_SCALE,
		)
		const wetPattern = createWorldPattern(
			scratchContext,
			wetSource,
			left,
			top,
			RIVER_SHORE_TEXTURE_SCALE,
		)

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
		// Берег — не ровная кайма: по внешнему краю выкусываем песок
		// вразнобой, чтобы полоса тоньше прижималась к траве.
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
			pattern: bankPattern,
			decorate: (scratch) =>
				dressBankEdge(
					scratch,
					bankPattern,
					water,
					left,
					top,
					RIVER_SHORE_WIDTH,
				),
		})
		paintWaterRing({
			context,
			scratchContext,
			water,
			offsetX: left,
			offsetY: top,
			width,
			height,
			outerExpand: RIVER_WET_WIDTH,
			innerExpand: 0,
			pattern: wetPattern,
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
	}

	texture.refresh()

	return { key, left, top, pack }
}

// Узор воды привязываем к мировым координатам, а не к холсту водоёма,
// но сдвиг ограничиваем периодом за вычетом размера фигуры: водоём
// целиком ложится внутрь одного повтора, и шва на нём не видно.
function createRiverPattern(
	context: CanvasRenderingContext2D,
	source: HTMLImageElement,
	left: number,
	top: number,
	width: number,
	height: number,
): CanvasPattern | null {
	const pattern = context.createPattern(source, 'repeat')
	if (!pattern) return null

	const tile = source.width * RIVER_TEXTURE_SCALE
	pattern.setTransform(
		new DOMMatrix()
			.translate(
				-(left % Math.max(1, tile - width)),
				-(top % Math.max(1, tile - height)),
			)
			.scale(RIVER_TEXTURE_SCALE),
	)

	return pattern
}

// Паковый берег собирается из дорожных плиток, поэтому река и дорога
// выглядят одним арт-сетом. Воду кладём не на весь песок, а внутрь него:
// маску силуэта эродируем на ширину банки. Эрозия — пересечение копий,
// сдвинутых на пиксель, поэтому отступ одинаков вдоль всего края и
// скругления на поворотах сохраняются.
function drawPackRiverSurface(
	scene: Phaser.Scene,
	context: CanvasRenderingContext2D,
	maskContext: CanvasRenderingContext2D,
	water: ReadonlySet<string>,
	source: HTMLImageElement,
	left: number,
	top: number,
): boolean {
	const width = context.canvas.width
	const height = context.canvas.height

	maskContext.clearRect(0, 0, width, height)
	if (!drawPackRiverBank(scene, maskContext, water, left, top)) return false

	context.drawImage(maskContext.canvas, 0, 0)

	const copy = document.createElement('canvas')
	copy.width = width
	copy.height = height
	const copyContext = copy.getContext('2d')
	if (!copyContext) return false

	for (let inset = 0; inset < RIVER_PACK_WATER_INSET; inset += 1) {
		copyContext.clearRect(0, 0, width, height)
		copyContext.drawImage(maskContext.canvas, 0, 0)
		maskContext.globalCompositeOperation = 'destination-in'

		for (const [dx, dy] of RIVER_EROSION_SHIFTS) {
			maskContext.drawImage(copy, dx, dy)
		}

		maskContext.globalCompositeOperation = 'source-over'
	}

	// Внутри эродированной маски узор воды лежит на тех же мировых
	// координатах, что и у векторного берега.
	const pattern = createRiverPattern(maskContext, source, left, top, width, height)
	if (!pattern) return false

	maskContext.globalCompositeOperation = 'source-atop'
	maskContext.fillStyle = pattern
	maskContext.fillRect(0, 0, width, height)
	maskContext.globalCompositeOperation = 'source-over'

	context.drawImage(maskContext.canvas, 0, 0)

	return true
}

// Плитка на клетку: банка берётся той же маской соседей, что и дорога,
// поэтому кромка обходит изгиб русла без швов.
function drawPackRiverBank(
	scene: Phaser.Scene,
	context: CanvasRenderingContext2D,
	water: ReadonlySet<string>,
	left: number,
	top: number,
): boolean {
	for (const key of water) {
		const [x = 0, y = 0] = key.split(',').map(Number)
		const tileKey = packRoadTileKey(roadNeighborMask(water, x, y), scene)
		if (!tileKey) return false

		const tile = scene.textures.get(tileKey).getSourceImage()
		if (!tile) return false

		context.drawImage(
			tile as CanvasImageSource,
			x * CELL_SIZE - PACK_RIVER_OVERHANG - left,
			y * CELL_SIZE - PACK_RIVER_OVERHANG - top,
			PACK_ROAD_TILE_SIZE,
			PACK_ROAD_TILE_SIZE,
		)
	}

	return true
}

// Рисует кольцо между двумя расширениями формы воды: полоса снаружи
// (outerExpand → innerExpand) или отмель внутри (0 → отрицательное
// расширение). Кольцо собираем на отдельном холсте, чтобы внутренние
// швы перемычек не попали на воду. Заливка — цвет или текстура.
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
	pattern,
	clipToWater = false,
	decorate,
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
	color?: string
	pattern?: CanvasPattern | null
	clipToWater?: boolean
	decorate?: (scratchContext: CanvasRenderingContext2D) => void
}) {
	scratchContext.clearRect(0, 0, width, height)
	scratchContext.globalCompositeOperation = 'source-over'
	scratchContext.fillStyle = pattern ?? color ?? '#000000'
	traceWaterShape(scratchContext, water, offsetX, offsetY, outerExpand)
	scratchContext.fill()

	scratchContext.globalCompositeOperation = 'destination-out'
	traceWaterShape(scratchContext, water, offsetX, offsetY, innerExpand)
	scratchContext.fill()
	scratchContext.globalCompositeOperation = 'source-over'

	decorate?.(scratchContext)

	context.globalCompositeOperation = clipToWater ? 'source-atop' : 'source-over'
	context.drawImage(scratchContext.canvas, 0, 0)
	context.globalCompositeOperation = 'source-over'
}

// Береговая полоса не должна выглядеть как ровная кайма: по внешнему краю
// песок то выкусывается впадинками, то выплёскивается языками на траву.
// Глубже воды не режем и в воду не залезаем.
function dressBankEdge(
	context: CanvasRenderingContext2D,
	pattern: CanvasPattern | null,
	water: ReadonlySet<string>,
	offsetX: number,
	offsetY: number,
	expand: number,
) {
	const half = (CELL_SIZE - 6) / 2

	context.save()

	// Языки песка, выступающие за основную полосу.
	context.globalCompositeOperation = 'source-over'
	context.fillStyle = pattern ?? 'rgba(200, 176, 139, 0.9)'
	context.beginPath()

	for (const [direction, [dx, dy]] of RIVER_EDGE_DIRECTIONS.entries()) {
		for (const key of water) {
			const [x = 0, y = 0] = key.split(',').map(Number)
			if (water.has(`${x + dx},${y + dy}`)) continue
			if (edgeNoise(x + 5, y - 3, direction) > 0.45) continue

			const radius = 2.5 + edgeNoise(x + 11, y + 7, direction) * 2.5
			const extra = 1 + edgeNoise(x - 7, y - 13, direction) * 3
			const distance = half + expand + extra - radius
			const centerX = x * CELL_SIZE + CELL_SIZE / 2 - offsetX + dx * distance
			const centerY = y * CELL_SIZE + CELL_SIZE / 2 - offsetY + dy * distance

			context.moveTo(centerX + radius, centerY)
			context.arc(centerX, centerY, radius, 0, Math.PI * 2)
		}
	}

	context.fill()

	// Языки не должны залезать в водоём: возвращаем воду на место.
	context.globalCompositeOperation = 'destination-out'
	traceWaterShape(context, water, offsetX, offsetY, 0)
	context.fill()

	// Впадинки по самому краю полосы.
	context.beginPath()

	for (const [direction, [dx, dy]] of RIVER_EDGE_DIRECTIONS.entries()) {
		for (const key of water) {
			const [x = 0, y = 0] = key.split(',').map(Number)
			if (water.has(`${x + dx},${y + dy}`)) continue
			if (edgeNoise(x, y, direction) > 0.55) continue

			const radius = 1.8 + edgeNoise(x - 23, y + 17, direction) * 1.4
			const distance = half + expand - radius - 1
			const centerX = x * CELL_SIZE + CELL_SIZE / 2 - offsetX + dx * distance
			const centerY = y * CELL_SIZE + CELL_SIZE / 2 - offsetY + dy * distance

			context.moveTo(centerX + radius, centerY)
			context.arc(centerX, centerY, radius, 0, Math.PI * 2)
		}
	}

	context.fill()
	context.restore()
}

// Стабильный псевдослучайный шум по координатам клетки и направлению:
// берег одинаков при каждом перезапуске сцены и не зависит от порядка обхода.
function edgeNoise(x: number, y: number, direction: number) {
	let hash = Math.imul(x + 0x9e37, 0x85ebca6b)
	hash = Math.imul(hash ^ (y + 0xc2b2), 0xc2b2ae35)
	hash = Math.imul(hash ^ (direction + 0x27d4), 0x27d4eb2f)

	return ((hash ^ (hash >>> 15)) >>> 0) / 4294967296
}

// Узор привязываем к мировым координатам, а не к холсту водоёма:
// одинаковая текстура на соседних водоёмах продолжается без сдвига,
// а при движении камеры рисунок остаётся на месте.
function createWorldPattern(
	context: CanvasRenderingContext2D,
	source: HTMLImageElement,
	offsetX: number,
	offsetY: number,
	scale: number,
): CanvasPattern | null {
	const pattern = context.createPattern(source, 'repeat')
	if (!pattern) return null

	const tile = source.width * scale
	pattern.setTransform(
		new DOMMatrix()
			.translate(-(offsetX % tile), -(offsetY % tile))
			.scale(scale),
	)

	return pattern
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

const RIVER_EDGE_DIRECTIONS: Array<[number, number]> = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1],
]

// Пучки травы и камешки по кромке водоёмов: перекрывают ровную границу
// воды и травы так же, как декор по краям дорог.
function scatterRiverDressing(
	scene: Phaser.Scene,
	groups: string[][],
	seed: number,
) {
	const random = createSeededRandom(seed ^ 0x7bd4c2a9)
	const half = (CELL_SIZE - 6) / 2
	const placed: Array<[number, number]> = []

	const isFree = (x: number, y: number, distance: number) =>
		placed.every(([px, py]) => Math.hypot(px - x, py - y) >= distance)

	for (const cells of groups) {
		const water = new Set(cells)

		for (const key of cells) {
			const [x = 0, y = 0] = key.split(',').map(Number)
			const centerX = x * CELL_SIZE + CELL_SIZE / 2
			const centerY = y * CELL_SIZE + CELL_SIZE / 2

			for (const [dx, dy] of RIVER_EDGE_DIRECTIONS) {
				if (water.has(`${x + dx},${y + dy}`)) continue

				const edgeX = centerX + dx * half
				const edgeY = centerY + dy * half

				// Трава растёт снаружи, нависая над водой.
				if (random() < 0.55) {
					const offset = 3 + random() * 4
					const along = (random() - 0.5) * 14
					const px = edgeX + dx * offset - dy * along
					const py = edgeY + dy * offset + dx * along

					if (isFree(px, py, 26)) {
						placed.push([px, py])
						const texture =
							ROAD_FRINGE_TEXTURES[
								Math.floor(random() * ROAD_FRINGE_TEXTURES.length)
							]
						const size = 20 + random() * 9

						scene.add
							.image(px, py, texture)
							.setDisplaySize(size, size)
							.setFlipX(random() > 0.5)
							.setDepth(0.45)
					}
				}

				// Камешки лежат на илистой кромке берега.
				if (random() < 0.3) {
					const offset = 1 + random() * 4
					const along = (random() - 0.5) * 10
					const px = edgeX + dx * offset - dy * along
					const py = edgeY + dy * offset + dx * along

					if (isFree(px, py, 34)) {
						placed.push([px, py])
						const texture =
							ROAD_PEBBLE_TEXTURES[
								Math.floor(random() * ROAD_PEBBLE_TEXTURES.length)
							]
						const size = 10 + random() * 5

						scene.add
							.image(px, py, texture)
							.setDisplaySize(size, size)
							.setFlipX(random() > 0.5)
							.setDepth(0.42)
					}
				}
			}
		}
	}
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

// Лес: один атлас на все деревья. Так тысячи спрайтов делят одну текстуру
// и складываются в общий батч, а не грузят видеокарту тысячами вызовов.
const FOREST_ATLAS_KEY = 'forest-atlas'
const FOREST_FRAMES_KEY = 'forest-frames'

type ForestVariant = {
	frame: string
	width: number
	height: number
}

// Габариты кадра атласа; сам ствол с кроной чуть меньше из-за полей.
const FOREST_VARIANTS: ForestVariant[] = [
	{ frame: 'oak', width: 62, height: 66 },
	{ frame: 'pine', width: 42, height: 78 },
	{ frame: 'bush', width: 35, height: 48 },
]

// Пустых клеток почти не остаётся, а купы собираются из двух-трёх
// деревьев: лес должен читаться стеной, а не редким посадочным рядком.
const FOREST_TREE_SKIP = 0.05
const FOREST_SECOND_TREE = 0.62
const FOREST_THIRD_TREE = 0.3
const FOREST_DEPTH_MIN = 0.6
const FOREST_DEPTH_MAX = 0.78

// Кадры деревьев регистрируются при первом запуске сцены: атлас грузится
// одной картинкой, а рамки к нему приходят из JSON.
function ensureForestFrames(scene: Phaser.Scene) {
	if (!scene.textures.exists(FOREST_ATLAS_KEY)) return false

	const texture = scene.textures.get(FOREST_ATLAS_KEY)
	const data = scene.cache.json.get(FOREST_FRAMES_KEY) as
		| { frames?: Record<string, { x: number; y: number; w: number; h: number }> }
		| undefined

	for (const [name, frame] of Object.entries(data?.frames ?? {})) {
		if (texture.has(name)) continue
		texture.add(name, 0, frame.x, frame.y, frame.w, frame.h)
	}

	return FOREST_VARIANTS.every((variant) => texture.has(variant.frame))
}

// Сажаем лес по клеткам карты, но не по одной на клетку: позиции смещены,
// размеры разные, поэтому рядов и ровных шеренг не видно.
function drawForest(scene: Phaser.Scene, forestCells: string[], seed: number) {
	if (forestCells.length === 0) return
	if (!ensureForestFrames(scene)) return

	const random = createSeededRandom(seed ^ 0x3c6ef372)

	for (const key of forestCells) {
		if (random() < FOREST_TREE_SKIP) continue

		const [x = 0, y = 0] = key.split(',').map(Number)
		const centerX = x * CELL_SIZE + CELL_SIZE / 2
		const centerY = y * CELL_SIZE + CELL_SIZE / 2

		plantTree(scene, random, centerX, centerY, 1, 1)

		// Подлесок в той же купе: ниже ростом и ближе к стволу соседа,
		// поэтому купы сливаются в сплошную стену, а не в сетку клеток.
		if (random() < FOREST_SECOND_TREE) {
			plantTree(scene, random, centerX, centerY, 0.62, 0.7)
		}

		if (random() < FOREST_THIRD_TREE) {
			plantTree(scene, random, centerX, centerY, 0.5, 0.55)
		}
	}
}

function plantTree(
	scene: Phaser.Scene,
	random: () => number,
	centerX: number,
	centerY: number,
	scale: number,
	spread: number,
) {
	const pick = random()
	const variant =
		pick < 0.5
			? FOREST_VARIANTS[0]
			: pick < 0.86
				? FOREST_VARIANTS[1]
				: FOREST_VARIANTS[2]
	if (!variant) return

	const size = scale * (0.85 + random() * 0.35)
	const x = centerX + (random() - 0.5) * CELL_SIZE * 0.6 * spread
	const y = centerY + (random() - 0.5) * CELL_SIZE * 0.5 * spread

	// Сортировка по Y: нижние деревья перекрывают верхние и лес читается объёмно.
	const depth =
		FOREST_DEPTH_MIN +
		(y / (ROWS * CELL_SIZE)) * (FOREST_DEPTH_MAX - FOREST_DEPTH_MIN)

	scene.add
		.image(x, y, FOREST_ATLAS_KEY, variant.frame)
		.setOrigin(0.5, 0.97)
		.setDisplaySize(variant.width * size, variant.height * size)
		.setFlipX(random() > 0.5)
		.setDepth(depth)
}

// Полотно дороги: без пака это камень 800×800, с паком — ковёр 512×512
// из песчаных плиток. Масштаб держит одну плитку пака примерно в две
// клетки поля: при 0.25 ковёр кладётся периодом в 128 пикселей, и
// песчинки остаются читаемыми на 26-пиксельной дороге.
const PATH_TEXTURE_PREFIX = 'path-shape-'
const PATH_TEXTURE_SCALE = 0.25

// Старая кромка дороги: тёмная полоса утоптанной земли, в которую
// нарисованы трава и камешки, плюс отдельные пучки и галька поверх
// границы полотна. Под песок из пака она не подходит — по краям
// дороги остаются зелёные полудиски старой травы. Код и текстуры
// сохранены: флаг возвращает прежний край одним значением.
const ROAD_EDGE_DECOR = false

// Кромка дороги: полоса утоптанной земли с травой и камешками.
// Канвасы кромки тоже пересоздаются при каждом запуске сцены.
const ROAD_SHOULDER_TEXTURE_PREFIX = 'road-shoulder-'
const ROAD_SHOULDER_TEXTURE_KEY = 'road-edge'
const ROAD_SHOULDER_TEXTURE_SCALE = 0.15
const ROAD_SHOULDER_WIDTH = 7

// Декор, который смягчает стык полотна с травой: пучки травы,
// свисающие на дорогу, и камешки у самой кромки.
const ROAD_FRINGE_TEXTURES = [
	'road-grass-fringe-1',
	'road-grass-fringe-2',
	'road-grass-fringe-3',
	'road-grass-fringe-4',
]
const ROAD_PEBBLE_TEXTURES = [
	'road-pebbles-1',
	'road-pebbles-2',
	'road-pebbles-3',
]
const ROAD_FRINGE_SPACING = 52
const ROAD_PEBBLE_SPACING = 92

// Скругление площадки под замком — меньше дорожных капсул.
const ROAD_PLATE_RADIUS = 2

type RoadSegment = {
	start: { x: number; y: number }
	end: { x: number; y: number }
}

// Рисует дороги текстурой камня и возвращает занятые ими клетки.
function drawPath(
	scene: Phaser.Scene,
	map: GameMap,
	seed: number,
): Set<string> {
	// Канвасы прошлых запусков сцены не нужны, а ключи у них те же.
	for (const key of scene.textures.getTextureKeys()) {
		if (
			key.startsWith(PATH_TEXTURE_PREFIX) ||
			key.startsWith(ROAD_SHOULDER_TEXTURE_PREFIX)
		) {
			scene.textures.remove(key)
		}
	}

	const roadWidth = CELL_SIZE - 6
	const roadRadius = roadWidth / 2

	//* Клетки дорог и площадки под замком: по ним кладётся полотно и на
	//* них нельзя строить. *
	const pathCells = new Set<string>()

	for (const road of map.roads) {
		for (let i = 0; i < road.length - 1; i++) {
			addLineCells(pathCells, road[i], road[i + 1])
		}
	}

	// Замок занимает клетки вокруг своей точки — строить на них нельзя.
	for (const cell of castleCellKeys(map.castle)) {
		pathCells.add(cell)
	}

	// Песок из пака — это тайлы перехода в траву: полотно, углы и тупики
	// приходят из маски соседей, поэтому капсулы, тень и кромка ему не
	// нужны. Без пака остаётся прежняя дорога камнем.
	if (packRoadTexturesReady(scene)) {
		drawPackRoadSurface(scene, pathCells)
		return pathCells
	}

	// Без кромки тень остаётся узкой каймой прямо под полотном: широкая
	// подсветка была нужна, чтобы утоптанная земля не висела в воздухе.
	const shadowPad = ROAD_EDGE_DECOR ? ROAD_SHOULDER_WIDTH + 2 : 2

	// Тень по краю полотна лежит под всеми сегментами сразу: так на стыках
	// капсул не проступают тёмные дуги от соседних теней.
	const shadow = scene.add.graphics()
	shadow.fillStyle(0x1c3618, 0.16)
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

	// Сегменты собираем заранее: кромку и полотно рисуем отдельными слоями,
	// чтобы земляная полоса соседней капсулы не легла поверх готовой дороги.
	const segments: RoadSegment[] = []

	const approach = castleApproachCells(map.castle)

	for (const originalPoints of map.roadPoints) {
		// Начало дороги — клетки ворот казармы, поэтому торцы дорог не правим:
		// и сид-карта, и нарисованная сеть стартуют на поле.
		const points = originalPoints.slice()

		if (points.length < 2) continue

		const last = points[points.length - 1]
		const previous = points[points.length - 2]
		if (!last || !previous) continue

		// Заводим конец дороги под площадку замка: её скруглённый торец
		// скрыт площадкой, и дорога примыкает к ней прямым краем.
		// У нарисованной сети торцы вдали от замка остаются на месте.
		const endCell = cellKey(
			Math.floor(last.x / CELL_SIZE),
			Math.floor(last.y / CELL_SIZE),
		)
		if (approach.has(endCell)) {
			const lastLength =
				Math.hypot(last.x - previous.x, last.y - previous.y) || 1
			const endOverlap = roadRadius + 4

			points[points.length - 1] = {
				x: last.x + ((last.x - previous.x) / lastLength) * endOverlap,
				y: last.y + ((last.y - previous.y) / lastLength) * endOverlap,
			}
		}

		// Каждый сегмент — капсула со скруглёнными торцами. Соседние капсулы
		// перекрываются в общих точках, поэтому повороты тоже выходят круглыми.
		for (let i = 0; i < points.length - 1; i++) {
			segments.push({ start: points[i], end: points[i + 1] })
		}
	}

	for (const { start, end } of segments) drawShadow(start, end)

	//* Кромка рисуется раньше полотна и на слой ниже: она выглядывает
	//* из-под дороги полосой утоптанной земли. *
	let shoulderIndex = 0

	if (ROAD_EDGE_DECOR) {
		for (const { start, end } of segments) {
			const shoulder = createRoadShoulder(
				scene,
				start,
				end,
				`${ROAD_SHOULDER_TEXTURE_PREFIX}${shoulderIndex++}`,
			)
			if (!shoulder) continue

			scene.add
				.image(shoulder.left, shoulder.top, shoulder.key)
				.setOrigin(0, 0)
				.setDepth(0.95)
		}
	}

	let imageIndex = 0

	for (const { start, end } of segments) {
		const image = createRoadSegment(
			scene,
			start,
			end,
			`${PATH_TEXTURE_PREFIX}${imageIndex++}`,
		)
		if (!image) continue

		scene.add
			.image(image.left, image.top, image.key)
			.setOrigin(0, 0)
			.setDepth(1)
	}

	if (ROAD_EDGE_DECOR) scatterRoadDressing(scene, segments, seed)

	//* Площадка 3×3 клетки под замком: сквозь прозрачные края
	//* спрайта крепости просвечивает дорога, а не трава. *
	const plateSize = CELL_SIZE * CASTLE_SIZE
	const castleCenter = cellCenter(map.castle.x, map.castle.y)
	const plateLeft = castleCenter.x - plateSize / 2
	const plateTop = castleCenter.y - plateSize / 2

	shadow.fillRoundedRect(
		plateLeft - shadowPad,
		plateTop - shadowPad,
		plateSize + shadowPad * 2,
		plateSize + shadowPad * 2,
		ROAD_PLATE_RADIUS + shadowPad,
	)

	if (ROAD_EDGE_DECOR) {
		const plateShoulderSize = plateSize + ROAD_SHOULDER_WIDTH * 2
		const plateShoulder = createRoadCanvas(
			scene,
			`${ROAD_SHOULDER_TEXTURE_PREFIX}plate`,
			Math.round(plateLeft - ROAD_SHOULDER_WIDTH),
			Math.round(plateTop - ROAD_SHOULDER_WIDTH),
			Math.round(plateShoulderSize),
			Math.round(plateShoulderSize),
			(context) => {
				context.roundRect(
					0,
					0,
					plateShoulderSize,
					plateShoulderSize,
					ROAD_PLATE_RADIUS + ROAD_SHOULDER_WIDTH,
				)
			},
			ROAD_SHOULDER_TEXTURE_KEY,
			ROAD_SHOULDER_TEXTURE_SCALE,
		)

		if (plateShoulder) {
			scene.add
				.image(plateShoulder.left, plateShoulder.top, plateShoulder.key)
				.setOrigin(0, 0)
				.setDepth(0.95)
		}
	}

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
	return pathCells
}

// Плитка дороги собирается под маску соседей и кладётся ровно в клетку:
// её полотно занимает клетку целиком, а травяная кромка свешивается
// на 4 px в соседние клетки. Тайл больше клетки не делать — волна
// кромки стыкуется только на границе клетки.
function drawPackRoadSurface(scene: Phaser.Scene, cells: ReadonlySet<string>) {
	for (const key of cells) {
		const [x = 0, y = 0] = key.split(',').map(Number)
		const mask = roadNeighborMask(cells, x, y)
		const texture = packRoadTileKey(mask, scene)
		if (!texture) continue

		scene.add
			.image(
				x * CELL_SIZE + CELL_SIZE / 2,
				y * CELL_SIZE + CELL_SIZE / 2,
				texture,
			)
			.setDisplaySize(PACK_ROAD_TILE_SIZE, PACK_ROAD_TILE_SIZE)
			.setDepth(1)
	}
}

// Стороны клетки, у которых сосед — тоже дорога. Клетки за краем поля
// считаются дорогой, чтобы дорога уходила за границу без тупика.
function roadNeighborMask(cells: ReadonlySet<string>, x: number, y: number) {
	let mask = ''

	if (isRoadNeighbor(cells, x, y - 1)) mask += 'N'
	if (isRoadNeighbor(cells, x + 1, y)) mask += 'E'
	if (isRoadNeighbor(cells, x, y + 1)) mask += 'S'
	if (isRoadNeighbor(cells, x - 1, y)) mask += 'W'

	return mask
}

function isRoadNeighbor(cells: ReadonlySet<string>, x: number, y: number) {
	if (!isBoardCell(x, y)) return true

	return cells.has(cellKey(x, y))
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

// Кромка сегмента — та же капсула, расширенная на полосу утоптанной земли.
function createRoadShoulder(
	scene: Phaser.Scene,
	start: { x: number; y: number },
	end: { x: number; y: number },
	key: string,
) {
	const roadWidth = CELL_SIZE - 6
	const width = roadWidth + ROAD_SHOULDER_WIDTH * 2
	const radius = width / 2

	if (start.x === end.x) {
		const left = Math.round(start.x - radius)
		const top = Math.round(Math.min(start.y, end.y) - radius)
		const height = Math.round(Math.abs(end.y - start.y) + width)

		return createRoadCanvas(
			scene,
			key,
			left,
			top,
			Math.round(width),
			height,
			(context) => {
				context.roundRect(0, 0, width, height, radius)
			},
			ROAD_SHOULDER_TEXTURE_KEY,
			ROAD_SHOULDER_TEXTURE_SCALE,
		)
	}

	const left = Math.round(Math.min(start.x, end.x) - radius)
	const top = Math.round(start.y - radius)
	const canvasWidth = Math.round(Math.abs(end.x - start.x) + width)

	return createRoadCanvas(
		scene,
		key,
		left,
		top,
		canvasWidth,
		Math.round(width),
		(context) => {
			context.roundRect(0, 0, canvasWidth, width, radius)
		},
		ROAD_SHOULDER_TEXTURE_KEY,
		ROAD_SHOULDER_TEXTURE_SCALE,
	)
}

// Пучки травы и камешки по краям полотна: они перекрывают ровную границу
// дороги и травы, поэтому стык читается как обочина, а не как вырезка.
function scatterRoadDressing(
	scene: Phaser.Scene,
	segments: RoadSegment[],
	seed: number,
) {
	const roadRadius = (CELL_SIZE - 6) / 2
	const random = createSeededRandom(seed ^ 0x51f3a7c1)

	// От поворотов отступаем: там капсулы соседних сегментов перекрываются,
	// и декор мог бы оказаться посреди дороги.
	const margin = roadRadius + 10

	for (const { start, end } of segments) {
		const dx = end.x - start.x
		const dy = end.y - start.y
		const length = Math.hypot(dx, dy)
		if (length <= margin * 2) continue

		const ux = dx / length
		const uy = dy / length

		for (const side of [-1, 1]) {
			let fringeDistance = margin + random() * ROAD_FRINGE_SPACING * 0.5

			while (fringeDistance < length - margin) {
				const offset = roadRadius + 2 + random() * 4
				const along = (random() - 0.5) * 6
				const size = 20 + random() * 9
				const texture =
					ROAD_FRINGE_TEXTURES[
						Math.floor(random() * ROAD_FRINGE_TEXTURES.length)
					]

				scene.add
					.image(
						start.x + ux * (fringeDistance + along) - uy * offset * side,
						start.y + uy * (fringeDistance + along) + ux * offset * side,
						texture,
					)
					.setDisplaySize(size, size)
					.setFlipX(random() > 0.5)
					.setDepth(1.25)

				fringeDistance += ROAD_FRINGE_SPACING * (0.75 + random() * 0.7)
			}

			let pebbleDistance = margin + random() * ROAD_PEBBLE_SPACING

			while (pebbleDistance < length - margin) {
				const offset = roadRadius - 5 + random() * 3
				const along = (random() - 0.5) * 5
				const size = 10 + random() * 6
				const texture =
					ROAD_PEBBLE_TEXTURES[
						Math.floor(random() * ROAD_PEBBLE_TEXTURES.length)
					]

				scene.add
					.image(
						start.x + ux * (pebbleDistance + along) - uy * offset * side,
						start.y + uy * (pebbleDistance + along) + ux * offset * side,
						texture,
					)
					.setDisplaySize(size, size)
					.setFlipX(random() > 0.5)
					.setDepth(1.2)

				pebbleDistance += ROAD_PEBBLE_SPACING * (0.6 + random() * 0.9)
			}
		}
	}
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
	sourceKey = 'path',
	sourceScale = PATH_TEXTURE_SCALE,
): { key: string; left: number; top: number } | null {
	const texture = scene.textures.createCanvas(key, width, height)
	if (!texture) return null

	const context = texture.getContext()
	const source = scene.textures.get(sourceKey).getSourceImage() as HTMLImageElement
	const pattern = context.createPattern(source, 'repeat')
	if (!pattern) return null

	const tile = source.width * sourceScale
	pattern.setTransform(
		new DOMMatrix()
			.translate(-(left % tile), -(top % tile))
			.scale(sourceScale),
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

// Камни, кусты, пни и бочки из пака вместо процедурных квадратиков.
// Ставим редко и только на свободной земле: декор не должен спорить с
// лесом и мешать читать поле.
const PACK_DECOR_CHANCE = 0.05
const PACK_DECOR_WEIGHT = PACK_DECOR.reduce((sum, item) => sum + item.weight, 0)

function scatterPackDecor(
	scene: Phaser.Scene,
	occupiedCells: ReadonlySet<string>,
	seed: number,
) {
	if (!PACK_DECOR.some((entry) => scene.textures.exists(entry.key))) return

	const random = createSeededRandom(seed ^ 0x9e3779b)

	for (let y = 0; y < ROWS; y++) {
		for (let x = 0; x < COLS; x++) {
			if (occupiedCells.has(`${x},${y}`)) continue

			if (random() > PACK_DECOR_CHANCE) continue

			const entry = pickPackDecor(random())
			if (!entry || !scene.textures.exists(entry.key)) continue

			const source = scene.textures
				.get(entry.key)
				.getSourceImage() as HTMLImageElement
			if (!source?.width) continue

			const height = entry.size * (source.height / source.width)

			scene.add
				.image(
					x * CELL_SIZE + CELL_SIZE / 2 + (random() - 0.5) * CELL_SIZE * 0.5,
					y * CELL_SIZE + CELL_SIZE / 2 + (random() - 0.5) * CELL_SIZE * 0.5,
					entry.key,
				)
				.setDisplaySize(entry.size, height)
				.setFlipX(random() > 0.5)
				.setDepth(0.5)
		}
	}
}

// Выбор пропа по весу: камней больше, чем пней и бочек.
function pickPackDecor(value: number) {
	let remaining = value * PACK_DECOR_WEIGHT

	for (const entry of PACK_DECOR) {
		remaining -= entry.weight
		if (remaining < 0) return entry
	}

	return PACK_DECOR[0]
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

// На сколько пикселей спрайт казармы поднят над центром своей клетки.
// Точка выхода монстров привязана к тому же сдвигу.
export const SPAWNER_VISUAL_OFFSET_Y = CELL_SIZE * 0.7

// Пиксельные казармы у входа на каждую дорогу и крепость в центре.
// Здание стоит ровно на первом waypoint дороги: оттуда же выходит монстр.
// У пользовательской карты вместо ворот стоят казармы, а замок —
// там, куда его поставили в редакторе.
function drawPathEndpoints(scene: Phaser.Scene, map: GameMap) {
	if (map.spawners.length > 0) {
		// На этажах башни казармы заменены окнами в каменной стене.
		const windows = (map.wallCells?.length ?? 0) > 0

		for (const spawner of map.spawners) {
			if (windows) {
				drawWindowAt(scene, spawner.x, spawner.y)
			} else {
				drawSpawnerAt(scene, spawner.x, spawner.y)
			}
		}
		drawCastleAt(scene, map.castle.x, map.castle.y)
		return
	}

	const gateTextures = [
		'gate-bottom',
		'gate-left',
		'gate-right',
		'gate-top',
	]

	map.roadPoints.forEach((points, index) => {
		const start = points[0]
		if (!start) return
		const texture = gateTextures[index]
		const offsetY = GATE_VISUAL_OFFSET_Y[texture] ?? 0

		scene.add
			.image(start.x, start.y - offsetY, texture)
			.setDisplaySize(CELL_SIZE * 4, CELL_SIZE * 4)
			.setDepth(2)
	})

	drawCastleAt(scene, map.castle.x, map.castle.y)
}

function cellCenter(x: number, y: number) {
	return {
		x: x * CELL_SIZE + CELL_SIZE / 2,
		y: y * CELL_SIZE + CELL_SIZE / 2,
	}
}

// Спрайт крепости крупнее своей площадки: дорога под замком
// остаётся 3×3 клетки, а сама крепость выступает за её края.
export function drawCastleAt(scene: Phaser.Scene, cellX: number, cellY: number) {
	const center = cellCenter(cellX, cellY)
	const size = CELL_SIZE * CASTLE_SIZE * CASTLE_VISUAL_SCALE

	scene.add
		.image(center.x, center.y - CASTLE_VISUAL_OFFSET_Y, 'castle')
		.setDisplaySize(size, size)
		.setDepth(2)
}

// Казарма размером чуть больше клетки: из неё выходят монстры.
export function drawSpawnerAt(scene: Phaser.Scene, cellX: number, cellY: number) {
	const center = cellCenter(cellX, cellY)
	const key = scene.textures.exists('barracks') ? 'barracks' : 'gate-bottom'

	// Спрайт казармы крупнее клетки и приподнят над ней, поэтому враги
	// рождаются в центре здания, а не в центре клетки.
	const source = scene.textures.get(key).getSourceImage() as {
		width: number
		height: number
	}
	const width = CELL_SIZE * 3.4
	const ratio = source.height / Math.max(1, source.width)

	scene.add
		.image(center.x, center.y - SPAWNER_VISUAL_OFFSET_Y, key)
		.setDisplaySize(width, width * ratio)
		.setDepth(2)
}

// Окно в каменной стене этажа: тёмный проём в каменной рамке с тёплым
// отсветом. Из него выходят волны, поэтому окно стоит на клетке казармы.
export function drawWindowAt(scene: Phaser.Scene, cellX: number, cellY: number) {
	const center = cellCenter(cellX, cellY)
	const half = CELL_SIZE / 2
	const left = center.x - half
	const top = center.y - half
	const graphics = scene.add.graphics().setDepth(2)

	graphics.fillStyle(PIXEL_COLORS.stoneBorder, 1)
	graphics.fillRect(left - 3, top - 3, CELL_SIZE + 6, CELL_SIZE + 6)

	graphics.fillStyle(PIXEL_COLORS.stoneDark, 1)
	graphics.fillRect(left, top, CELL_SIZE, CELL_SIZE)

	// Проём: почти чёрный, с золотистым отсветом у нижней кромки.
	graphics.fillStyle(0x120d08, 1)
	graphics.fillRect(left + 4, top + 4, CELL_SIZE - 8, CELL_SIZE - 8)

	graphics.fillStyle(PIXEL_COLORS.gold, 0.16)
	graphics.fillRect(left + 6, top + CELL_SIZE - 11, CELL_SIZE - 12, 5)

	graphics.lineStyle(2, PIXEL_COLORS.stoneLight, 0.7)
	graphics.strokeRect(left + 3.5, top + 3.5, CELL_SIZE - 7, CELL_SIZE - 7)
}

