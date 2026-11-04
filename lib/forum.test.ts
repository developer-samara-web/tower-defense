import assert from 'node:assert/strict'
import test from 'node:test'

import {
	FORUM_TABS,
	formatForumDate,
	forumCategoryLabel,
	forumTab,
	readForumCategory,
	readUserText,
} from './forum.ts'

test('forum keeps three sections with stable labels', () => {
	assert.deepEqual(
		FORUM_TABS.map((tab) => tab.id),
		['updates', 'game', 'maps'],
	)
	assert.equal(forumCategoryLabel('updates'), 'Обновления')
	assert.equal(forumCategoryLabel('game'), 'Игра')
	assert.equal(forumCategoryLabel('maps'), 'Карты')
})

test('unknown section falls back to game tab', () => {
	assert.equal(forumTab('maps').id, 'maps')
	// Формально тип не даст сюда попасть, но защита от старых ссылок
	// и битых значений не должна ронять страницу.
	assert.equal(forumTab('unknown' as never).id, 'game')
})

test('reads only known forum categories', () => {
	assert.equal(readForumCategory('updates'), 'updates')
	assert.equal(readForumCategory('game'), 'game')
	assert.equal(readForumCategory('maps'), 'maps')
	assert.equal(readForumCategory('offtopic'), null)
	assert.equal(readForumCategory(null), null)
	assert.equal(readForumCategory(42), null)
})

test('trims user text and enforces bounds', () => {
	assert.equal(readUserText('  привет  ', 20), 'привет')
	assert.equal(readUserText('  ', 20), null)
	assert.equal(readUserText('ab', 20, 3), null)
	assert.equal(readUserText('abc', 20, 3), 'abc')
	assert.equal(readUserText('a'.repeat(21), 20), null)
	assert.equal(readUserText(123, 20), null)
})

test('invalid date does not break the feed', () => {
	assert.equal(formatForumDate('not-a-date'), '')
})
