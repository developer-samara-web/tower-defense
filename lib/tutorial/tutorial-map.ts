import { CELL_SIZE } from '../../features/game/config/game.config.ts'
import type { MapDraft } from '../../features/game/engine/map/custom-map.ts'
import { rampPlan, type WaveScale } from '../rated-maps/catalog.ts'
import { createBoard } from '../rated-maps/layout.ts'

// Обучение — не отдельный режим движка, а обычная игра на своей карте:
// дорога из трёх прямых, один лагерь и ровно пять волн. Поле берём
// минимального размера, чтобы игрок видел почти всю трассу без беготни
// камерой, а подсказкам было на что ссылаться координатами клеток.

export const TUTORIAL_MAP_ID = 'tutorial'
export const TUTORIAL_WAVES = 5
const TUTORIAL_CASTLE_HP = 20

// Расписание мягче рейтинговых: первая волна еле дышит и легко держится
// одной башней, пятая требует вторую башню и улучшение, но не наказывает
// за одну ошибку смертью замка.
const TUTORIAL_START: WaveScale = [30, 60, 40]
const TUTORIAL_PEAK: WaveScale = [65, 85, 95]

const TUTORIAL_BOARD = { cols: 40, rows: 40 }

// Клетки, на которые смотрят подсказки. Держим их здесь, а не в тексте
// шагов: сдвинув трассу, игрок не должен ловить камеру в пустоте.
export const TUTORIAL_CELLS = {
	castle: [26, 20] as const,
	spawner: [10, 10] as const,
	// Свободная площадка 2×2 у первой прямой: до замка далеко, зато враг
	// проходит мимо весь путь. Подсказка про постройку приводит к ней камеру.
	buildSpot: [13, 20] as const,
	// Правее первой башни: здесь ученик ставит вторую и заводит очередь.
	// Стоят на семь клеток разнесены специально: панель башни раскрывается
	// вправо от выбранной, и при близкой соседке Ctrl+клик попадал бы в неё.
	corridor: [20, 20] as const,
	// Клетка внутри пятна леса: её показывают, когда объясняют запрет стройки.
	forest: [17, 25] as const,
}

const TUTORIAL_ROAD = [
	[10, 10],
	[10, 30],
	[24, 30],
	[24, 20],
] as const

let cached: MapDraft | null = null

// Черновик собираем один раз: карта зафиксирована, а новый объект на каждом
// рендере заставил бы движок пересоздавать сцену.
export function buildTutorialDraft(): MapDraft {
	if (cached) return cached

	const draft = createBoard(
		TUTORIAL_BOARD,
		7,
		TUTORIAL_CASTLE_HP,
		TUTORIAL_CELLS.castle,
	)
		.road(TUTORIAL_ROAD)
		// Лес учит, что не всякая земля годится для башни: пятно слева от
		// дороги видно сразу, а второй — рядом со строительной площадкой.
		.forest([17, 14], 4)
		.forest([17, 25], 3)
		.spawner(
			{
				x: TUTORIAL_CELLS.spawner[0],
				y: TUTORIAL_CELLS.spawner[1],
				troops: [
					{ type: 'scout', count: 10, health: 84, speed: 72, strength: 1 },
					{ type: 'brute', count: 3, health: 190, speed: 44, strength: 2 },
				],
				growth: { health: 3, speed: 1, count: 2 },
			},
			'tutorial-camp',
		)
		.draft()

	cached = { ...draft, waves: rampPlan(TUTORIAL_WAVES, TUTORIAL_START, TUTORIAL_PEAK) }

	return cached
}

// Мировые координаты центра клетки: их просят подсказки, когда просят
// камеру посмотреть на конкретное место поля.
export function tutorialCellCenter(x: number, y: number) {
	return { x: x * CELL_SIZE + CELL_SIZE / 2, y: y * CELL_SIZE + CELL_SIZE / 2 }
}
