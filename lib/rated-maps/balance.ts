import {
	CELL_SIZE,
	CUSTOM_ENEMY_SPAWN_INTERVAL,
	ENEMY_GROUP_SPAWN_INTERVAL,
	ENEMY_TYPES,
	WAVE_REWARD_GROWTH,
	type EnemyType,
} from '../../features/game/config/game.config.ts'
import {
	enemyGroupSize,
	enemySpawnInterval,
	enemyStats,
	waveCompletionReward,
	waveEnemyCount,
} from '../../features/game/domain/game-rules.ts'
import { spawnerRoads, type MapDraft, type MapSpawner } from '../../features/game/engine/map/custom-map.ts'
import { waveModifiers } from '../../features/game/engine/map/custom-waves.ts'

// Баланс карты меряем не «на глаз», а по тому же потоку, что считает бой:
// сколько HP приходит в секунду против сколько секунд у игрока в запасе.
// За эталон силы обороны берём базовую игру: игрок, который держит
// обычные волны на N-й волне, имеет ровно столько урона, сколько требует
// базовая волна. Карта честна, пока её требование не выше этой планки.

export type WaveStream = {
	wave: number
	units: number
	// Суммарное HP волны.
	hp: number
	// Средняя скорость монстра в пикселях в секунду.
	speed: number
	// Сколько секунд идёт выпуск волны.
	spawnSeconds: number
	// Сколько секунд первый монстр идёт до замка.
	travelSeconds: number
	// HP в секунду, которые обязан выдерживать урон обороны.
	demandDps: number
	// Золото, которое волна приносит целиком.
	gold: number
	// Сколько прочности замка вырвет волна, если пустить всех.
	leak: number
	// Виды монстров волны — по ним судим ротацию.
	types: EnemyType[]
}

// Длина маршрута по нарисованной дороге: сумма клеток всех участков.
export function routeLengthCells(draft: MapDraft): number {
	let longest = 0

	for (const entry of spawnerRoads(draft)) {
		const road = entry.road
		if (!road) continue

		let cells = 0
		for (let i = 0; i < road.length - 1; i++) {
			const [ax, ay] = road[i]!
			const [bx, by] = road[i + 1]!
			cells += Math.abs(bx - ax) + Math.abs(by - ay)
		}

		longest = Math.max(longest, cells)
	}

	return longest
}

// Поток пользовательской карты: движок выпускает монстров ровной
// чередой по одному за CUSTOM_ENEMY_SPAWN_INTERVAL.
// Очередь казармы идёт по кругу, поэтому доля вида считается от всего
// выпуска казармы, а не от его собственной численности.
function spawnerRelease(spawner: MapSpawner, countScale: number) {
	const troops = spawner.troops
	if (troops.length === 0) return []

	const total = troops.reduce(
		(sum, troop) => sum + Math.max(1, Math.round(troop.count * countScale)),
		0,
	)
	const base = Math.floor(total / troops.length)
	const extra = total % troops.length

	return troops.map((troop, index) => ({
		troop,
		count: base + (index < extra ? 1 : 0),
	}))
}

export function customStream(draft: MapDraft, wave: number, pathCells: number): WaveStream {
	const level = Math.max(0, wave - 1)
	let units = 0
	let hp = 0
	let speedSum = 0
	let gold = 0
	let leak = 0
	const types = new Set<EnemyType>()

	for (const spawner of draft.spawners) {
		const modifiers = waveModifiers(draft.waves, wave, spawner.growth)

		for (const release of spawnerRelease(spawner, modifiers.count)) {
			const health = Math.max(1, Math.round(release.troop.health * modifiers.health))
			const speed = Math.max(1, release.troop.speed * modifiers.speed)
			const reward = Math.round(
				ENEMY_TYPES[release.troop.type].reward * (1 + level * WAVE_REWARD_GROWTH),
			)

			units += release.count
			hp += health * release.count
			speedSum += speed * release.count
			gold += reward * release.count
			leak += release.troop.strength * release.count
			types.add(release.troop.type)
		}
	}

	const avgSpeed = units > 0 ? speedSum / units : 1
	const spawnSeconds = (units * CUSTOM_ENEMY_SPAWN_INTERVAL) / 1000
	const travelSeconds = (pathCells * CELL_SIZE) / avgSpeed

	return {
		wave,
		units,
		hp,
		speed: avgSpeed,
		spawnSeconds,
		travelSeconds,
		demandDps: hp / (spawnSeconds + travelSeconds),
		gold,
		leak,
		types: Array.from(types),
	}
}

// Поток базовой карты с тем же маршрутом: эталон того, сколько урона
// игрок успевает накопить к этой волне.
export function baseStream(wave: number, pathCells: number): WaveStream {
	const count = waveEnemyCount(wave)
	const group = Math.max(1, enemyGroupSize(wave))
	const groups = Math.ceil(count / group)
	let hp = 0
	let speedSum = 0
	let gold = 0
	const types = new Set<EnemyType>()

	for (let index = 0; index < count; index++) {
		const stats = enemyStats(wave, index)
		hp += stats.hp
		speedSum += stats.speed
		gold += stats.reward
		types.add(stats.type)
	}

	const avgSpeed = count > 0 ? speedSum / count : 1
	// Между группами пауза enemySpawnInterval, внутри группы — короткий шаг.
	const spawnSeconds =
		(groups * enemySpawnInterval(wave) + count * ENEMY_GROUP_SPAWN_INTERVAL) / 1000
	const travelSeconds = (pathCells * CELL_SIZE) / avgSpeed

	return {
		wave,
		units: count,
		hp,
		speed: avgSpeed,
		spawnSeconds,
		travelSeconds,
		demandDps: hp / (spawnSeconds + travelSeconds),
		gold,
		leak: count,
		types: Array.from(types),
	}
}

// Золото к началу волны: стартовый запас плюс награды за убийства
// (с коэффициентом добора) и бонус за каждую закрытую волну.
export function goldByWave(streams: readonly WaveStream[], startGold: number, wave: number) {
	let gold = startGold

	for (const stream of streams) {
		if (stream.wave >= wave) break
		gold += stream.gold * 0.95 + waveCompletionReward(stream.wave)
	}

	return gold
}

export type BaseCurve = {
	streams: WaveStream[]
	gold: number[]
	// Планка урона, которую игрок держит на базовой экономике.
	power: (gold: number) => number
}

// Кривая базовой игры на маршруте данной длины: demand и золото волна за
// волной. Вынесено из отчёта, чтобы скрипты подбора балансировали по
// тем же числам, что и тесты.
export function baseCurve(
	pathCells: number,
	startGold: number,
	limit = MAX_WAVE,
): BaseCurve {
	const streams: WaveStream[] = []
	const gold: number[] = []

	for (let wave = 1; wave <= limit; wave++) {
		const stream = baseStream(wave, pathCells)
		streams.push(stream)
		gold.push(goldByWave(streams, startGold, wave))
	}

	const power = (value: number) => {
		if (value <= gold[0]!) return streams[0]!.demandDps

		for (let i = 1; i < streams.length; i++) {
			const low = gold[i - 1]!
			const high = gold[i]!
			if (value <= high) {
				const step = high > low ? (value - low) / (high - low) : 0
				return streams[i - 1]!.demandDps +
					step * (streams[i]!.demandDps - streams[i - 1]!.demandDps)
			}
		}

		// Плато: дальше растём по последней наблюдаемой динамике.
		const last = streams[streams.length - 1]!
		const previous = streams[streams.length - 2]!
		const slopeGold = gold[gold.length - 1]! - gold[gold.length - 2]!
		const slopeDps = last.demandDps - previous.demandDps
		if (slopeGold <= 0 || slopeDps <= 0) return last.demandDps

		return last.demandDps + ((value - gold[gold.length - 1]!) / slopeGold) * slopeDps
	}

	return { streams, gold, power }
}

export type BalanceReport = {
	pathCells: number
	// Планка урона, которую игрок держит на базовой экономике.
	power: (gold: number) => number
	stream: (wave: number) => WaveStream
	// Отношение требования карты к планке: > 1 — волна непроходима.
	ratio: (wave: number) => number
	// Последняя волна, которую карта ещё можно держать.
	horizon: number
	earlyRatio: number
	// Самый резкий скачок требования между соседними волнами.
	maxJump: number
	// Полное покрытие ротации: сколько волн подряд не выходит какой-то вид.
	typeGap: number
}

const MAX_WAVE = 80

// Собираем отчёт по карте. Планку силы строим на её же маршруте, чтобы
// геометрия не влияла на сравнение карт между собой.
export function analyzeMap(
	draft: MapDraft,
	startGold: number,
	options: { waves?: number } = {},
): BalanceReport {
	const pathCells = Math.max(1, routeLengthCells(draft))
	const limit = options.waves ?? MAX_WAVE
	const { power } = baseCurve(pathCells, startGold, limit)

	const mapStreams: WaveStream[] = []
	const stream = (wave: number) => {
		const cached = mapStreams.find((entry) => entry.wave === wave)
		if (cached) return cached
		const next = customStream(draft, wave, pathCells)
		mapStreams.push(next)
		return next
	}

	const ratio = (wave: number) => {
		const entry = stream(wave)
		return entry.demandDps / power(goldByWave(sorted(mapStreams, wave), startGold, wave))
	}

	let horizon = 0
	let maxJump = 0
	let previousDemand = 0
	const gaps = new Map<EnemyType, number>()
	const seen = new Set<EnemyType>()

	for (let wave = 1; wave <= limit; wave++) {
		const entry = stream(wave)
		const demand = entry.demandDps
		const ceiling = power(goldByWave(sorted(mapStreams, wave), startGold, wave))

		// Требование только растёт, а планка — нет: после двадцатикратного
		// перебора дальше считать нечего.
		if (demand > ceiling * 20) break

		if (previousDemand > 0) maxJump = Math.max(maxJump, demand / previousDemand)
		previousDemand = demand

		if (demand <= ceiling) horizon = wave

		for (const type of Object.keys(ENEMY_TYPES) as EnemyType[]) {
			if (entry.types.includes(type)) {
				gaps.set(type, 0)
				seen.add(type)
			} else {
				gaps.set(type, (gaps.get(type) ?? 0) + 1)
			}
		}
	}

	const typeGap = Array.from(gaps.entries())
		.filter(([type]) => seen.has(type))
		.reduce((max, [, gap]) => Math.max(max, gap), 0)

	return {
		pathCells,
		power,
		stream,
		ratio,
		horizon,
		earlyRatio: Math.max(ratio(1), ratio(2), ratio(3)),
		maxJump,
		typeGap,
	}
}

// Для накопления золота важен порядок, а не порядок вызовов кэша.
function sorted(streams: readonly WaveStream[], wave: number): WaveStream[] {
	return streams
		.filter((entry) => entry.wave < wave)
		.slice()
		.sort((a, b) => a.wave - b.wave)
}
