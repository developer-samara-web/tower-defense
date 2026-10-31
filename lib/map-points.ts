import type { MapDraft } from '../features/game/engine/map/custom-map.ts'

// osu!-подобная схема рейтинга: у карты есть звёзды сложности, каждый забег
// приносит очки, а рейтинг игрока — взвешенная сумма его лучших результатов
// на разных картах. Логику держим чистой функцией без БД: её же рисует
// интерфейс, и её же считает сервер при записи забега.

// Волна, на которой забег считается «пройденным почти полностью»: дальше
// очки растут всё медленнее, как в osu! после полного прохождения.
export const PAR_WAVE = 25
// Масштаб очков: одна карта средней сложности стоит сотни очков.
export const POINTS_BASE = 26
// Сложность влияет на очки сильнее, чем линейно, — как star rating в osu!.
export const STAR_EXPONENT = 1.7
export const MIN_STARS = 1
export const MAX_STARS = 10
// Каждый следующий лучший результат карты весит в 0.95 раза меньше прошлого.
export const RATING_DECAY = 0.95
// В общий рейтинг идут только топ-100 карт, как в osu!.
export const RATING_MAPS_LIMIT = 100
// Небольшая прибавка за количество карт, на которых есть результат.
export const BONUS_MAX = 40
export const BONUS_MAPS = 500

export const DIFFICULTY_LABEL_STARS: Record<string, number> = {
	'Лёгкая': 2,
	'Средняя': 4,
	'Трудная': 6.5,
	'Экстремальная': 8.5,
}

export type MapDifficulty = {
	spawners: number
	// Сколько монстров казармы выпускают суммарно за волну.
	troops: number
	health: number
	speed: number
	// Средний рост характеристик в процентах за каждую волну.
	growth: number
	castleHp: number
	roadCells: number
	boardCells: number
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const finite = (value: number, fallback: number) =>
	Number.isFinite(value) ? Math.max(0, value) : fallback

// Карты редактора считаем по их данным: давление атаки минус то, что карта
// сама даёт обороне (длинная дорога, большое поле, толстый замок).
export function difficultyFromDraft(draft: MapDraft): MapDifficulty {
	const spawners = draft.spawners ?? []
	// Список волн может множить характеристики — учитываем самый жирный забег.
	const list = draft.waves?.useCommon === false ? draft.waves.waves : []
	const hpScale = list.length ? Math.max(...list.map((w) => finite(w.health, 100))) / 100 : 1
	const countScale = list.length ? Math.max(...list.map((w) => finite(w.count, 100))) / 100 : 1

	let troops = 0
	let healthSum = 0
	let speedSum = 0
	let growthSum = 0
	let growthCount = 0

	for (const spawner of spawners) {
		const growth = spawner.growth
		if (growth) {
			growthSum += (finite(growth.health, 0) + finite(growth.speed, 0) + finite(growth.count, 0)) / 3
			growthCount += 1
		}
		for (const troop of spawner.troops ?? []) {
			const count = finite(troop.count, 0)
			troops += count
			healthSum += count * finite(troop.health, 0)
			speedSum += count * finite(troop.speed, 0)
		}
	}

	const avgHealth = troops > 0 ? healthSum / troops : 0
	const avgSpeed = troops > 0 ? speedSum / troops : 0

	return {
		spawners: spawners.length,
		troops: troops * countScale,
		health: avgHealth * hpScale,
		speed: avgSpeed,
		growth: growthCount > 0 ? growthSum / growthCount : 0,
		castleHp: finite(draft.castle?.hp ?? 20, 20),
		// Без нарисованных дорог маршруты строит движок — берём оценочную длину.
		roadCells: draft.roadCells?.length || spawners.length * 12,
		boardCells: finite(draft.cols, 100) * finite(draft.rows, 100),
	}
}

export function mapStars(difficulty: MapDifficulty): number {
	const pressure =
		difficulty.spawners * 1.1 +
		difficulty.troops * 0.05 +
		(difficulty.health / 100) * 0.9 +
		(difficulty.speed / 60) * 0.35 +
		difficulty.growth * 0.02

	const relief =
		Math.min(finite(difficulty.roadCells, 0), 900) * 0.0015 +
		(finite(difficulty.boardCells, 0) / 10_000) * 0.35 +
		Math.log10(Math.max(finite(difficulty.castleHp, 1), 1)) * 0.45

	const raw = Math.max(pressure - relief, 0)
	return round2(clamp(MIN_STARS + Math.log(1 + raw) * 2.4, MIN_STARS, MAX_STARS))
}

// Старые карты описаны только словом сложности — звёзды берём из него.
export function starsFromDifficultyLabel(label: string | undefined): number {
	return DIFFICULTY_LABEL_STARS[label ?? ''] ?? DIFFICULTY_LABEL_STARS['Средняя']
}

export function runPoints(input: {
	stars: number
	wave: number
	lives: number
	maxLives: number
}): number {
	const wave = finite(input.wave, 0)
	const stars = clamp(finite(input.stars, MIN_STARS), MIN_STARS, MAX_STARS)
	const progress = 1 - Math.exp(-wave / PAR_WAVE)
	// Замок цел до конца забега — аналог полного прохождения без ошибок.
	const hold = input.maxLives > 0 ? clamp(input.lives / input.maxLives, 0, 1) : 0
	return Math.round(POINTS_BASE * Math.pow(stars, STAR_EXPONENT) * progress * (0.6 + 0.4 * hold))
}

// Общий рейтинг игрока: лучшие результаты по разным картам с затуханием 0.95
// плюс маленькая прибавка за широту коллекции карт.
export function playerRating(mapPoints: number[]): number {
	const sorted = mapPoints
		.map((points) => finite(points, 0))
		.filter((points) => points > 0)
		.sort((a, b) => b - a)
		.slice(0, RATING_MAPS_LIMIT)

	let total = 0
	sorted.forEach((points, index) => {
		total += points * Math.pow(RATING_DECAY, index)
	})

	return Math.round(total + BONUS_MAX * (1 - Math.exp(-sorted.length / BONUS_MAPS)))
}

function round2(value: number) {
	return Math.round(value * 100) / 100
}
