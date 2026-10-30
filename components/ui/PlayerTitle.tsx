import { titleOption } from '@/lib/account/title-options'

type Props = {
	title?: string | null
	className?: string
}

// Цветной титул под ником. Пустой id и неизвестный титул ничего
// не выводят, так что старый аккаунт без выбора выглядит чисто.
export default function PlayerTitle({ title, className = '' }: Props) {
	const option = titleOption(title)
	if (!option) return null

	return (
		<span
			className={`text-[8px] font-black uppercase tracking-[0.18em] ${className}`}
			style={{ color: option.color, textShadow: `0 0 6px ${option.color}55` }}
		>
			{option.label}
		</span>
	)
}
