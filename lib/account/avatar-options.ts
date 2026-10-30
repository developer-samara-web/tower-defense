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

// Портреты лежат в public/users/avatars, рамки — в public/users/framings.
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
	src: `/users/avatars/${id}.png`,
}))

// Первая позиция — «без рамки»: id сохраняется, картинки нет.
export const FRAME_OPTIONS: FrameOption[] = [
	{ id: 'none', label: 'Без рамки', src: null },
	...FRAME_LABELS.map(([label, id]) => ({
		id,
		label,
		src: `/users/framings/${id}.png`,
	})),
]

export const DEFAULT_AVATAR = AVATAR_OPTIONS[0].id
export const DEFAULT_FRAME = 'none'

export function avatarSrc(id: string | null | undefined) {
	const option = AVATAR_OPTIONS.find((item) => item.id === id)
	return (option ?? AVATAR_OPTIONS[0]).src
}

export function frameSrc(id: string | null | undefined) {
	return FRAME_OPTIONS.find((item) => item.id === id)?.src ?? null
}

export function isAvatarId(value: unknown): value is string {
	return typeof value === 'string' && AVATAR_OPTIONS.some((item) => item.id === value)
}

export function isFrameId(value: unknown): value is string {
	return typeof value === 'string' && FRAME_OPTIONS.some((item) => item.id === value)
}
