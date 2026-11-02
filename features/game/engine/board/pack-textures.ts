import type Phaser from 'phaser'

import { CELL_SIZE } from '../../config/game.config'

// Пак «Top-Down Simple Summer»: 56 тайлов земли 256×256 и набор пропов.
// Тайлы земли — это autotile переходы «песок↔трава»: 14 и 23 — песок,
// 43 и 52 — трава, остальное — кромки между ними. Кромки нужны дорогам:
// у них песок подтекает в траву волнистой границей с тёмной обводкой,
// поэтому дорогу кладём тайлами по маске соседей, а не сплошным полотном.
// Файлы лежат в public/game/terrain-pack: ground-NN по номеру пака и
// prop-<название> строчными буквами через дефис.
const PACK_DIR = '/game/terrain-pack'

const groundFile = (index: number) => `ground-${String(index).padStart(2, '0')}.png`

const propFile = (name: string) => `prop-${name}.png`

export const packGroundKey = (index: number) =>
	`pack-ground-${String(index).padStart(2, '0')}`

// Дороге нужны все 16 масок: прямые, углы, ответвления, тупики, островок
// и песок под площадью замка. Сплошной песок (14) уже загружен как
// 'pack-sand-14' — он идёт под площадь.
//
// Угловые плитки (16/18/10/12) — четверть круга радиусом 208 px, прижатая
// к внешнему углу клетки: её рукава идут вплотную к двум сторонам плитки,
// поэтому 208 px рукава = клетка, а не 156 px, как у прямой полосы.
const ROAD_GROUND_TILES = [5, 10, 12, 16, 18, 37, 38, 39, 40, 41, 42]

// Маска клетки дороги — стороны, к которым прилегает песок, в порядке
// N,E,S,W: 'EW' — прямой участок, 'NESW' — площадь или перекрёсток,
// 'N' — тупик, смотрит на север, 'NES' — ответвление без северной ветки.
//
// Тайлы пака на дорогу напрямую не ложатся: песчаная полоса занимает в
// плитке 156 px из 256, поэтому дорога выходила тоньше клетки. Поэтому под
// каждую маску собирается своя плитка: полоса растягивается ровно на
// клетку, кромка свешивается в траву, а угол берётся из угловой плитки —
// её четверть круга масштабируется так, чтобы рукава стали во всю клетку.
type RoadSide = 'N' | 'E' | 'S' | 'W'

type RoadPart = {
	tile: number
	// 'h' — полоса идёт поперёк X (прямая восток-запад), 'v' — поперёк Y,
	// 'blob' — островок целиком в клетку, 'sand' — сплошной песок,
	// 'corner' — четверть круга, прижатая стороной из corner к углу клетки.
	axis: 'h' | 'v' | 'blob' | 'sand' | 'corner'
	corner?: 'NE' | 'NW' | 'ES' | 'SW'
	// Стороны, у которых плитка должна остановиться на границе клетки:
	// за ней сосед — тоже дорога, и его полотно засыпает лишняя кромка.
	trim?: RoadSide[]
}

// Правило одно: кромка тайла остаётся только там, где сосед — трава.
// У вертикального тайла кромки на западе и востоке, у горизонтального —
// на севере и юге, поэтому у развилки рукав теряет кромку со стороны
// продолжения дороги. Угол в этом списке не обрезается: у его плитки
// трава уже только с двух внешних сторон.
const ROAD_MASK_PARTS: Record<string, RoadPart[]> = {
	'': [{ tile: 5, axis: 'blob' }],
	N: [{ tile: 39, axis: 'v' }],
	S: [{ tile: 37, axis: 'v' }],
	E: [{ tile: 40, axis: 'h' }],
	W: [{ tile: 42, axis: 'h' }],
	NS: [{ tile: 38, axis: 'v' }],
	EW: [{ tile: 41, axis: 'h' }],
	NE: [{ tile: 16, axis: 'corner', corner: 'NE' }],
	NW: [{ tile: 18, axis: 'corner', corner: 'NW' }],
	ES: [{ tile: 10, axis: 'corner', corner: 'ES' }],
	SW: [{ tile: 12, axis: 'corner', corner: 'SW' }],
	NES: [{ tile: 38, axis: 'v', trim: ['E'] }],
	NSW: [{ tile: 38, axis: 'v', trim: ['W'] }],
	NEW: [{ tile: 41, axis: 'h', trim: ['N'] }],
	ESW: [{ tile: 41, axis: 'h', trim: ['S'] }],
	NESW: [{ tile: 14, axis: 'sand' }],
}

// Плитка собирается в 4 раза крупнее клетки: так кромка не рвётся при
// растяжении, а на поле тайл ложится одним спрайтом в 40 px.
const ROAD_SCALE = 4
const ROAD_SOURCE = 256
const ROAD_BAND = 156
// Ширина рукава угловой плитки: от внешнего угла клетки до края дуги.
const ROAD_CORNER_ARM = 208
const ROAD_CELL = CELL_SIZE * ROAD_SCALE
const ROAD_MARGIN = 16
const ROAD_CANVAS = ROAD_CELL + ROAD_MARGIN * 2
// Волна кромки гуляет на 6 px источника, а обводка лежит сразу за краем
// песка. Рукав обрезаем у границы клетки с таким отступом, чтобы к стыку
// не вышли ни обводка, ни зелёная кромка: остаток дозаполняем песком.
const ROAD_TRIM_INSET = 6

// На сколько мирных пикселей тайл свешивается за клетку со всех сторон.
export const PACK_ROAD_TILE_SIZE = CELL_SIZE + (ROAD_MARGIN * 2) / ROAD_SCALE

const roadTextureCache = new Map<string, string>()

// Ключ собранной плитки для маски. Собираем один раз на сцену: тайлы
// одинаковые для всех клеток, а разные сцены получают свою текстуру.
// Те же плитки служат берегом рек: у реки та же кромка, только внутри
// песка прорезана вода.
export function packRoadTileKey(mask: string, scene: Phaser.Scene): string | null {
	const parts = roadMaskParts(mask)
	if (!parts) return null

	const cached = roadTextureCache.get(mask)
	if (cached && scene.textures.exists(cached)) return cached

	const sources = parts.map((part) => roadTileSource(scene, part))
	if (sources.some((source): source is null => source === null)) return null

	const key = `pack-road-${mask}`
	if (scene.textures.exists(key)) scene.textures.remove(key)

	const texture = scene.textures.createCanvas(key, ROAD_CANVAS, ROAD_CANVAS)
	if (!texture) return null

	const context = texture.getContext()
	context.clearRect(0, 0, ROAD_CANVAS, ROAD_CANVAS)

	// Каждая часть своим клипом стороны: обрезанный рукав не засыпает
	// полотно соседа.
	parts.forEach((part, index) => {
		const source = sources[index]
		if (!source) return
		context.save()
		trimRoadSide(context, part.trim)
		drawRoadPart(context, source, part)
		context.restore()
	})

	texture.refresh()
	roadTextureCache.set(mask, key)

	return key
}

// Обрезанный рукав не доходит до границы клетки на ширину волны, поэтому
// под него кладём сплошной песок: стык с соседом остаётся песком, а не
// щелью в траву.
function roadMaskParts(mask: string): RoadPart[] | null {
	const parts = ROAD_MASK_PARTS[mask]
	if (!parts) return null
	if (!parts.some((part) => part.trim?.length)) return parts

	return [{ tile: 14, axis: 'sand' }, ...parts]
}

function roadTileSource(
	scene: Phaser.Scene,
	part: RoadPart,
): HTMLImageElement | HTMLCanvasElement | null {
	const key = part.axis === 'sand' ? 'pack-sand-14' : packGroundKey(part.tile)
	if (!scene.textures.exists(key)) return null
	const source = scene.textures.get(key).getSourceImage()

	return source instanceof HTMLImageElement || source instanceof HTMLCanvasElement
		? source
		: null
}

// Обрезка по стороне: сторона в trim значит «сосед — дорога», поэтому
// плитка заканчивается на границе клетки и не засыпает его полотно.
function trimRoadSide(
	context: CanvasRenderingContext2D,
	trim: RoadSide[] | undefined,
) {
	if (!trim || trim.length === 0) return

	let left = 0
	let top = 0
	let right = ROAD_CANVAS
	let bottom = ROAD_CANVAS

	for (const side of trim) {
		if (side === 'N') top = ROAD_MARGIN + ROAD_TRIM_INSET
		if (side === 'S') bottom = ROAD_MARGIN + ROAD_CELL - ROAD_TRIM_INSET
		if (side === 'W') left = ROAD_MARGIN + ROAD_TRIM_INSET
		if (side === 'E') right = ROAD_MARGIN + ROAD_CELL - ROAD_TRIM_INSET
	}

	context.beginPath()
	context.rect(left, top, right - left, bottom - top)
	context.clip()
}

// Вдоль дороги источник ложится 1:1 с клеткой — только так волна кромки
// стыкуется на границе соседних клеток. Поперёк полоса в 156 px
// растягивается в 128, то есть в клетку, а травяная кромка вокруг неё
// выходит за край на 4 мирных пикселя.
function drawRoadPart(
	context: CanvasRenderingContext2D,
	source: HTMLImageElement | HTMLCanvasElement,
	part: RoadPart,
) {
	const cross = (ROAD_SOURCE - ROAD_BAND) / 2
	const scale = ROAD_CELL / ROAD_BAND

	if (part.axis === 'corner') {
		// Рукав угла во всю клетку, если 256 px плитки умножить на
		// CELL/208. Плитка выходит больше клетки, поэтому её внешний угол
		// совмещаем с внешним углом клетки, а лишнее свешивается в траву.
		const size = ROAD_SOURCE * (ROAD_CELL / ROAD_CORNER_ARM)
		const back = ROAD_MARGIN + ROAD_CELL - size
		const corner = part.corner ?? 'NE'

		context.drawImage(
			source,
			corner.includes('E') ? back : ROAD_MARGIN,
			corner.includes('S') ? back : ROAD_MARGIN,
			size,
			size,
		)
		return
	}

	if (part.axis === 'h') {
		context.drawImage(
			source,
			ROAD_MARGIN,
			ROAD_MARGIN - cross * scale,
			ROAD_CELL,
			ROAD_SOURCE * scale,
		)
		return
	}

	if (part.axis === 'v') {
		context.drawImage(
			source,
			ROAD_MARGIN - cross * scale,
			ROAD_MARGIN,
			ROAD_SOURCE * scale,
			ROAD_CELL,
		)
		return
	}

	context.drawImage(source, 0, 0, ROAD_SOURCE, ROAD_SOURCE, ROAD_MARGIN, ROAD_MARGIN, ROAD_CELL, ROAD_CELL)
}

export function packRoadTexturesReady(scene: Phaser.Scene) {
	return Object.keys(ROAD_MASK_PARTS).every((mask) =>
		roadMaskParts(mask)?.every((part) => roadTileSource(scene, part) !== null),
	)
}

// Что грузим в сцену: ключ текстуры и файл в паке.
// Плитки отобраны по доле зелёных пикселей: 14 и 23 — единственный
// песок без травяных уголков (0% зелёного), у 01/03/07/09 в углу уже
// полудиск травы, и он пятнами лёг бы на полотно. 43 и 52 — чистая
// трава без единого тёмного пикселя обводки; 43 не пережил чистку
// папки, поэтому травяной ковёр пока собран только из 52.
export const PACK_IMAGES: ReadonlyArray<{ key: string; file: string }> = [
	{ key: 'pack-sand-14', file: groundFile(14) },
	{ key: 'pack-sand-23', file: groundFile(23) },
	{ key: 'pack-grass-52', file: groundFile(52) },
	...ROAD_GROUND_TILES.map((index) => ({
		key: packGroundKey(index),
		file: groundFile(index),
	})),
	{ key: 'pack-rock-1', file: propFile('rock-01') },
	{ key: 'pack-rock-2', file: propFile('rock-02') },
	{ key: 'pack-rock-3', file: propFile('rock-03') },
	{ key: 'pack-rock-4', file: propFile('rock-04') },
	{ key: 'pack-rock-5', file: propFile('rock-05') },
	{ key: 'pack-bush-small', file: propFile('bushes-small') },
	{ key: 'pack-bush-medium', file: propFile('bushes-medium') },
	{ key: 'pack-stump', file: propFile('tree-stump-short') },
	{ key: 'pack-barrel', file: propFile('wooden-barrel') },
]

export function loadPackTextures(loader: Phaser.Loader.LoaderPlugin) {
	for (const entry of PACK_IMAGES) {
		loader.image(entry.key, `${PACK_DIR}/${entry.file}`)
	}
}

// Ковёр: сторона поля в мирных пикселях и плитки, из которых он собран.
// Плитки раскладываем сеткой 2×2 и часть отражаем зеркально — у
// однотонных тайлов края ровные, поэтому швов не видно, а повтор поля
// растягивается на 16 клеток вместо шести прежних.
const CARPET_TILES: Record<'grass' | 'path', string[]> = {
	grass: ['pack-grass-52', 'pack-grass-52', 'pack-grass-52', 'pack-grass-52'],
	path: ['pack-sand-14', 'pack-sand-23', 'pack-sand-23', 'pack-sand-14'],
}

const CARPET_SEEDS: Record<'grass' | 'path', number> = {
	grass: 0x51c7a3f9,
	path: 0x2b9e4d71,
}

// Собирает ковры и подменяет ими текстуры поля и полотна дороги.
// Возвращает false, если пака в сцене нет: тогда остаются прежние PNG.
export function applyPackTextures(scene: Phaser.Scene) {
	const ready = PACK_IMAGES.every((entry) =>
		scene.textures.exists(entry.key),
	)
	if (!ready) return false

	composeCarpet(scene, 'grass', CARPET_TILES.grass, CARPET_SEEDS.grass)
	composeCarpet(scene, 'path', CARPET_TILES.path, CARPET_SEEDS.path)

	return true
}

function composeCarpet(
	scene: Phaser.Scene,
	key: string,
	tileKeys: string[],
	seed: number,
) {
	// Сцена без прежней текстуры ковра не ждёт: редактор рисует дороги
	// кистью, и полотно ему не нужно.
	if (!scene.textures.exists(key)) return

	const sources = tileKeys
		.map((tileKey) => scene.textures.get(tileKey).getSourceImage())
		.filter((source): source is HTMLImageElement => Boolean(source))

	const first = sources[0]
	if (!first) return

	const tile = first.width
	const size = tile * 2
	const random = createRandom(seed)

	if (scene.textures.exists(key)) scene.textures.remove(key)

	const texture = scene.textures.createCanvas(key, size, size)
	if (!texture) return

	const context = texture.getContext()

	for (let column = 0; column < 2; column++) {
		for (let row = 0; row < 2; row++) {
			const source = sources[(row * 2 + column) % sources.length]
			if (!source) continue

			const x = column * tile
			const y = row * tile

			context.save()
			context.translate(x + tile / 2, y + tile / 2)
			context.scale(random() > 0.5 ? -1 : 1, random() > 0.5 ? -1 : 1)
			context.drawImage(source, -tile / 2, -tile / 2, tile, tile)
			context.restore()
		}
	}

	texture.refresh()
}

// Пропа, которые ставим в поле вместо процедурных квадратиков.
// size — ширина в пикселях поля, высота приходит из пропорций источника.
export const PACK_DECOR: ReadonlyArray<{
	key: string
	size: number
	weight: number
}> = [
	{ key: 'pack-rock-1', size: 20, weight: 3 },
	{ key: 'pack-rock-2', size: 17, weight: 3 },
	{ key: 'pack-rock-3', size: 14, weight: 2 },
	{ key: 'pack-rock-4', size: 11, weight: 2 },
	{ key: 'pack-rock-5', size: 10, weight: 2 },
	{ key: 'pack-bush-small', size: 19, weight: 3 },
	{ key: 'pack-bush-medium', size: 25, weight: 2 },
	{ key: 'pack-stump', size: 18, weight: 1 },
	{ key: 'pack-barrel', size: 16, weight: 1 },
]

// Тот же хэш, что у шума берегов: расстановка декора восстанавливается
// по зерну и не зависит от движка браузера.
function createRandom(seed: number) {
	let state = seed >>> 0

	return () => {
		state = (state + 0x6d2b79f5) | 0

		let value = state
		value = Math.imul(value ^ (value >>> 15), value | 1)
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61)

		return ((value ^ (value >>> 14)) >>> 0) / 4294967296
	}
}
