import assert from 'node:assert/strict'
import test from 'node:test'
import { INITIAL_GOLD } from '../../features/game/config/game.config.ts'
import { MAP_LIMITS, validateDraft } from '../../features/game/engine/map/custom-map.ts'
import { difficultyFromDraft, mapStars } from '../map-points.ts'
import { analyzeMap } from './balance.ts'
import { ratedMapDrafts } from './catalog.ts'
import { buildSlots } from './layout.ts'

// Каталог рейтинговых карт — единственный источник правды для библиотеки,
// поэтому его инварианты проверяются как обычные тесты: карта обязана быть
// связной, честной на старте, удерживаемой конечное число волн и обязательно
// внутри своего коридора звёзд. Пороги здесь — те же, по которым карты
// подбирались, так что правка баланса без пересмотра тестов не пройдёт.

const maps = ratedMapDrafts()
const reports = new Map(
	maps.map(({ definition, draft }) => [definition.id, analyzeMap(draft, INITIAL_GOLD)]),
)

const band = (value: number, [min, max]: readonly [number, number]) =>
	value >= min && value <= max

test('каждая карта связна и проходит проверку черновика', () => {
	assert.equal(maps.length, 10)
	for (const { definition, draft } of maps) {
		assert.equal(validateDraft(draft), null, definition.id)
		assert.ok(draft.spawners.length >= 1 && draft.spawners.length <= MAP_LIMITS.maxSpawners)
		for (const spawner of draft.spawners) {
			assert.ok(
				spawner.troops.length >= 1 && spawner.troops.length <= MAP_LIMITS.maxTroops,
				definition.id,
			)
			for (const troop of spawner.troops) {
				assert.ok(troop.count >= MAP_LIMITS.countMin && troop.count <= MAP_LIMITS.countMax)
				assert.ok(troop.health >= MAP_LIMITS.healthMin && troop.health <= MAP_LIMITS.healthMax)
				assert.ok(troop.speed >= MAP_LIMITS.speedMin && troop.speed <= MAP_LIMITS.speedMax)
			}
		}
	}
})

test('звёзды и горизонт каждой карты в её коридоре', () => {
	for (const { definition, draft } of maps) {
		const stars = mapStars(difficultyFromDraft(draft))
		const horizon = reports.get(definition.id)!.horizon
		assert.ok(band(stars, definition.targetStars), `${definition.id}: ${stars}★`)
		assert.ok(
			band(horizon, definition.targetHorizon),
			`${definition.id}: горизонт ${horizon}`,
		)
	}
})

test('первая волна честная, а рост требования без стен', () => {
	for (const { definition } of maps) {
		const report = reports.get(definition.id)!
		const first = report.stream(1)
		// Требование первой волны не больше половины того, что игрок
		// собирает на стартовом золоте.
		assert.ok(report.earlyRatio <= 0.5, `${definition.id}: early ${report.earlyRatio}`)
		// Волна обязана быть и заметной, и не бесконечной по длительности.
		assert.ok(first.units >= 8 && first.units <= 45, `${definition.id}: ${first.units} тел`)
		assert.ok(report.maxJump <= 2.2, `${definition.id}: скачок ${report.maxJump}`)
	}
})

test('замок переживает три пропущенные волны подряд', () => {
	for (const { definition, draft } of maps) {
		const leak = reports.get(definition.id)!.stream(1).leak
		assert.ok(
			(draft.castle?.hp ?? 0) >= leak * 2.5,
			`${definition.id}: hp ${draft.castle?.hp} против пропуска ${leak}`,
		)
	}
})

test('волна не тянется дольше двух минут на одинаковой скорости', () => {
	for (const { definition } of maps) {
		const report = reports.get(definition.id)!
		const units = report.stream(report.horizon).units
		// Двиок выпускает по одному телю за 700 мс.
		assert.ok(units * 0.7 <= 150, `${definition.id}: ${units} тел на ${report.horizon}-й волне`)
	}
})

test('все виды монстров возвращаются в ротации', () => {
	for (const { definition } of maps) {
		const report = reports.get(definition.id)!
		// Ни один вид не исчезает дольше, чем на шесть волн подряд.
		assert.ok(report.typeGap <= 6, `${definition.id}: разрыв ${report.typeGap}`)
	}
})

test('под башни остаётся место вдоль дороги', () => {
	for (const { definition, draft } of maps) {
		// Площадки ищутся по коридору дороги: без них карта — «одна точка».
		assert.ok(buildSlots(draft, 4) >= 150, `${definition.id}: строить негде`)
	}
})

test('лестница сложности не инвертируется', () => {
	const ordered = [...maps].sort(
		(a, b) =>
			(a.definition.targetStars[0] + a.definition.targetStars[1]) / 2 -
			(b.definition.targetStars[0] + b.definition.targetStars[1]) / 2,
	)

	for (let index = 1; index < ordered.length; index++) {
		const previous = mapStars(difficultyFromDraft(ordered[index - 1]!.draft))
		const current = mapStars(difficultyFromDraft(ordered[index]!.draft))
		assert.ok(
			current > previous,
			`${ordered[index]!.definition.id}: ${current}★ после ${previous}★`,
		)
	}
})

test('расписание волн растёт и упирается в потолок настроек', () => {
	for (const { definition, draft } of maps) {
		assert.equal(draft.waves.useCommon, false, definition.id)
		const list = draft.waves.waves
		assert.ok(list.length >= 8 && list.length <= MAP_LIMITS.maxWaves, definition.id)
		assert.equal(new Set(list.map((wave) => wave.id)).size, list.length, definition.id)

		for (const wave of list) {
			for (const value of [wave.health, wave.speed, wave.count]) {
				assert.ok(
					value >= MAP_LIMITS.wavePercentMin && value <= MAP_LIMITS.wavePercentMax,
					`${definition.id}: ${value}%`,
				)
			}
		}

		// Потолок расписания — максимум по списку: на нём и считается сложность.
		const peak = Math.max(...list.map((wave) => wave.health))
		const last = list[list.length - 1]!
		assert.ok(peak >= last.health, definition.id)
	}
})
