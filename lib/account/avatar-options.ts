export type AvatarOption = {
	id: string
	label: string
	src: string
}

export type FrameOption = {
	id: string
	label: string
	src: string | null
}

// Портреты лежат в public/avatars, рамки — в public/avatars/frames.
// Порядок id совпадает с нумерацией файлов, поэтому новую картинку
// достаточно положить в папку и дописать строкой ниже.
const AVATAR_LABELS: Array<[string, string]> = [
	['Страж', 'avatar-1'],
	['Лучница', 'avatar-2'],
	['Маг', 'avatar-3'],
	['Дварф', 'avatar-4'],
	['Тень', 'avatar-5'],
	['Демонесса', 'avatar-6'],
	['Лич', 'avatar-7'],
	['Орк', 'avatar-8'],
	['Жрица', 'avatar-9'],
	['Драконид', 'avatar-10'],
]

const FRAME_LABELS: Array<[string, string]> = [
	['Орден', 'framing-1'],
	['Лоза', 'framing-2'],
	['Аметист', 'framing-3'],
	['Мечи', 'framing-4'],
	['Сталь', 'framing-5'],
	['Инферно', 'framing-6'],
	['Морг', 'framing-7'],
	['Кровь', 'framing-8'],
	['Солнце', 'framing-9'],
	['Иней', 'framing-10'],
]

export const AVATAR_OPTIONS: AvatarOption[] = AVATAR_LABELS.map(([label, id]) => ({
	id,
	label,
	src: `/avatars/${id}.png`,
}))

// Первая позиция — «без рамки»: id сохраняется, картинки нет.
export const FRAME_OPTIONS: FrameOption[] = [
	{ id: 'none', label: 'Без рамки', src: null },
	...FRAME_LABELS.map(([label, id]) => ({
		id,
		label,
		src: `/avatars/frames/${id}.png`,
	})),
]

// Аватар и рамка по умолчанию выдаются при регистрации. В диалоге выбора
// их нет: игрок всегда берёт один из готовых образов.
const DEFAULT_AVATAR_SRC = '/avatars/avatar-default.png'
const DEFAULT_FRAME_SRC = '/avatars/frames/framing-default.png'

export const DEFAULT_AVATAR = 'default'
export const DEFAULT_FRAME = 'default'

export function avatarSrc(id: string | null | undefined) {
	if (id === DEFAULT_AVATAR) return DEFAULT_AVATAR_SRC
	const option = AVATAR_OPTIONS.find((item) => item.id === id)
	return (option ?? AVATAR_OPTIONS[0]).src
}

export function frameSrc(id: string | null | undefined) {
	if (id === DEFAULT_FRAME) return DEFAULT_FRAME_SRC
	return FRAME_OPTIONS.find((item) => item.id === id)?.src ?? null
}

export function isAvatarId(value: unknown): value is string {
	return (
		value === DEFAULT_AVATAR ||
		(typeof value === 'string' && AVATAR_OPTIONS.some((item) => item.id === value))
	)
}

export function isFrameId(value: unknown): value is string {
	return (
		value === DEFAULT_FRAME ||
		(typeof value === 'string' && FRAME_OPTIONS.some((item) => item.id === value))
	)
}
