import { cellKey, draftSize, spawnerRoads, type MapDraft } from './custom-map.ts'

// Максимальная сторона миниатюры: сетку 48×48 сервер отдаёт на каждую
// карту списка, и даже для поля 150×150 это остаётся пара сотен байт.
export const MAP_PREVIEW_MAX = 48

// Индекс — приоритет клетки при уменьшении: дорога важнее воды,
// вода важнее леса. Символы попадают в RLE-строку preview.
const TERRAIN_CODES = ['g', 'f', 'w', 'r']

export const TERRAIN_GRASS = 0
export const TERRAIN_FOREST = 1
export const TERRAIN_WATER = 2
export const TERRAIN_ROAD = 3

export type MapPreview = {
	cols: number
	rows: number
	// Run-length encoded местность: «12g3f» — 12 клеток травы, 3 леса.
	cells: string
}

// Миниатюра строится из черновика: вода и лес лежат в сохранении,
// а дороги либо нарисованы игроком, либо ищутся маршрутом от казарм.
export function buildMapPreview(draft: MapDraft): MapPreview {
	const { cols, rows } = draftSize(draft)

	const water = new Set(draft.waterCells)
	const forest = new Set(draft.forestCells)
	const road = new Set(draft.roadCells)
	if (road.size === 0) {
		for (const entry of spawnerRoads(draft)) {
			for (const [x, y] of entry.road ?? []) road.add(cellKey(x, y))
		}
	}

	const terrainAt = (x: number, y: number) => {
		const key = cellKey(x, y)
		if (road.has(key)) return TERRAIN_ROAD
		if (water.has(key)) return TERRAIN_WATER
		if (forest.has(key)) return TERRAIN_FOREST
		return TERRAIN_GRASS
	}

	const previewCols = Math.min(MAP_PREVIEW_MAX, cols)
	const previewRows = Math.max(1, Math.min(MAP_PREVIEW_MAX, Math.round((rows * previewCols) / cols)))

	let cells = ''
	let runValue = -1
	let runLength = 0

	const flush = () => {
		if (runValue >= 0) cells += `${runLength}${TERRAIN_CODES[runValue]}`
	}

	for (let py = 0; py < previewRows; py++) {
		const y0 = Math.floor((py * rows) / previewRows)
		const y1 = Math.max(y0, Math.floor(((py + 1) * rows) / previewRows) - 1)

		for (let px = 0; px < previewCols; px++) {
			const x0 = Math.floor((px * cols) / previewCols)
			const x1 = Math.max(x0, Math.floor(((px + 1) * cols) / previewCols) - 1)

			// Тонкая река или дорога не должны пропасть при уменьшении:
			// берём самый заметный тип клеток блока.
			let value = TERRAIN_GRASS
			for (let y = y0; y <= y1 && value < TERRAIN_ROAD; y++) {
				for (let x = x0; x <= x1; x++) {
					const terrain = terrainAt(x, y)
					if (terrain > value) value = terrain
					if (value === TERRAIN_ROAD) break
				}
			}

			if (value === runValue) {
				runLength++
			} else {
				flush()
				runValue = value
				runLength = 1
			}
		}
	}
	flush()

	return { cols: previewCols, rows: previewRows, cells }
}

export function decodeMapPreview(preview: MapPreview): Uint8Array {
	const cells = new Uint8Array(preview.cols * preview.rows)
	let at = 0
	let digits = ''

	for (const char of preview.cells) {
		if (char >= '0' && char <= '9') {
			digits += char
			continue
		}

		const value = TERRAIN_CODES.indexOf(char)
		const length = digits ? Number(digits) : 0
		if (value >= 0 && length > 0) cells.fill(value, at, Math.min(at + length, cells.length))
		at += length
		digits = ''
	}

	return cells
}
