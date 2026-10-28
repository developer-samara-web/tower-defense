'use client'

type Props = {
	onClick: () => void
	label?: string
	size?: 'sm' | 'md'
	className?: string
}

// Кнопка закрытия в стиле верхних кнопок игры: тёмный камень, янтарная
// рамка и внутренний контур. Размер sm — для компактных панелей.
export default function CloseButton({
	onClick,
	label = 'Закрыть',
	size = 'sm',
	className = '',
}: Props) {
	const box = size === 'md' ? 'h-10 w-10' : 'h-8 w-8'
	const icon = size === 'md' ? 'h-5 w-5' : 'h-4 w-4'

	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={label}
			title={label}
			className={`group relative flex ${box} shrink-0 items-center justify-center border-2 border-[#79502b] bg-[#21150c] text-amber-300 shadow-[inset_0_1px_0_rgba(255,220,150,0.15),0_3px_0_#100904,0_5px_10px_rgba(0,0,0,0.45)] transition-all duration-150 hover:border-amber-400 hover:bg-[#493713] hover:text-yellow-200 hover:shadow-[inset_0_1px_0_rgba(255,220,150,0.2),0_3px_0_#100904,0_0_12px_rgba(250,204,21,0.25)] active:translate-y-[2px] active:shadow-[0_1px_0_#100904] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${className}`}
		>
			<span className="pointer-events-none absolute inset-[3px] border border-[#79502b]/40 transition-colors group-hover:border-yellow-400/40" />
			<svg
				viewBox="0 0 16 16"
				className={`relative ${icon} transition-transform duration-150 group-hover:scale-110`}
				fill="none"
				aria-hidden="true"
			>
				<path
					d="M4 4L12 12M12 4L4 12"
					stroke="currentColor"
					strokeWidth="2.4"
					strokeLinecap="square"
				/>
			</svg>
		</button>
	)
}
