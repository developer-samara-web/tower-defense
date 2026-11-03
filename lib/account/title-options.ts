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
// Пока титулы открыты всем, поэтому цвета разносятся по спектру: соседние
// оттенки сливаются в списках игроков и в табе выбора.
export const TITLE_OPTIONS: TitleOption[] = [
	{ id: 'alphatester', label: 'Альфатестер', color: '#6fd8ff' },
	{ id: 'rookie', label: 'Новобранец', color: '#a6c95c' },
	{ id: 'firstblood', label: 'Первая кровь', color: '#ff6b6b' },
	{ id: 'ironwall', label: 'Железная стена', color: '#c3ccd8' },
	{ id: 'dragonbane', label: 'Драконоборец', color: '#ff9440' },
	{ id: 'nightfall', label: 'Владыка ночи', color: '#b07cff' },
	{ id: 'sunlord', label: 'Повелитель солнца', color: '#ffd24a' },
	{ id: 'frostmind', label: 'Ледяной разум', color: '#5ce6d2' },
	{ id: 'legend', label: 'Легенда замка', color: '#ff4fa3' },
]

export function titleOption(id: string | null | undefined): TitleOption | null {
	return TITLE_OPTIONS.find((item) => item.id === id) ?? null
}

export function isTitleId(value: unknown): value is string {
	return (
		value === NO_TITLE || (typeof value === 'string' && TITLE_OPTIONS.some((item) => item.id === value))
	)
}
