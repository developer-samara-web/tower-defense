export type TitleOption = {
	id: string
	// Подпись под ником и в списках игроков.
	label: string
	// Цвет титула: их несколько, поэтому цвет храним числом, а не классом.
	color: string
}

export const NO_TITLE = 'none'

// Список вырастет: титулы будут выдавать за выполненные задания,
// тогда у варианта появится условие получения.
export const TITLE_OPTIONS: TitleOption[] = [
	{ id: 'alphatester', label: 'Альфатестер', color: '#6fd8ff' },
]

export function titleOption(id: string | null | undefined): TitleOption | null {
	return TITLE_OPTIONS.find((item) => item.id === id) ?? null
}

export function isTitleId(value: unknown): value is string {
	return (
		value === NO_TITLE || (typeof value === 'string' && TITLE_OPTIONS.some((item) => item.id === value))
	)
}
