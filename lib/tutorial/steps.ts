import type { TowerType } from '../../features/game/config/game.config.ts'
import { TUTORIAL_CELLS } from './tutorial-map.ts'

// Шаги обучения — текст плюс проверка, что игрок действительно сделал
// то, что от него просят. Предикаты читают только снимок боя, который
// сцена и так выкладывает в window-событие: обучению не нужны свои
// счётчики и свои состояния, иначе оно разойдётся с игрой.

export type TutorialGame = {
	selectedTower: TowerType | null
	// Уровень и автоулучшение нужны, чтобы проверить прокачку башен.
	towers: Array<{ level: number; autoUpgrade: boolean }>
	// Сводка по выделению: считаем число выделенных башен.
	selection: { count: number } | null
	buildQueue: unknown[]
	wave: number
	level: number
	victory: boolean
}

export type TutorialStep = {
	id: string
	title: string
	text: string
	// Клетка поля, к которой подсказка просит камеру.
	focus?: readonly [number, number]
	// У шага без условия игрок жмёт «Дальше»: такие шаги только рассказывают.
	done?: (game: TutorialGame) => boolean
}

const towerCount = (game: TutorialGame) => game.towers.length

export const TUTORIAL_STEPS: TutorialStep[] = [
	{
		id: 'welcome',
		title: 'Тренировочное поле',
		text: 'Пять лёгких волн на одном пути. Рекорды здесь не пишутся и забег не сохраняется — ошибайся свободно.',
	},
	{
		id: 'castle',
		title: 'Замок',
		text: 'Замок держит оборону: его здоровье — полоска внизу экрана. Доводить её до нуля нельзя.',
		focus: TUTORIAL_CELLS.castle,
	},
	{
		id: 'camp',
		title: 'Казарма и дорога',
		text: 'Отсюда пойдут монстры. Они идут только по дороге, а башни ставятся на свободную землю рядом.',
		focus: TUTORIAL_CELLS.spawner,
	},
	{
		id: 'forest',
		title: 'Где строить нельзя',
		text: 'Лес и вода занимают место башни: на них стройка запрещена, как и на самой дороге.',
		focus: TUTORIAL_CELLS.forest,
	},
	{
		id: 'select',
		title: 'Выбери башню',
		text: 'В нижней панели нажми «Земля» — это самая дешёвая башня, её хватает на старте.',
		done: (game) => game.selectedTower !== null,
	},
	{
		id: 'build',
		title: 'Построй башню',
		text: 'Кликни по свободной клетке у дороги: башня занимает площадку 2×2, призрак показывает, куда она встанет.',
		focus: TUTORIAL_CELLS.buildSpot,
		done: (game) => towerCount(game) >= 1,
	},
	{
		id: 'first-wave',
		title: 'Первая волна',
		text: 'Жми «Начать волну». Башни стреляют сами — твоя работа это золото и новые башни.',
		done: (game) => game.wave >= 1,
	},
	{
		id: 'second-tower',
		title: 'Вторая башня',
		text: 'За золото с убитых монстров построй вторую башню правее, ближе к замку: одной на пять волн мало.',
		focus: TUTORIAL_CELLS.corridor,
		done: (game) => towerCount(game) >= 2,
	},
	{
		id: 'upgrade',
		title: 'Улучшение',
		text: 'Кликни по своей башне, чтобы открыть её панель, и жми «Улучшить»: уровень даёт больше урона и радиуса.',
		done: (game) => game.towers.some((tower) => tower.level >= 2),
	},
	{
		id: 'multi-select',
		title: 'Выделить несколько',
		text: 'Кликни одну башню, а остальные добавляй с Ctrl+клик. Панель покажет сводку группы и её общие цены.',
		done: (game) => (game.selection?.count ?? 0) >= 2,
	},
	{
		id: 'auto-upgrade',
		title: 'Автоулучшение',
		text: 'В сводке группы включи «Автоулучшение» — выделенные башни вложат золото сами, как только его хватит.',
		done: (game) => game.towers.some((tower) => tower.autoUpgrade),
	},
	{
		id: 'queue',
		title: 'Очередь стройки',
		text: 'Выбери башню, на которую не хватает золота, и кликни по свободной клетке правой кнопкой. Заявка встанет в очередь полупрозрачной башней и построится сама, когда золото появится.',
		focus: TUTORIAL_CELLS.corridor,
		done: (game) => game.buildQueue.length >= 1,
	},
	{
		id: 'xp',
		title: 'Опыт и карты',
		text: 'За убийства капает опыт. На новом уровне бой встанет и предложит карту усиления — выбери любую.',
		done: (game) => game.level >= 2,
	},
	{
		id: 'survive',
		title: 'Дожить до пятой волны',
		text: 'Осталось отбить пять волн. Достаивай очередь, улучшай башни и следи за полоской замка.',
		done: (game) => game.victory,
	},
]
