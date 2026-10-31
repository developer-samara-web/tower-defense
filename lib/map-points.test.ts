import assert from 'node:assert/strict'
import test from 'node:test'
import type { MapDraft } from '../features/game/engine/map/custom-map.ts'
import {
	MAX_STARS,
	MIN_STARS,
	PAR_WAVE,
	difficultyFromDraft,
	mapStars,
	playerRating,
	runPoints,
	starsFromDifficultyLabel,
} from './map-points.ts'

const draft = (over: Partial<MapDraft> = {}): MapDraft => ({
	version: 1,
	cols: 100,
	rows: 100,
	castle: { x: 50, y: 50, hp: 20 },
	spawners: [{ id: 's1', x: 10, y: 10, troops: [{ type: 'scout', count: 4, speed: 60, strength: 1, health: 100 }] }],
	waterCells: [],
	forestCells: [],
	roadCells: [],
	waves: { useCommon: true, waves: [] },
	...over,
})

test('map stars grow with the assault and shrink with the defence it offers', () => {
	const base = mapStars(difficultyFromDraft(draft()))
	const moreBarracks = mapStars(difficultyFromDraft(draft({
		spawners: [0, 1, 2].map((i) => ({
			id: `s${i}`,
			x: 10 + i,
			y: 10,
			troops: [{ type: 'scout' as const, count: 4, speed: 60, strength: 1, health: 100 }],
		})),
	})))
	const tougherMonsters = mapStars(difficultyFromDraft(draft({
		spawners: [{ id: 's1', x: 10, y: 10, troops: [{ type: 'scout', count: 4, speed: 60, strength: 1, health: 400 }] }],
	})))
	const longRoad = mapStars(difficultyFromDraft(draft({ roadCells: Array.from({ length: 600 }, (_, i) => `${i},0`) })))
	const thickCastle = mapStars(difficultyFromDraft(draft({ castle: { x: 50, y: 50, hp: 999 } })))

	assert.ok(moreBarracks > base, `${moreBarracks} > ${base}`)
	assert.ok(tougherMonsters > base)
	assert.ok(longRoad < base)
	assert.ok(thickCastle < base)
})

test('map stars stay inside the rating scale', () => {
	const tiny = mapStars(difficultyFromDraft(draft({ spawners: [], castle: { x: 1, y: 1, hp: 999_999 } })))
	const huge = mapStars(difficultyFromDraft(draft({
		spawners: Array.from({ length: 24 }, (_, i) => ({
			id: `s${i}`,
			x: i,
			y: 0,
			troops: [{ type: 'boss' as const, count: 100, speed: 260, strength: 100, health: 99_999 }],
			growth: { health: 1000, speed: 1000, count: 1000 },
		})),
	})))

	assert.equal(tiny, MIN_STARS)
	assert.equal(huge, MAX_STARS)
})

test('explicit wave multipliers raise the difficulty', () => {
	const common = mapStars(difficultyFromDraft(draft()))
	const scaled = mapStars(difficultyFromDraft(draft({
		waves: { useCommon: false, waves: [{ id: 'w1', health: 300, speed: 100, count: 250 }] },
	})))

	assert.ok(scaled > common, `${scaled} > ${common}`)
})

test('maps without a draft fall back to their difficulty label', () => {
	assert.equal(starsFromDifficultyLabel('Трудная'), 6.5)
	assert.equal(starsFromDifficultyLabel(undefined), 4)
	assert.equal(starsFromDifficultyLabel('какая-то строка'), 4)
})

test('run points follow the wave depth and cap out like osu progress', () => {
	const stars = 5

	assert.equal(runPoints({ stars, wave: 0, lives: 20, maxLives: 20 }), 0)
	assert.ok(runPoints({ stars, wave: 5, lives: 20, maxLives: 20 }) < runPoints({ stars, wave: 10, lives: 20, maxLives: 20 }))
	// После эталонной волны прирост заметно меньше, чем до неё.
	const beforePar = runPoints({ stars, wave: PAR_WAVE, lives: 20, maxLives: 20 }) - runPoints({ stars, wave: PAR_WAVE - 5, lives: 20, maxLives: 20 })
	const afterPar = runPoints({ stars, wave: PAR_WAVE + 20, lives: 20, maxLives: 20 }) - runPoints({ stars, wave: PAR_WAVE + 15, lives: 20, maxLives: 20 })
	assert.ok(afterPar < beforePar, `${afterPar} < ${beforePar}`)
})

test('keeping the castle alive is worth more than losing it', () => {
	const survived = runPoints({ stars: 6, wave: 20, lives: 20, maxLives: 20 })
	const damaged = runPoints({ stars: 6, wave: 20, lives: 5, maxLives: 20 })
	const fallen = runPoints({ stars: 6, wave: 20, lives: 0, maxLives: 20 })

	assert.ok(survived > damaged)
	assert.equal(damaged > fallen, true)
	assert.equal(fallen, Math.round(survived * 0.6))
})

test('player rating sums the best map scores with a 0.95 decay', () => {
	assert.equal(playerRating([]), 0)
	assert.equal(playerRating([100, 0, -5]), playerRating([100]))

	const two = playerRating([100, 100])
	// 100 + 95 плюс одинаковая прибавка за количество карт.
	assert.ok(Math.abs(two - playerRating([100]) - 95) <= 1, String(two))

	// Порядок не важен: считается лучший вклад, а не порядок передачи.
	assert.equal(playerRating([50, 100]), playerRating([100, 50]))

	const many = Array.from({ length: 150 }, () => 100)
	// Дальше топ-100 карт очки не учитываются.
	assert.equal(playerRating(many), playerRating(Array.from({ length: 100 }, () => 100)))
	assert.ok(playerRating(many) > playerRating(Array.from({ length: 80 }, () => 100)))
})
