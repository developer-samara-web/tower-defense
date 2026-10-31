import {
	WAVE_HP_GROWTH,
	WAVE_SPEED_GROWTH,
	WAVE_SPEED_GROWTH_CAP,
} from '../../config/game.config.ts'
import type {
	GameMap,
	MapWaves,
	SpawnerGrowth,
	SpawnerTroop,
} from './game-map.ts'

// Для плана волны нужны только казармы и настройки волн, поэтому черновик
// карты из редактора подходит сюда без приведения к GameMap.
export type WaveSourceMap = Pick<GameMap, 'spawners' | 'waves'>

export type WaveModifiers = {
	// Множители характеристик монстров относительно базовых в казарме.
	health: number
	speed: number
	count: number
}

export type WaveSpawnUnit = {
	spawnerIndex: number
	troop: SpawnerTroop
}

const COMMON_MODIFIERS: WaveModifiers = { health: 1, speed: 1, count: 1 }

// Общие параметры: характеристики растут с номером волны по тем же
// правилам, что и на картах по сиду. Свой список волн использует
// проценты выбранной волны, а после последней повторяет её настройку.
// growth — личный рост одной казармы: проценты к каждому множителю
// за каждую следующую волну поверх настроек карты. Рост начисляется от
// уже достигнутого значения, поэтому множитель растёт как сложный процент.
export function waveModifiers(
	plan: MapWaves | undefined,
	wave: number,
	growth?: SpawnerGrowth,
): WaveModifiers {
	const safeWave = Math.max(1, Math.trunc(wave))
	const base = planModifiers(plan, safeWave)
	if (!growth) return base

	const level = safeWave - 1
	return {
		health: base.health * Math.pow(1 + growth.health / 100, level),
		speed: base.speed * Math.pow(1 + growth.speed / 100, level),
		count: base.count * Math.pow(1 + growth.count / 100, level),
	}
}

function planModifiers(plan: MapWaves | undefined, safeWave: number): WaveModifiers {
	if (!plan || plan.useCommon || plan.waves.length === 0) {
		const level = safeWave - 1
		return {
			...COMMON_MODIFIERS,
			health: 1 + level * WAVE_HP_GROWTH,
			speed: 1 + Math.min(level, WAVE_SPEED_GROWTH_CAP) * WAVE_SPEED_GROWTH,
		}
	}

	const entry = plan.waves[Math.min(safeWave, plan.waves.length) - 1]
	if (!entry) return COMMON_MODIFIERS

	return {
		health: entry.health / 100,
		speed: entry.speed / 100,
		count: entry.count / 100,
	}
}

// Очередь появления монстров на волне: казармы выпускают своих
// монстров по очереди, виды внутри казармы чередуются.
const UNIT_CACHE = new WeakMap<WaveSourceMap, Map<number, WaveSpawnUnit[]>>()

export function waveSpawnUnits(map: WaveSourceMap, wave: number): WaveSpawnUnit[] {
	const safeWave = Math.max(1, Math.trunc(wave))
	let cached = UNIT_CACHE.get(map)
	if (!cached) {
		cached = new Map()
		UNIT_CACHE.set(map, cached)
	}

	const ready = cached.get(safeWave)
	if (ready) return ready

	// Свой набор индексов видов на каждую казарму: внутри неё монстры
	// идут по кругу, поэтому виды смешиваются, а не выходят блоками.
	const queues = map.spawners.map((spawner) => {
		if (spawner.troops.length === 0) return []

		// Множитель количества считается для казармы: её личный рост
		// влияет и на число монстров.
		const modifiers = waveModifiers(map.waves, safeWave, spawner.growth)
		const total = spawner.troops.reduce(
			(sum, troop) =>
				sum + Math.max(1, Math.round(troop.count * modifiers.count)),
			0,
		)

		const queue: number[] = []
		for (let index = 0; index < total; index++) {
			queue.push(index % spawner.troops.length)
		}
		return queue
	})

	const longest = queues.reduce((max, queue) => Math.max(max, queue.length), 0)
	const units: WaveSpawnUnit[] = []

	for (let step = 0; step < longest; step++) {
		for (let spawnerIndex = 0; spawnerIndex < queues.length; spawnerIndex++) {
			const troopIndex = queues[spawnerIndex]?.[step]
			if (troopIndex === undefined) continue

			const troop = map.spawners[spawnerIndex]?.troops[troopIndex]
			if (!troop) continue

			units.push({ spawnerIndex, troop })
		}
	}

	cached.set(safeWave, units)
	return units
}

export function waveSpawnTotal(map: WaveSourceMap, wave: number) {
	return waveSpawnUnits(map, wave).length
}
