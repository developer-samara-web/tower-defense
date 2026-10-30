import assert from 'node:assert/strict'
import test from 'node:test'
import { createEmptyMapDraft, type MapDraft } from './custom-map.ts'
import {
	buildMapPreview,
	decodeMapPreview,
	MAP_PREVIEW_MAX,
	TERRAIN_FOREST,
	TERRAIN_GRASS,
	TERRAIN_ROAD,
	TERRAIN_WATER,
} from './map-preview.ts'

const CASTLE = { x: 30, y: 30, hp: 100 }

function draft(overrides: Partial<MapDraft> = {}): MapDraft {
	return {
		...createEmptyMapDraft(),
		castle: { ...CASTLE },
		spawners: [
			{
				id: 'barracks-1',
				x: 10,
				y: 10,
				troops: [{ type: 'scout', count: 10, speed: 70, strength: 1, health: 100 }],
			},
		],
		...overrides,
	}
}

function counts(preview: ReturnType<typeof buildMapPreview>) {
	const result: number[] = [0, 0, 0, 0]
	for (const value of decodeMapPreview(preview)) result[value] = (result[value] ?? 0) + 1
	return {
		[TERRAIN_GRASS]: result[0] ?? 0,
		[TERRAIN_FOREST]: result[1] ?? 0,
		[TERRAIN_WATER]: result[2] ?? 0,
		[TERRAIN_ROAD]: result[3] ?? 0,
	}
}

test('empty board decodes back into a full grass grid', () => {
	const preview = buildMapPreview(draft({ spawners: [], castle: null, cols: 60, rows: 60 }))

	assert.equal(preview.cols, MAP_PREVIEW_MAX)
	assert.equal(preview.rows, MAP_PREVIEW_MAX)
	assert.equal(preview.cells, `${MAP_PREVIEW_MAX * MAP_PREVIEW_MAX}g`)
	assert.equal(decodeMapPreview(preview).length, MAP_PREVIEW_MAX * MAP_PREVIEW_MAX)
})

test('preview never exceeds the side limit and keeps the board ratio', () => {
	const preview = buildMapPreview(draft({ cols: 150, rows: 100, spawners: [], castle: null }))

	assert.equal(preview.cols, MAP_PREVIEW_MAX)
	assert.equal(preview.rows, 32)
	assert.equal(decodeMapPreview(preview).length, preview.cols * preview.rows)
})

test('forest and water land in the preview grid', () => {
	const preview = buildMapPreview(
		draft({
			cols: 48,
			rows: 48,
			castle: null,
			spawners: [],
			forestCells: ['0,0', '1,0'],
			waterCells: ['0,47'],
		}),
	)

	const cells = decodeMapPreview(preview)
	assert.equal(cells[0], TERRAIN_FOREST)
	assert.equal(cells[1], TERRAIN_FOREST)
	assert.equal(cells[47 * 48], TERRAIN_WATER)
})

test('downscaling keeps a single-cell river instead of washing it out', () => {
	const river = Array.from({ length: 100 }, (_, y) => `50,${y}`)
	const preview = buildMapPreview(
		draft({ cols: 100, rows: 100, castle: null, spawners: [], waterCells: river }),
	)

	const cells = decodeMapPreview(preview)
	for (let py = 0; py < preview.rows; py++) {
		const rowHasWater = Array.from({ length: preview.cols }, (_, px) => cells[py * preview.cols + px]).includes(
			TERRAIN_WATER,
		)
		assert.equal(rowHasWater, true, `row ${py} lost the river`)
	}
})

test('roads win over water and forest in the same block', () => {
	const preview = buildMapPreview(
		draft({
			cols: 48,
			rows: 48,
			castle: null,
			spawners: [],
			waterCells: ['5,5', '6,5'],
			forestCells: ['5,5'],
			roadCells: ['5,5'],
		}),
	)

	const cells = decodeMapPreview(preview)
	assert.equal(cells[5 * 48 + 5], TERRAIN_ROAD)
	assert.equal(cells[5 * 48 + 6], TERRAIN_WATER)
})

test('drawn roads are used without searching for a route', () => {
	const manual = draft({
		cols: 48,
		rows: 48,
		roadCells: ['0,0', '1,0'],
	})

	assert.equal(counts(buildMapPreview(manual))[TERRAIN_ROAD], 2)
})

test('auto routes from barracks to the castle show up as roads', () => {
	const preview = buildMapPreview(draft({ cols: 48, rows: 48 }))

	assert.ok(counts(preview)[TERRAIN_ROAD] > 0)
})
