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

// Заглушки: настоящие портреты и рамки добавим позже. Пока все
// варианты показывают один и тот же файл, но выбор сохраняется.
export const AVATAR_OPTIONS: AvatarOption[] = [
	{ id: 'default', label: 'Страж', src: '/game/avatar-default.svg' },
	{ id: 'placeholder-1', label: 'Рыцарь', src: '/game/avatar-default.svg' },
	{ id: 'placeholder-2', label: 'Маг', src: '/game/avatar-default.svg' },
	{ id: 'placeholder-3', label: 'Стрелок', src: '/game/avatar-default.svg' },
]

export const FRAME_OPTIONS: FrameOption[] = [
	{ id: 'none', label: 'Без рамки', src: null },
	{ id: 'placeholder-1', label: 'Бронза', src: '/game/avatar-frame.svg' },
	{ id: 'placeholder-2', label: 'Сталь', src: '/game/avatar-frame.svg' },
	{ id: 'placeholder-3', label: 'Золото', src: '/game/avatar-frame.svg' },
]

export const DEFAULT_AVATAR = 'default'
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
