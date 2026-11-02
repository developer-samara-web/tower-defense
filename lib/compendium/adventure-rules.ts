import { PAR_WAVE } from '../map-points.ts'
import { RATED_MAPS } from '../rated-maps/catalog.ts'

// Компендиум «Приключения»: десять рейтинговых карт каталога лежат на
// пиратской тропе по порядку — от самой мягкой к самой злой. За каждую
// пройденную карту дают приз, за всю тропу — главный.
//
// Что именно игрок получает, ещё не решено, поэтому призы — заглушки:
// здесь только номер слота и подпись. Когда награды согласуем, правим
// этот файл, а не интерфейс.

// Карта пройдена, когда замок удержал её до волны, на которой забег
// считается практически полным. Линия взята из очков рейтинга: награды
// не будут требовать большего, чем рейтинг за ту же карту.
export const ADVENTURE_PASS_WAVE = PAR_WAVE

// Порядок тропы совпадает с порядком каталога: тест следит, чтобы ни одна
// карта с маршрута не пропала и не встала на нём дважды.
export const ADVENTURE_CATALOG_IDS: string[] = RATED_MAPS.map((map) => map.id)

export type AdventurePrize = {
	// Номер карты на тропе (1..10). У главного приза номера нет.
	slot: number
	title: string
	note: string
	grand: boolean
}

export function mapPrize(order: number): AdventurePrize {
	return {
		slot: order,
		title: `Приз ${order}`,
		note: 'Награда за эту карту ещё не выбрана',
		grand: false,
	}
}

export const GRAND_PRIZE: AdventurePrize = {
	slot: 0,
	title: 'Главный приз',
	note: 'Откроется, когда за спиной вся тропа',
	grand: true,
}

// Один приз на каждую карту тропы и один — за всю тропу.
export const ADVENTURE_PRIZES: AdventurePrize[] = [
	...ADVENTURE_CATALOG_IDS.map((_, index) => mapPrize(index + 1)),
	GRAND_PRIZE,
]

export function isAdventurePassed(wave: number): boolean {
	return Number.isFinite(wave) && wave >= ADVENTURE_PASS_WAVE
}

// Главный приз — за все карты, поэтому требовать больше десяти
// прохождений он не может.
export function isGrandPrizeUnlocked(passed: number): boolean {
	return passed >= ADVENTURE_CATALOG_IDS.length
}

// Типы доски тропы. Держим их в чистом модуле: интерфейс читает их же,
// а серверный сборщик не тянет mongoose в клиентский бандл.

// Узел тропы: карта каталога, её место в библиотеке и результат игрока.
export type AdventureNode = {
	order: number
	catalogId: string
	// null, если карта каталога ещё не опубликована: идти на такую нельзя.
	mapId: string | null
	name: string
	difficulty: string
	previewColor: string
	idea: string
	stars: number
	passed: boolean
	bestWave: number
	bestPoints: number
	plays: number
}

export type AdventurePrizeView = AdventurePrize & { unlocked: boolean }

export type AdventureBoard = {
	nodes: AdventureNode[]
	passed: number
	total: number
	// Волна, которую нужно удержать, чтобы карта засчиталась пройденной.
	passWave: number
	prizes: AdventurePrizeView[]
	grandUnlocked: boolean
}
