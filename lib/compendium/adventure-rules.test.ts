import assert from 'node:assert/strict'
import test from 'node:test'

import { PAR_WAVE } from '../map-points.ts'
import { RATED_MAPS } from '../rated-maps/catalog.ts'
import {
	ADVENTURE_CATALOG_IDS,
	ADVENTURE_PASS_WAVE,
	ADVENTURE_PRIZES,
	GRAND_PRIZE,
	isAdventurePassed,
	isGrandPrizeUnlocked,
	mapPrize,
} from './adventure-rules.ts'

test('тропа ведёт ровно по картам каталога и в его порядке', () => {
	assert.deepEqual(ADVENTURE_CATALOG_IDS, RATED_MAPS.map((map) => map.id))
	assert.equal(new Set(ADVENTURE_CATALOG_IDS).size, RATED_MAPS.length)
})

test('прохождение карты требует той же волны, что и практически полный забег', () => {
	assert.equal(ADVENTURE_PASS_WAVE, PAR_WAVE)
	assert.equal(isAdventurePassed(ADVENTURE_PASS_WAVE - 1), false)
	assert.equal(isAdventurePassed(ADVENTURE_PASS_WAVE), true)
	// Без забега волна приходит пустой или битой — карта не считается взятой.
	assert.equal(isAdventurePassed(Number.NaN), false)
})

test('призов ровно по одному на карту тропы плюс один главный', () => {
	const mapPrizes = ADVENTURE_PRIZES.filter((prize) => !prize.grand)
	assert.deepEqual(
		mapPrizes.map((prize) => prize.slot),
		ADVENTURE_CATALOG_IDS.map((_, index) => index + 1),
	)
	assert.equal(ADVENTURE_PRIZES.filter((prize) => prize.grand).length, 1)
	// Награды ещё не придуманы: слот обязан честно говорить о заглушке.
	assert.match(mapPrize(1).note, /не выбрана/)
	assert.equal(GRAND_PRIZE.grand, true)
})

test('главный приз открывается только за всю тропу', () => {
	assert.equal(isGrandPrizeUnlocked(ADVENTURE_CATALOG_IDS.length - 1), false)
	assert.equal(isGrandPrizeUnlocked(ADVENTURE_CATALOG_IDS.length), true)
})
