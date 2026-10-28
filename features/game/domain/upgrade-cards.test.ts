import assert from 'node:assert/strict'
import test from 'node:test'
import { BURN_DURATION } from '../config/game.config.ts'
import { createEmptyBuffs } from './game-rules.ts'
import {
	applyUpgradeCard,
	generateUpgradeCards,
	guaranteedRarity,
	RARITY_WEIGHTS,
	UPGRADE_POOL,
	type UpgradeCard,
} from './upgrade-cards.ts'

const card = (overrides: Partial<UpgradeCard>): UpgradeCard => ({
	id: 'test',
	rarity: 'B',
	type: 'fire',
	name: 'Тестовая карта',
	description: '',
	effect: 'damage',
	value: 0,
	...overrides,
})

test('guarantees S once every 30 waves and A every 10', () => {
	assert.equal(guaranteedRarity(30), 'S')
	assert.equal(guaranteedRarity(60), 'S')
	assert.equal(guaranteedRarity(10), 'A')
	assert.equal(guaranteedRarity(20), 'A')
	assert.equal(guaranteedRarity(29), null)
	assert.equal(guaranteedRarity(0), null)
})

test('generates the requested number of unique cards', () => {
	const cards = generateUpgradeCards(3, { wave: 0 })

	assert.equal(cards.length, 3)
	assert.equal(new Set(cards.map((item) => item.id)).size, 3)
	assert.ok(cards.every((item) => item.description.length > 0))
})

test('includes a guaranteed high-tier card on milestone waves', () => {
	assert.ok(generateUpgradeCards(3, { wave: 30 }).some((item) => item.rarity === 'S'))
	assert.ok(generateUpgradeCards(3, { wave: 10 }).some((item) => item.rarity === 'A'))
})

test('has cards of every rarity for every tower and rarer cards are scarcer', () => {
	for (const rarity of ['S', 'A', 'B', 'C'] as const) {
		for (const type of ['ice', 'fire', 'earth'] as const) {
			assert.ok(
				UPGRADE_POOL.some((item) => item.rarity === rarity && item.type === type),
			)
		}
	}

	assert.ok(RARITY_WEIGHTS.S < RARITY_WEIGHTS.A)
	assert.ok(RARITY_WEIGHTS.A < RARITY_WEIGHTS.B)
	assert.ok(RARITY_WEIGHTS.B < RARITY_WEIGHTS.C)
})

test('applies attack modifiers and clamps their limits', () => {
	const base = createEmptyBuffs()

	const crit = applyUpgradeCard(base, card({ effect: 'crit', value: 60 }))
	assert.equal(crit.fire.crit, 0.6)
	assert.equal(applyUpgradeCard(crit, card({ effect: 'crit', value: 50 })).fire.crit, 0.75)

	const burn = applyUpgradeCard(base, card({ effect: 'burn', value: 12 }))
	assert.equal(burn.fire.burn, 12)
	assert.equal(burn.fire.burnDuration, BURN_DURATION)

	const chain = applyUpgradeCard(base, card({ effect: 'chain', value: 2 }))
	assert.equal(chain.fire.chain, 2)
	assert.equal(applyUpgradeCard(chain, card({ effect: 'chain', value: 3 })).fire.chain, 4)

	const execute = applyUpgradeCard(base, card({ effect: 'execute', value: 15 }))
	assert.equal(execute.fire.execute, 0.15)
	assert.equal(
		applyUpgradeCard(execute, card({ effect: 'execute', value: 60 })).fire.execute,
		0.5,
	)

	const damage = applyUpgradeCard(base, card({ effect: 'damage', value: 20 }))
	assert.equal(damage.fire.damage, 1.2)

	// Карточка одного типа башни не трогает остальные.
	assert.equal(burn.ice.burn, 0)
	assert.equal(crit.ice.crit, 0)
})
