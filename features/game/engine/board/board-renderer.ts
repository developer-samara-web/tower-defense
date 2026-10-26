import type Phaser from 'phaser'

import { CELL_SIZE, COLS, ROWS } from '../../config/game.config'
import {
	CASTLE_CELLS,
	CASTLE_SIZE,
	CENTER_POINT,
	ROADS,
	ROAD_POINTS,
} from '../map/game-map'

// Палитра Pixel Art D&D
const PIXEL_COLORS = {
	grassDark: 0x4a7f2a,
	grassMid: 0x5c9833,
	grassLight: 0x6fa83c,
	grassBright: 0x80b64a,
	grassShadow: 0x528c2d,

	stone: 0x65513a,
	stoneDark: 0x40352a,
	stoneBorder: 0x89704a,
	stoneLight: 0xa18a5c,

	path: 0x8b7047,
	pathBorder: 0x59472f,
	pathLight: 0xa58a5b,

	gold: 0xf3d477,
	goldDim: 0xd1bd68,
}

// Размер бесшовной текстуры травы. 64 клетки по 32 px дают
// степень двойки — такую текстуру безопасно повторять в WebGL.
// Чем крупнее тайл, тем меньше заметен повтор узора на большой карте.
const GRASS_TILE_CELLS = 64
const GRASS_TILE_SIZE = GRASS_TILE_CELLS * CELL_SIZE

// Рисует всё игровое поле и возвращает множество клеток, занятых дорогой.
export function drawBoard(
    scene: Phaser.Scene,
    seed = 1,
): Set<string> {
    drawGrass(scene, seed)
    drawEdgeShade(scene)

    const pathCells = drawPath(scene, seed)

    drawTerrainDetails(scene, pathCells, seed)
    drawPathEndpoints(scene)

    return pathCells
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

function cssColor(color: number, alpha = 1) {
    const red = (color >> 16) & 0xff
    const green = (color >> 8) & 0xff
    const blue = color & 0xff

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`
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

// Рисует траву одним повторяющимся тайлом. Для карты 4000×4000
// рисовать каждую клетку отдельными командами Graphics слишком дорого,
// поэтому узор готовится один раз в CanvasTexture и растягивается TileSprite.
function drawGrass(scene: Phaser.Scene, seed: number) {
	const width = COLS * CELL_SIZE
	const height = ROWS * CELL_SIZE
	const key = 'td-grass-tile'

	if (scene.textures.exists(key)) {
		scene.textures.remove(key)
	}

	const texture = scene.textures.createCanvas(
		key,
		GRASS_TILE_SIZE,
		GRASS_TILE_SIZE,
	)

	// Если браузер не дал создать текстуру, оставляем ровный зелёный фон.
	if (!texture) {
		const fallback = scene.add.graphics()
		fallback.fillStyle(PIXEL_COLORS.grassMid, 1)
		fallback.fillRect(0, 0, width, height)
		fallback.setDepth(0)
		return
	}

	const context = texture.context
	const random = createSeededRandom(seed)

	context.fillStyle = cssColor(PIXEL_COLORS.grassMid)
	context.fillRect(0, 0, GRASS_TILE_SIZE, GRASS_TILE_SIZE)

	for (let y = 0; y < GRASS_TILE_CELLS; y++) {
		for (let x = 0; x < GRASS_TILE_CELLS; x++) {
			const px = x * CELL_SIZE
			const py = y * CELL_SIZE
			const shade = random()

			//* Незаметные вариации основного покрытия. *
			const color =
				shade < 0.15
					? PIXEL_COLORS.grassDark
					: shade < 0.4
						? PIXEL_COLORS.grassShadow
						: shade > 0.88
							? PIXEL_COLORS.grassBright
							: PIXEL_COLORS.grassMid

			context.fillStyle = cssColor(color, 0.12 + random() * 0.1)
			context.fillRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2)

			//* Мелкие пиксельные пятна на траве. *
			const details = 2 + Math.floor(random() * 3)

			for (let i = 0; i < details; i++) {
				const detailX = px + 4 + random() * Math.max(1, CELL_SIZE - 10)
				const detailY = py + 4 + random() * Math.max(1, CELL_SIZE - 10)

				context.fillStyle = cssColor(
					random() > 0.5
						? PIXEL_COLORS.grassLight
						: PIXEL_COLORS.grassDark,
					0.16 + random() * 0.16,
				)

				context.fillRect(
					Math.floor(detailX),
					Math.floor(detailY),
					2 + Math.floor(random() * 3),
					2,
				)
			}
		}
	}

	//* Тонкая сетка вшита в тайл, поэтому она не стоит отдельных команд. *
	context.fillStyle = cssColor(0x1e4b22, 0.18)

	for (let i = 0; i < GRASS_TILE_CELLS; i++) {
		context.fillRect(i * CELL_SIZE, 0, 1, GRASS_TILE_SIZE)
		context.fillRect(0, i * CELL_SIZE, GRASS_TILE_SIZE, 1)
	}

	texture.refresh()

	scene.add
		.tileSprite(0, 0, width, height, key)
		.setOrigin(0, 0)
		.setDepth(0)
}

// Рисует дороги в стиле каменных плит и возвращает занятые ими клетки.
function drawPath(scene: Phaser.Scene, seed = 1): Set<string> {
	const graphics = scene.add.graphics()
	const random = createSeededRandom(seed ^ 0x27d4eb2d)

	const roadWidth = CELL_SIZE - 6
	const borderWidth = roadWidth + 6
	const borderRadius = borderWidth / 2
	const roadRadius = roadWidth / 2

	// Рисует прямоугольный сегмент между двумя точками.
	const drawSegment = (
		start: { x: number; y: number },
		end: { x: number; y: number },
		width: number,
		color: number,
	) => {
		graphics.fillStyle(color, 1)

		if (start.x === end.x) {
			graphics.fillRect(
				start.x - width / 2,
				Math.min(start.y, end.y),
				width,
				Math.abs(end.y - start.y),
			)
		} else {
			graphics.fillRect(
				Math.min(start.x, end.x),
				start.y - width / 2,
				Math.abs(end.x - start.x),
				width,
			)
		}
	}

	for (const points of ROAD_POINTS) {
		// 1. Каменная окантовка дороги.
		for (let i = 0; i < points.length - 1; i++) {
			drawSegment(points[i], points[i + 1], borderWidth, PIXEL_COLORS.pathBorder)
		}

		graphics.fillStyle(PIXEL_COLORS.pathBorder, 1)

		for (const point of points) {
			graphics.fillRect(
				point.x - borderRadius,
				point.y - borderRadius,
				borderWidth,
				borderWidth,
			)
		}

		// 2. Основное земляное покрытие.
		for (let i = 0; i < points.length - 1; i++) {
			drawSegment(points[i], points[i + 1], roadWidth, PIXEL_COLORS.path)
		}

		graphics.fillStyle(PIXEL_COLORS.path, 1)

		for (const point of points) {
			graphics.fillRect(
				point.x - roadRadius,
				point.y - roadRadius,
				roadWidth,
				roadWidth,
			)
		}

		// 3. Светлые участки грунта и тени вдоль краёв.
		for (let i = 0; i < points.length - 1; i++) {
			const start = points[i]
			const end = points[i + 1]

			graphics.fillStyle(PIXEL_COLORS.pathLight, 0.65)

			if (start.x === end.x) {
				graphics.fillRect(
					start.x - roadRadius + 3,
					Math.min(start.y, end.y),
					3,
					Math.abs(end.y - start.y),
				)

				graphics.fillStyle(PIXEL_COLORS.stoneDark, 0.4)
				graphics.fillRect(
					start.x + roadRadius - 2,
					Math.min(start.y, end.y),
					2,
					Math.abs(end.y - start.y),
				)
			} else {
				graphics.fillRect(
					Math.min(start.x, end.x),
					start.y - roadRadius + 3,
					Math.abs(end.x - start.x),
					3,
				)

				graphics.fillStyle(PIXEL_COLORS.stoneDark, 0.4)
				graphics.fillRect(
					Math.min(start.x, end.x),
					start.y + roadRadius - 2,
					Math.abs(end.x - start.x),
					2,
				)
			}
		}

		// 4. Мелкие камни и пятна грунта.
		for (let i = 0; i < points.length - 1; i++) {
			const start = points[i]
			const end = points[i + 1]

			const length = Math.hypot(end.x - start.x, end.y - start.y)
			const count = Math.floor(length / 20)

			for (let j = 0; j < count; j++) {
				if (random() > 0.65) continue

				const t = (j + random()) / Math.max(1, count)

				const x = Math.floor(start.x + (end.x - start.x) * t)
				const y = Math.floor(start.y + (end.y - start.y) * t)

				const offset = (random() - 0.5) * (roadWidth - 12)
				const px = start.x === end.x ? x + offset : x
				const py = start.y === end.y ? y + offset : y

				const size = 2 + Math.floor(random() * 3)

				graphics.fillStyle(
					random() > 0.5
						? PIXEL_COLORS.stoneBorder
						: PIXEL_COLORS.pathLight,
					0.8,
				)

				graphics.fillRect(
					Math.floor(px),
					Math.floor(py),
					size,
					size,
				)

				//* Маленький блик камня. *
				if (random() > 0.5) {
					graphics.fillStyle(PIXEL_COLORS.stoneLight, 0.8)
					graphics.fillRect(
						Math.floor(px),
						Math.floor(py),
						2,
						1,
					)
				}
			}
		}
	}

	graphics.setDepth(1)

	//* Возвращаем клетки пути для размещения башен и декора. *
	const pathCells = new Set<string>()

	for (const road of ROADS) {
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

            //* На большой карте декорируем редко: так сцена остаётся
            //* лёгкой, а трава не превращается в сплошной шум. *
            if (random() > 0.045) continue

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

// Пиксельные ворота у входа на каждую дорогу и крепость в центре.
function drawPathEndpoints(scene: Phaser.Scene) {
	for (const points of ROAD_POINTS) {
		const start = points[0]
		const gate = scene.add.graphics().setDepth(2)

		gate.fillStyle(0xb89a3a, 1)
		gate.fillRect(start.x - 10, start.y - 14, 20, 28)
		gate.fillStyle(0x5c2d0e, 1)
		gate.fillRect(start.x - 6, start.y - 8, 12, 16)
		gate.fillStyle(0x1a0f08, 1)
		gate.fillRect(start.x - 2, start.y - 2, 4, 4)
	}

	// Замок в центре карты.
	scene.add
		.image(CENTER_POINT.x, CENTER_POINT.y, 'castle')
		.setDisplaySize(CELL_SIZE * CASTLE_SIZE, CELL_SIZE * CASTLE_SIZE)
		.setDepth(2)
}
