import type { ForumCategory } from '@/types'

// Разделы мини-форума. Список общий для страницы и API: подписи не должны
// разъезжаться с допустимыми значениями category.
export const FORUM_TABS: Array<{
	id: ForumCategory
	label: string
	hint: string
}> = [
	{
		id: 'updates',
		label: 'Обновления',
		hint: 'Журнал версий и разговоры о том, что изменилось в игре.',
	},
	{
		id: 'game',
		label: 'Игра',
		hint: 'Режимы, баланс, башни, волны и всё, что происходит в бою.',
	},
	{
		id: 'maps',
		label: 'Карты',
		hint: 'Рейтинговые поля, своя библиотека и обсуждение карт сообщества.',
	},
]

export function forumTab(category: ForumCategory) {
	return FORUM_TABS.find((tab) => tab.id === category) ?? FORUM_TABS[1]
}

export function forumCategoryLabel(category: ForumCategory): string {
	return forumTab(category).label
}

export function readForumCategory(value: unknown): ForumCategory | null {
	return value === 'updates' || value === 'game' || value === 'maps' ? value : null
}

// Текст от игрока: обрезаем пробелы и проверяем границы. null означает
// «некорректно», чтобы роут ответил понятной ошибкой, а не сохранил пустоту.
export function readUserText(value: unknown, max: number, min = 1): string | null {
	if (typeof value !== 'string') return null
	const text = value.trim()
	if (text.length < min || text.length > max) return null
	return text
}

// Короткая дата сообщения: в ленте не нужен год у свежих тем.
export function formatForumDate(iso: string): string {
	const date = new Date(iso)
	if (Number.isNaN(date.getTime())) return ''

	const now = new Date()
	const sameYear = date.getFullYear() === now.getFullYear()
	return new Intl.DateTimeFormat('ru-RU', {
		day: 'numeric',
		month: 'short',
		...(sameYear ? {} : { year: 'numeric' }),
		hour: '2-digit',
		minute: '2-digit',
	}).format(date)
}
