import assert from 'node:assert/strict'
import test from 'node:test'

import { TOWER_TYPES } from '../../features/game/config/game.config.ts'
import {
	castleApproachCells,
	castleCellKeys,
	spawnerRoads,
	validateDraft,
} from '../../features/game/engine/map/custom-map.ts'
import {
	canBuildTower,
	spawnerBuildCells,
} from '../../features/game/domain/game-rules.ts'
import {
	TUTORIAL_CELLS,
	TUTORIAL_WAVES,
	buildTutorialDraft,
} from './tutorial-map.ts'

// Обучение ломается молча: если казарму отрезало от замка, игрок получает
// пустое поле, а подсказки водят камеру по несуществующей дороге.
test('tutorial map is playable and has exactly five waves', () => {
	const draft = buildTutorialDraft()

	assert.equal(draft.spawners.length, 1)
	assert.equal(validateDraft(draft), null)
	assert.equal(draft.waves.useCommon, false)
	assert.equal(draft.waves.waves.length, TUTORIAL_WAVES)

	// Маршрут обязан существовать и кончаться на подходе к замку: дорога
	// рисается вручную, поэтому контроль именно здесь.
	const [road] = spawnerRoads(draft).map((entry) => entry.road)
	assert.ok(road && road.length > 1)

	const last = road![road!.length - 1]!
	const approach = castleApproachCells(draft.castle!, {
		cols: draft.cols,
		rows: draft.rows,
	})
	assert.ok(approach.has(`${last[0]},${last[1]}`))
	assert.equal(castleCellKeys(draft.castle!).includes(`${last[0]},${last[1]}`), false)
})

// Черновик отдают по одному объекту: он попадает в зависимости эффекта сцены,
// и новый объект на каждый рендер пересоздавал бы игру.
test('tutorial draft is reused between calls', () => {
	assert.equal(buildTutorialDraft(), buildTutorialDraft())
})

// Подсказка приводит камеру к конкретной клетке и велит строить именно там,
// поэтому площадка обязана быть свободна на реальной карте.
test('every tutorial build hint points at a free plot', () => {
	const draft = buildTutorialDraft()

	for (const [name, cell] of [
		['buildSpot', TUTORIAL_CELLS.buildSpot],
		['corridor', TUTORIAL_CELLS.corridor],
	] as const) {
		const [x, y] = cell
		const check = canBuildTower({
			position: { x, y },
			towerCells: new Set(),
			// Стартового золота хватает на дешёвую башню — подсказка просит именно её.
			gold: TOWER_TYPES.earth.cost,
			towerType: 'earth',
			pathCells: new Set(draft.roadCells),
			waterCells: new Set(draft.waterCells),
			forestCells: new Set(draft.forestCells),
			spawnerCells: spawnerBuildCells(draft.spawners),
			castleCells: new Set(castleCellKeys(draft.castle!)),
		})

		assert.deepEqual(check, { allowed: true, reason: null }, name)
	}
})

// Панель башни раскрывается вправо на 232 px и перекрывает соседку, а
// Ctrl+клик по ней — единственный способ выделить группу. Площадки шагов
// разнесены так, чтобы клик прошёл по любой из них при любом порядке.
test('tutorial tower plots clear the selection panel', () => {
	const [buildX] = TUTORIAL_CELLS.buildSpot
	const [corridorX] = TUTORIAL_CELLS.corridor

	assert.ok(corridorX - buildX >= 7, 'панель перекроет вторую башню')
})
