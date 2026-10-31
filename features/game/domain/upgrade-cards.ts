import {
	BURN_DURATION,
	CHAIN_DAMAGE_FACTOR,
	TOWER_ORDER,
	TOWER_TYPES,
	type TowerType,
} from '../config/game.config.ts'
import type { TowerBuffs } from './game-rules.ts'

// S — золото, A — фиолетовый, B — тёмно-синий, C — синий.
export type UpgradeRarity = 'S' | 'A' | 'B' | 'C'

export type UpgradeEffect =
	| 'damage'
	| 'range'
	| 'cooldown'
	| 'crit'
	| 'burn'
	| 'chain'
	| 'execute'

export type UpgradeCard = {
	id: string
	rarity: UpgradeRarity
	type: TowerType
	name: string
	description: string
	effect: UpgradeEffect
	value: number
}

export const RARITY_ORDER: UpgradeRarity[] = ['S', 'A', 'B', 'C']

export const RARITY_NAME: Record<UpgradeRarity, string> = {
	S: 'Легендарное',
	A: 'Эпическое',
	B: 'Редкое',
	C: 'Обычное',
}

// Вес выпадения каждого тира при обычном броске.
export const RARITY_WEIGHTS: Record<UpgradeRarity, number> = {
	S: 1,
	A: 9,
	B: 30,
	C: 60,
}

// Гарантированные карты: S раз в 30 волн, A — раз в 10.
export const S_RARITY_EVERY_WAVES = 30
export const A_RARITY_EVERY_WAVES = 10

function describe(effect: UpgradeEffect, value: number) {
	switch (effect) {
		case 'damage':
			return `Урон +${value}%`
		case 'range':
			return `Радиус +${value}%`
		case 'cooldown':
			return `Перезарядка −${value}%`
		case 'crit':
			return `Крит: ${value}% шанс двойного урона`
		case 'burn':
			return `Поджог: ${value} урона/с в течение ${BURN_DURATION / 1000} с`
		case 'chain':
			return `Цепь: ещё ${value} цел. на ${Math.round(CHAIN_DAMAGE_FACTOR * 100)}% урона`
		case 'execute':
			return `Добивание: враги ниже ${value}% HP гибнут сразу`
	}
}

const makeCard = (
	id: string,
	rarity: UpgradeRarity,
	type: TowerType,
	name: string,
	effect: UpgradeEffect,
	value: number,
): UpgradeCard => ({
	id,
	rarity,
	type,
	name,
	description: describe(effect, value),
	effect,
	value,
})

export const UPGRADE_POOL: UpgradeCard[] = [
	// C — базовые усиления характеристик.
	makeCard('ice-damage-c', 'C', 'ice', 'Гранёный кристалл', 'damage', 15),
	makeCard('ice-range-c', 'C', 'ice', 'Морозный луч', 'range', 10),
	makeCard('ice-cooldown-c', 'C', 'ice', 'Стужа', 'cooldown', 10),
	makeCard('fire-damage-c', 'C', 'fire', 'Раскалённое ядро', 'damage', 15),
	makeCard('fire-range-c', 'C', 'fire', 'Широкий взрыв', 'range', 10),
	makeCard('fire-cooldown-c', 'C', 'fire', 'Быстрый запал', 'cooldown', 10),
	makeCard('earth-damage-c', 'C', 'earth', 'Тяжёлый камень', 'damage', 15),
	makeCard('earth-range-c', 'C', 'earth', 'Глубокий корень', 'range', 10),
	makeCard('earth-cooldown-c', 'C', 'earth', 'Земной толчок', 'cooldown', 10),

	// B — усиления и первые модификаторы атаки.
	makeCard('ice-damage-b', 'B', 'ice', 'Ледяное копьё', 'damage', 25),
	makeCard('ice-crit-b', 'B', 'ice', 'Осколки', 'crit', 12),
	makeCard('ice-burn-b', 'B', 'ice', 'Обморожение', 'burn', 8),
	makeCard('fire-damage-b', 'B', 'fire', 'Пламя ада', 'damage', 25),
	makeCard('fire-crit-b', 'B', 'fire', 'Взрывная искра', 'crit', 12),
	makeCard('fire-burn-b', 'B', 'fire', 'Устойчивое пламя', 'burn', 12),
	makeCard('earth-damage-b', 'B', 'earth', 'Каменный кулак', 'damage', 25),
	makeCard('earth-crit-b', 'B', 'earth', 'Дробящий удар', 'crit', 12),
	makeCard('earth-burn-b', 'B', 'earth', 'Кровоточащие шипы', 'burn', 10),

	// A — заметно меняют рисунок боя.
	makeCard('ice-crit-a', 'A', 'ice', 'Абсолютный ноль', 'crit', 20),
	makeCard('ice-chain-a', 'A', 'ice', 'Ледяная цепь', 'chain', 1),
	makeCard('fire-burn-a', 'A', 'fire', 'Пожар', 'burn', 22),
	makeCard('fire-chain-a', 'A', 'fire', 'Огненный шквал', 'chain', 1),
	makeCard('earth-burn-a', 'A', 'earth', 'Ядовитые корни', 'burn', 18),
	makeCard('earth-chain-a', 'A', 'earth', 'Сейсмическая волна', 'chain', 1),

	// S — редкие карты, за которыми стоит охотиться.
	makeCard('ice-execute-s', 'S', 'ice', 'Хрупкость', 'execute', 15),
	makeCard('ice-chain-s', 'S', 'ice', 'Мерзлотный резонанс', 'chain', 2),
	makeCard('fire-execute-s', 'S', 'fire', 'Пепел', 'execute', 15),
	makeCard('fire-chain-s', 'S', 'fire', 'Огненный смерч', 'chain', 2),
	makeCard('earth-execute-s', 'S', 'earth', 'Обвал', 'execute', 15),
	makeCard('earth-chain-s', 'S', 'earth', 'Тектонический сдвиг', 'chain', 2),
]

// Какая редкость гарантирована на этой волне, если есть.
export function guaranteedRarity(wave: number): UpgradeRarity | null {
	const safeWave = Math.max(0, Math.trunc(wave))
	if (safeWave === 0) return null
	if (safeWave % S_RARITY_EVERY_WAVES === 0) return 'S'
	if (safeWave % A_RARITY_EVERY_WAVES === 0) return 'A'
	return null
}

function rollRarity(): UpgradeRarity {
	const total = RARITY_ORDER.reduce(
		(sum, rarity) => sum + RARITY_WEIGHTS[rarity],
		0,
	)
	let roll = Math.random() * total

	for (const rarity of RARITY_ORDER) {
		roll -= RARITY_WEIGHTS[rarity]
		if (roll < 0) return rarity
	}

	return 'C'
}

function shuffle<T>(items: readonly T[]): T[] {
	const rest = [...items]

	for (let i = rest.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		const keep = rest[i]!
		rest[i] = rest[j]!
		rest[j] = keep
	}

	return rest
}

// Сколько карт показывают за уровень. Столько же, сколько типов башен:
// в наборе не бывает двух усилений для одной башни.
export const UPGRADE_CHOICES = TOWER_ORDER.length

// Обновление набора стоит долю запаса золота, но не меньше минимума.
export const UPGRADE_REROLL_RATE = 0.15
export const UPGRADE_REROLL_MIN_COST = 1000

export function upgradeRerollCost(gold: number) {
	return Math.max(
		UPGRADE_REROLL_MIN_COST,
		Math.round(Math.max(0, gold) * UPGRADE_REROLL_RATE),
	)
}

// Собирает набор: не больше одной карты на тип башни. Гарантированная
// карта тира закрывает один из типов, остальные добираем по весам.
export function generateUpgradeCards(
	count = UPGRADE_CHOICES,
	options: { wave?: number } = {},
): UpgradeCard[] {
	const cards: UpgradeCard[] = []
	const used = new Set<string>()

	function take(predicate: (card: UpgradeCard) => boolean) {
		const candidates = UPGRADE_POOL.filter(
			(card) => !used.has(card.id) && predicate(card),
		)
		if (candidates.length === 0) return false

		const card = candidates[Math.floor(Math.random() * candidates.length)]
		used.add(card.id)
		cards.push({ ...card })
		return true
	}

	const guaranteed = guaranteedRarity(options.wave ?? 0)
	if (guaranteed) take((card) => card.rarity === guaranteed)

	for (const type of shuffle(TOWER_ORDER)) {
		if (cards.length >= count) break
		if (cards.some((card) => card.type === type)) continue

		const rarity = rollRarity()
		if (take((card) => card.type === type && card.rarity === rarity)) continue

		// Пул этого тира для башни пуст — берём любую её карту.
		take((card) => card.type === type)
	}

	return cards
}

// Применяет карточку к постоянным бонусам башен и возвращает новое состояние.
export function applyUpgradeCard(buffs: TowerBuffs, card: UpgradeCard): TowerBuffs {
	const next = { ...buffs[card.type] }

	switch (card.effect) {
		case 'damage':
			next.damage *= 1 + card.value / 100
			break
		case 'range':
			next.range *= 1 + card.value / 100
			break
		case 'cooldown':
			next.speed *= Math.max(0.1, 1 - card.value / 100)
			break
		case 'crit':
			next.crit = Math.min(0.75, next.crit + card.value / 100)
			break
		case 'burn':
			next.burn += card.value
			break
		case 'chain':
			next.chain = Math.min(4, next.chain + card.value)
			break
		case 'execute':
			next.execute = Math.min(0.5, next.execute + card.value / 100)
			break
	}

	return { ...buffs, [card.type]: next }
}

export function upgradeCardTitle(card: UpgradeCard) {
	return `${TOWER_TYPES[card.type].name}: ${card.name}`
}
