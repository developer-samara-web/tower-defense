import { TOWER_TYPES, type TowerType } from '../config/game.config'
import type { TowerBuffs } from './game-rules'

export type UpgradeEffect = 'damage' | 'range' | 'cooldown'

export type UpgradeCard = {
	id: string
	type: TowerType
	name: string
	description: string
	effect: UpgradeEffect
	value: number
}

const makeCard = (
	id: string,
	type: TowerType,
	name: string,
	effect: UpgradeEffect,
	value: number,
): UpgradeCard => ({
	id,
	type,
	name,
	description:
		effect === 'damage'
			? `Урон +${value}%`
			: effect === 'range'
				? `Радиус +${value}%`
				: `Перезарядка −${value}%`,
	effect,
	value,
})

export const UPGRADE_POOL: UpgradeCard[] = [
	makeCard('ice-damage', 'ice', 'Кристалл льда', 'damage', 20),
	makeCard('ice-range', 'ice', 'Длинный луч', 'range', 15),
	makeCard('ice-cooldown', 'ice', 'Ледяной вихрь', 'cooldown', 15),
	makeCard('fire-damage', 'fire', 'Пламя ада', 'damage', 25),
	makeCard('fire-range', 'fire', 'Взрывной круг', 'range', 15),
	makeCard('fire-cooldown', 'fire', 'Быстрый огонь', 'cooldown', 15),
	makeCard('earth-damage', 'earth', 'Каменный кулак', 'damage', 20),
	makeCard('earth-range', 'earth', 'Глубокий корень', 'range', 15),
	makeCard('earth-cooldown', 'earth', 'Земной толчок', 'cooldown', 15),
]

// Перемешивает копию пула и берёт count уникальных карточек.
export function generateUpgradeCards(count = 3): UpgradeCard[] {
	const pool = [...UPGRADE_POOL]

	for (let i = pool.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[pool[i], pool[j]] = [pool[j], pool[i]]
	}

	return pool.slice(0, Math.min(count, pool.length)).map((card) => ({ ...card }))
}

// Применяет карточку к постоянным бонусам башен и возвращает новое состояние.
export function applyUpgradeCard(buffs: TowerBuffs, card: UpgradeCard): TowerBuffs {
	const current = buffs[card.type]
	const next = { ...buffs, [card.type]: { ...current } }

	if (card.effect === 'damage') {
		next[card.type].damage *= 1 + card.value / 100
	} else if (card.effect === 'range') {
		next[card.type].range *= 1 + card.value / 100
	} else {
		next[card.type].speed *= Math.max(0.1, 1 - card.value / 100)
	}

	return next
}

export function upgradeCardTitle(card: UpgradeCard) {
	return `${TOWER_TYPES[card.type].name}: ${card.name}`
}
