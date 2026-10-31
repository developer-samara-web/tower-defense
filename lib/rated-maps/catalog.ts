import type { EnemyType } from '../../features/game/config/game.config.ts'
import type {
	MapDraft,
	MapWave,
	MapWaves,
	SpawnerGrowth,
	SpawnerTroop,
} from '../../features/game/engine/map/custom-map.ts'
import { MAP_LIMITS } from '../../features/game/engine/map/custom-map.ts'
import { createBoard, type BoardSize } from './layout.ts'

// Десять рейтинговых карт — десять архетипов Warcraft III TD: от
// линейного коридора Element TD до мейзинга Wintermaul Wars и четырёх
// ворот Green Circle. Разные формы дороги дают разную тактику, поэтому
// ни одна башня не обязана быть «единственно верной», а общий топ
// читается как честный: звёзды считаются самой картой, а не словами.
//
// Номинал казармы — не HP монстра в бою, а база умножителей. Все десять
// расписаний открываются на 30% здоровья и 70% скорости при урезанном
// количестве, чтобы первая волна честно держалась стартовыми башнями.
// Дальше разгон идёт до потолка расписания, а свой рост казармы множат
// поверх: у тяжёлых карт номинал мелкий, зато потолок и рост большие.

export type RatedMapDefinition = {
	// Ключ карты в реестре: по нему скрипт публикации обновляет запись.
	id: string
	name: string
	// Слово сложности для карточки библиотеки: звёзды всё равно свои.
	difficulty: 'Лёгкая' | 'Средняя' | 'Трудная' | 'Экстремальная'
	previewColor: string
	// Чем карта отвечает игроку — это же показывает предпросмотр.
	idea: string
	// Целевой коридор звёзд: тесты не дают каталогу разъехаться.
	targetStars: [number, number]
	// Целевой горизонт: последняя удерживаемая волна.
	targetHorizon: [number, number]
	// Террейн и казармы — форма карты.
	build: () => MapDraft
	// Кривая волн — второй рычаг баланса: он же держит старт честным,
	// а звёзды карты считает по потолку расписания.
	plan: () => MapWaves
}

function troop(
	type: EnemyType,
	count: number,
	health: number,
	speed: number,
	strength: number,
): SpawnerTroop {
	return { type, count, health, speed, strength }
}

function growth(health: number, speed: number, count: number): SpawnerGrowth {
	return { health, speed, count }
}

export type WaveScale = readonly [health: number, speed: number, count: number]

// Расписание волн растёт геометрически: первая волна легко держится
// стартовыми башнями, к последней множитель доходит до потолка настроек,
// а после неё повторяется. Личный рост казарм идёт поверх расписания,
// поэтому горизонт сложности настраивается длиной разгона и процентом
// роста, а не «толщиной» отдельных монстров.
export function rampPlan(
	entries: number,
	start: WaveScale,
	peak: WaveScale,
	eliteEvery = 0,
): MapWaves {
	const waves: MapWave[] = Array.from({ length: entries }, (_, index) => {
		const step = entries === 1 ? 1 : index / (entries - 1)
		// Элитная волна: тоньше по количеству, но жирнее и медленнее —
		// как босс Element TD между обычными волнами.
		const elite = eliteEvery > 0 && (index + 1) % eliteEvery === 0

		return {
			id: `wave-${index + 1}`,
			health: scalePercent(start[0], peak[0], step, elite ? 1.5 : 1),
			speed: scalePercent(start[1], peak[1], step, elite ? 0.75 : 1),
			count: scalePercent(start[2], peak[2], step, elite ? 0.85 : 1),
		}
	})

	return { useCommon: false, waves }
}

function scalePercent(from: number, to: number, step: number, factor: number) {
	const value = Math.round(from * Math.pow(to / from, step) * factor)
	return Math.min(MAP_LIMITS.wavePercentMax, Math.max(MAP_LIMITS.wavePercentMin, value))
}

const size = (cols: number, rows: number): BoardSize => ({ cols, rows })

export const RATED_MAPS: RatedMapDefinition[] = [
	{
		id: 'element-corridor',
		name: 'Элементальный коридор',
		difficulty: 'Лёгкая',
		previewColor: '#6b8e32',
		idea: 'Один длинный коридор Element TD: учимся ставить башни по всей длине, а не в одну точку.',
		targetStars: [2.8, 3.6],
		targetHorizon: [40, 80],
		plan: () => rampPlan(50, [30, 70, 55], [30, 115, 95]),
		build() {
			return createBoard(size(56, 44), 101, 40, [28, 22])
				.road([
					[6, 6],
					[6, 20],
					[19, 20],
					[19, 36],
					[33, 36],
					[33, 22],
					[30, 22],
				])
				.river(
					[
						[0, 29],
						[22, 29],
						[26, 25],
						[55, 25],
					],
					2.6,
				)
				.forest([10, 12], 5)
				.forest([13, 33], 5)
				.forest([43, 10], 6)
				.forest([46, 37], 5)
				.spawner({
					x: 5,
					y: 6,
					troops: [
						troop('scout', 11, 84, 72, 1),
						troop('brute', 3, 200, 46, 2),
						troop('sprinter', 4, 69, 118, 1),
					],
					growth: growth(6, 1, 1),
				})
				.draft()
		},
	},
	{
		id: 'winter-maul',
		name: 'Зимний Вал',
		difficulty: 'Лёгкая',
		previewColor: '#4f7fa8',
		idea: 'Мейзинг Wintermaul Wars: путь в семь раз длиннее прямого, деньги и оборона делят один котёл.',
		targetStars: [3.4, 4.2],
		targetHorizon: [40, 80],
		plan: () => rampPlan(50, [30, 70, 55], [55, 115, 110]),
		build() {
			return createBoard(size(60, 60), 202, 60, [33, 30])
				.road([
					[5, 5],
					[5, 50],
					[11, 50],
					[11, 10],
					[17, 10],
					[17, 52],
					[23, 52],
					[23, 12],
					[29, 12],
					[29, 30],
					[31, 30],
				])
				.river(
					[
						[0, 57],
						[34, 57],
						[38, 52],
						[59, 52],
					],
					3,
				)
				.forest([36, 20], 6)
				.forest([48, 40], 7)
				.forest([52, 8], 6)
				.spawner({
					x: 4,
					y: 5,
					troops: [
						troop('scout', 14, 56, 74, 1),
						troop('brute', 7, 130, 48, 2),
						troop('sprinter', 6, 44, 120, 1),
					],
					growth: growth(6, 1, 1),
				})
				.draft()
		},
	},
	{
		id: 'gem-fork',
		name: 'Самоцветная тропа',
		difficulty: 'Средняя',
		previewColor: '#7a5fa8',
		idea: 'Развилка Gem TD: два равноценных плеча, поэтому нельзя закрыть карту одной удачной клеткой.',
		targetStars: [4.0, 4.8],
		targetHorizon: [32, 46],
		plan: () => rampPlan(40, [30, 70, 45], [73, 120, 120]),
		build() {
			return createBoard(size(52, 52), 303, 63, [32, 26])
				.road([
					[7, 26],
					[16, 26],
					[16, 10],
					[30, 10],
					[30, 26],
				])
				.road([
					[16, 26],
					[16, 42],
					[30, 42],
					[30, 26],
				])
				.forest([23, 26], 6)
				.forest([23, 20], 4)
				.forest([23, 33], 4)
				.forest([9, 40], 6)
				.forest([44, 8], 6)
				.river(
					[
						[46, 20],
						[46, 46],
						[30, 49],
					],
					2.4,
				)
				.spawner({
					x: 6,
					y: 26,
					troops: [
						troop('scout', 16, 57, 76, 1),
						troop('brute', 10, 129, 50, 2),
						troop('sprinter', 8, 44, 124, 1),
					],
					growth: growth(8, 1, 2),
				})
				.draft()
		},
	},
	{
		id: 'river-isle',
		name: 'Речной остров',
		difficulty: 'Средняя',
		previewColor: '#2f8f8b',
		idea: 'Замок в кольце реки: два брода-гейта, как обязательные точки у мейзеров Wintermaul.',
		targetStars: [4.6, 5.4],
		targetHorizon: [26, 38],
		plan: () => rampPlan(32, [30, 70, 40], [40, 125, 120], 8),
		build() {
			return createBoard(size(55, 55), 404, 72, [27, 27])
				.river(
					[
						[12, 14],
						[42, 14],
						[44, 16],
						[44, 38],
						[42, 40],
						[12, 40],
						[10, 38],
						[10, 16],
						[12, 14],
					],
					3,
				)
				.road([
					[6, 6],
					[20, 6],
					[20, 25],
					[28, 25],
				])
				.road([
					[48, 48],
					[34, 48],
					[34, 27],
					[29, 27],
				])
				.forest([8, 44], 7)
				.forest([47, 9], 7)
				.forest([27, 47], 6)
				.forest([47, 30], 5)
				.spawner({
					x: 5,
					y: 6,
					troops: [
						troop('scout', 10, 42, 78, 1),
						troop('brute', 8, 95, 52, 2),
						troop('sprinter', 6, 33, 126, 1),
					],
					growth: growth(11, 2, 2),
				})
				.spawner({
					x: 48,
					y: 48,
					troops: [
						troop('scout', 8, 39, 80, 1),
						troop('brute', 6, 83, 50, 2),
						troop('boss', 1, 289, 34, 3),
					],
					growth: growth(11, 2, 2),
				})
				.draft()
		},
	},
	{
		id: 'forest-lair',
		name: 'Лесной лагерь',
		difficulty: 'Средняя',
		previewColor: '#3f6b2f',
		idea: 'Лес сужает поле к двум перекрёсткам: кто держит перекрёсток, тот держит карту.',
		targetStars: [5.0, 5.8],
		targetHorizon: [22, 32],
		plan: () => rampPlan(26, [30, 70, 35], [99, 130, 125], 7),
		build() {
			return createBoard(size(60, 50), 505, 93, [30, 25])
				.road([
					[5, 8],
					[18, 8],
					[18, 20],
					[30, 20],
					[30, 23],
				])
				.road([
					[5, 42],
					[22, 42],
					[22, 30],
					[30, 30],
					[30, 27],
				])
				.forest([10, 24], 9, 0.45)
				.forest([44, 10], 8, 0.45)
				.forest([46, 40], 8, 0.45)
				.forest([36, 25], 5, 0.4)
				.forest([12, 46], 6)
				.river(
					[
						[52, 22],
						[52, 34],
						[40, 36],
					],
					2.6,
				)
				.spawner({
					x: 4,
					y: 8,
					troops: [
						troop('scout', 12, 34, 80, 1),
						troop('brute', 8, 73, 54, 2),
						troop('sprinter', 8, 25, 130, 1),
					],
					growth: growth(11, 2, 2),
				})
				.spawner({
					x: 4,
					y: 42,
					troops: [
						troop('scout', 10, 32, 82, 1),
						troop('brute', 10, 77, 52, 2),
						troop('boss', 1, 227, 36, 3),
					],
					growth: growth(11, 2, 2),
				})
				.draft()
		},
	},
	{
		id: 'legion-lanes',
		name: 'Полки на равнине',
		difficulty: 'Трудная',
		previewColor: '#a4692a',
		idea: 'Три полосы Legion TD: золото уходит и на оборону своей полосы, и на общий удар.',
		targetStars: [5.6, 6.4],
		targetHorizon: [18, 28],
		plan: () => rampPlan(22, [30, 70, 30], [120, 135, 125], 6),
		build() {
			return createBoard(size(70, 50), 606, 84, [60, 25])
				.road([
					[5, 6],
					[26, 6],
					[26, 14],
					[44, 14],
					[44, 24],
					[58, 24],
				])
				.road([
					[5, 25],
					[20, 25],
					[20, 21],
					[44, 21],
					[44, 25],
					[58, 25],
				])
				.road([
					[5, 44],
					[30, 44],
					[30, 34],
					[48, 34],
					[48, 26],
					[58, 26],
				])
				.river(
					[
						[12, 16],
						[68, 16],
					],
					2.2,
				)
				.river(
					[
						[12, 35],
						[68, 35],
					],
					2.2,
				)
				.forest([18, 34], 5)
				.forest([22, 26], 4)
				.forest([54, 6], 6)
				.forest([56, 44], 6)
				.spawner({
					x: 4,
					y: 6,
					troops: [
						troop('sprinter', 11, 24, 132, 1),
						troop('scout', 11, 35, 82, 1),
					],
					growth: growth(11, 2, 2),
				})
				.spawner({
					x: 4,
					y: 25,
					troops: [
						troop('scout', 13, 37, 84, 1),
						troop('brute', 11, 79, 55, 2),
					],
					growth: growth(11, 2, 2),
				})
				.spawner({
					x: 4,
					y: 44,
					troops: [
						troop('brute', 13, 82, 56, 2),
						troop('boss', 1, 243, 38, 3),
					],
					growth: growth(11, 2, 2),
				})
				.draft()
		},
	},
	{
		id: 'four-gates',
		name: 'Четыре ворот',
		difficulty: 'Трудная',
		previewColor: '#8d3b3b',
		idea: 'Кольцо Green Circle: давление с четырёх краёв, короткое плечо до замка, запастись местом некуда.',
		targetStars: [6.2, 7.0],
		targetHorizon: [14, 24],
		plan: () => rampPlan(18, [30, 70, 25], [168, 140, 130], 5),
		build() {
			return createBoard(size(64, 64), 707, 96, [32, 32])
				.road([
					[8, 8],
					[24, 8],
					[24, 24],
					[30, 24],
					[30, 31],
				])
				.road([
					[56, 8],
					[40, 8],
					[40, 24],
					[34, 24],
					[34, 31],
				])
				.road([
					[8, 56],
					[24, 56],
					[24, 40],
					[30, 40],
					[30, 33],
				])
				.road([
					[56, 56],
					[40, 56],
					[40, 40],
					[34, 40],
					[34, 33],
				])
				.river(
					[
						[0, 32],
						[20, 32],
						[20, 20],
					],
					2.4,
				)
				.river(
					[
						[63, 32],
						[44, 32],
						[44, 44],
					],
					2.4,
				)
				.forest([14, 14], 6)
				.forest([50, 50], 6)
				.forest([14, 50], 5)
				.forest([50, 14], 5)
				.spawner({
					x: 7,
					y: 8,
					troops: [
						troop('scout', 11, 34, 86, 1),
						troop('sprinter', 7, 23, 134, 1),
					],
					growth: growth(13, 3, 3),
				})
				.spawner({
					x: 56,
					y: 8,
					troops: [
						troop('brute', 11, 77, 58, 2),
						troop('scout', 7, 32, 84, 1),
					],
					growth: growth(13, 3, 3),
				})
				.spawner({
					x: 7,
					y: 56,
					troops: [
						troop('sprinter', 11, 24, 136, 1),
						troop('brute', 7, 73, 56, 2),
					],
					growth: growth(13, 3, 3),
				})
				.spawner({
					x: 56,
					y: 56,
					troops: [
						troop('boss', 1, 228, 40, 3),
						troop('scout', 11, 36, 88, 1),
						troop('brute', 7, 79, 58, 2),
					],
					growth: growth(13, 3, 3),
				})
				.draft()
		},
	},
	{
		id: 'mountain-spiral',
		name: 'Горный серпантин',
		difficulty: 'Трудная',
		previewColor: '#6d6f8f',
		idea: 'Спираль Mountain TD вокруг замка: путь длинный, но каждый виток — последний рубеж.',
		targetStars: [6.8, 7.6],
		targetHorizon: [12, 20],
		plan: () => rampPlan(40, [30, 70, 30], [1000, 150, 220], 5),
		build() {
			const board = createBoard(size(60, 60), 808, 60, [30, 30])
				.road([
					[4, 4],
					[54, 4],
					[54, 54],
					[8, 54],
					[8, 14],
					[44, 14],
					[44, 44],
					[18, 44],
					[18, 24],
					[36, 24],
					[36, 34],
					[28, 34],
					[28, 31],
				])
				.river(
					[
						[30, 0],
						[30, 12],
						[20, 12],
						[20, 22],
					],
					2.4,
				)
				.forest([48, 30], 6)
				.forest([12, 34], 6)
				.forest([34, 50], 6)
				.spawner({
					x: 3,
					y: 4,
					troops: [
						troop('scout', 22, 55, 84, 1),
						troop('brute', 14, 112, 56, 2),
						troop('sprinter', 14, 35, 132, 1),
					],
					growth: growth(7, 3, 1),
				})

			return board.draft()
		},
	},
	{
		id: 'ember-gauntlet',
		name: 'Пепельный рубеж',
		difficulty: 'Экстремальная',
		previewColor: '#b45f2a',
		idea: 'Рейд Upadoro: четыре коротких плеча, тридцать семь тел в первой волне и элита каждые четыре.',
		targetStars: [7.4, 8.2],
		targetHorizon: [10, 18],
		plan: () => rampPlan(20, [30, 70, 30], [1000, 155, 150], 4),
		build() {
			const board = createBoard(size(50, 50), 909, 171, [25, 25])
				.road([
					[5, 25],
					[14, 25],
					[14, 20],
					[23, 20],
					[23, 25],
				])
				.road([
					[25, 5],
					[25, 14],
					[20, 14],
					[20, 23],
					[25, 23],
				])
				.road([
					[45, 25],
					[36, 25],
					[36, 30],
					[27, 30],
					[27, 25],
				])
				.road([
					[25, 45],
					[25, 36],
					[30, 36],
					[30, 27],
					[25, 27],
				])
				.river(
					[
						[0, 12],
						[12, 12],
						[12, 0],
					],
					2.2,
				)
				.river(
					[
						[50, 38],
						[38, 38],
						[38, 50],
					],
					2.2,
				)
				.forest([8, 8], 6)
				.forest([42, 42], 6)
				.forest([8, 42], 5)
				.forest([42, 8], 5)

			const draft = board
				.spawner({
					x: 4,
					y: 25,
					troops: [
						troop('scout', 17, 30, 92, 1),
						troop('sprinter', 13, 19, 140, 1),
					],
					growth: growth(12, 3, 2),
				})
				.spawner({
					x: 25,
					y: 4,
					troops: [
						troop('brute', 16, 62, 60, 2),
						troop('scout', 14, 29, 90, 1),
					],
					growth: growth(12, 3, 2),
				})
				.spawner({
					x: 45,
					y: 25,
					troops: [
						troop('sprinter', 16, 20, 142, 1),
						troop('brute', 14, 61, 58, 2),
					],
					growth: growth(12, 3, 2),
				})
				.spawner({
					x: 25,
					y: 45,
					troops: [
						troop('boss', 2, 174, 42, 3),
						troop('scout', 17, 31, 94, 1),
						troop('brute', 13, 64, 60, 2),
					],
					growth: growth(12, 3, 2),
				})
				.draft()

			return draft
		},
	},
	{
		id: 'ashen-decree',
		name: 'Пепельный приговор',
		difficulty: 'Экстремальная',
		previewColor: '#5d2f4d',
		idea: 'Геймпорт Burbenog: десять казарм сразу, лабиринт в шесть раз длиннее прямого и сложный процент на всех.',
		targetStars: [8.0, 8.8],
		targetHorizon: [7, 13],
		plan: () => rampPlan(20, [30, 70, 22], [1000, 165, 140], 3),
		build() {
			return createBoard(size(84, 70), 1010, 150, [42, 35])
				.road([
					[6, 6],
					[6, 30],
					[20, 30],
					[20, 20],
					[34, 20],
					[34, 34],
					[40, 34],
				])
				.road([
					[78, 6],
					[78, 30],
					[64, 30],
					[64, 20],
					[50, 20],
					[50, 34],
					[44, 34],
				])
				.road([
					[6, 64],
					[6, 40],
					[20, 40],
					[20, 50],
					[34, 50],
					[34, 36],
					[40, 36],
				])
				.road([
					[78, 64],
					[78, 40],
					[64, 40],
					[64, 50],
					[50, 50],
					[50, 36],
					[44, 36],
				])
				.road([
					[42, 4],
					[42, 14],
					[28, 14],
					[28, 35],
					[40, 35],
				])
				.road([
					[42, 66],
					[42, 56],
					[56, 56],
					[56, 35],
					[44, 35],
				])
				.road([
					[20, 3],
					[20, 20],
					[26, 20],
					[26, 34],
					[40, 34],
				])
				.road([
					[64, 3],
					[64, 20],
					[58, 20],
					[58, 34],
					[44, 34],
				])
				.road([
					[20, 66],
					[20, 50],
					[26, 50],
					[26, 36],
					[40, 36],
				])
				.road([
					[64, 66],
					[64, 50],
					[58, 50],
					[58, 36],
					[44, 36],
				])
				.river(
					[
						[0, 22],
						[16, 22],
						[16, 58],
						[0, 58],
					],
					2.6,
				)
				.river(
					[
						[84, 22],
						[68, 22],
						[68, 58],
						[84, 58],
					],
					2.6,
				)
				.forest([12, 12], 7)
				.forest([72, 12], 7)
				.forest([12, 60], 7)
				.forest([72, 60], 7)
				.forest([36, 62], 6)
				.forest([48, 8], 6)
				.spawner({
					x: 5,
					y: 6,
					troops: [
						troop('scout', 8, 21, 95, 1),
						troop('sprinter', 6, 14, 145, 1),
					],
					growth: growth(18, 4, 2),
				})
				.spawner({
					x: 78,
					y: 6,
					troops: [
						troop('brute', 7, 44, 62, 2),
						troop('scout', 7, 21, 92, 1),
					],
					growth: growth(18, 4, 2),
				})
				.spawner({
					x: 5,
					y: 64,
					troops: [
						troop('sprinter', 7, 15, 148, 1),
						troop('brute', 7, 44, 60, 2),
					],
					growth: growth(18, 4, 2),
				})
				.spawner({
					x: 78,
					y: 64,
					troops: [
						troop('boss', 1, 125, 44, 3),
						troop('scout', 8, 22, 96, 1),
					],
					growth: growth(18, 4, 2),
				})
				.spawner({
					x: 42,
					y: 3,
					troops: [
						troop('brute', 8, 46, 64, 2),
						troop('sprinter', 6, 15, 146, 1),
					],
					growth: growth(18, 4, 2),
				})
				.spawner({
					x: 42,
					y: 66,
					troops: [
						troop('boss', 1, 129, 46, 3),
						troop('brute', 7, 45, 62, 2),
						troop('scout', 7, 21, 94, 1),
					],
					growth: growth(18, 4, 2),
				})
				.spawner({
					x: 20,
					y: 3,
					troops: [
						troop('scout', 4, 20, 90, 1),
						troop('brute', 3, 43, 60, 2),
					],
					growth: growth(18, 4, 2),
				})
				.spawner({
					x: 64,
					y: 3,
					troops: [
						troop('sprinter', 4, 14, 146, 1),
						troop('scout', 3, 21, 92, 1),
					],
					growth: growth(18, 4, 2),
				})
				.spawner({
					x: 20,
					y: 66,
					troops: [
						troop('brute', 4, 44, 62, 2),
						troop('sprinter', 1, 14, 148, 1),
					],
					growth: growth(18, 4, 2),
				})
				.spawner({
					x: 64,
					y: 66,
					troops: [
						troop('scout', 4, 21, 94, 1),
						troop('boss', 1, 122, 44, 3),
					],
					growth: growth(18, 4, 2),
				})
				.draft()
		},
	},
]

// Полный реестр: id → черновик. Публикация и тесты берут карты отсюда,
// чтобы каталог оставался единственным источником правды.
export function ratedMapDrafts(): { definition: RatedMapDefinition; draft: MapDraft }[] {
	return RATED_MAPS.map((definition) => {
		const draft = definition.build()
		draft.waves = definition.plan()
		return { definition, draft }
	})
}
