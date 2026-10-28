import type { ReactNode } from 'react'

type Props = {
	children: ReactNode
	onClick?: () => void
	disabled?: boolean
	variant?: 'primary' | 'default' | 'danger'
	badge?: string
}

// Кнопка главного меню: зелёная для основного действия,
// красная для выхода и тёмная для остальных пунктов.
export default function MenuButton({
	children,
	onClick,
	disabled,
	variant = 'default',
	badge,
}: Props) {
	const base =
		'relative flex w-full items-center justify-between rounded-none border-2 px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] transition-all focus-visible:outline-none focus-visible:ring-2'

	const content = (
		<span className="flex min-w-0 items-center gap-2">
			<span className="truncate">{children}</span>
			{badge ? (
				<span className="shrink-0 border border-[#5c3a1a] bg-[#0f0a05]/60 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-[#8a7340]">
					{badge}
				</span>
			) : null}
		</span>
	)

	if (variant === 'primary') {
		return (
			<button
				type="button"
				onClick={onClick}
				disabled={disabled}
				className={`${base} border-[#6b8e32] bg-gradient-to-b from-[#527c28] to-[#304d19] text-lime-100 shadow-[inset_0_1px_0_#a3cf65,0_4px_0_#1d2f0f] hover:from-[#628e33] hover:to-[#3d6022] active:translate-y-[2px] active:shadow-[0_2px_0_#1d2f0f] focus-visible:ring-lime-400`}
			>
				{content}
				<span className="text-[16px] leading-none text-lime-300">▶</span>
			</button>
		)
	}

	if (variant === 'danger') {
		return (
			<button
				type="button"
				onClick={onClick}
				disabled={disabled}
				className={`${base} border-[#7f2d24] bg-gradient-to-b from-[#5a1f16] to-[#2a0f0a] text-red-200 shadow-[inset_0_1px_0_#a34b3d,0_4px_0_#1a0704] hover:border-red-500 hover:from-[#7a2a1e] hover:to-[#3a150d] hover:text-red-100 active:translate-y-[2px] active:shadow-[0_2px_0_#1a0704] focus-visible:ring-red-400`}
			>
				{content}
				<span className="text-[14px] leading-none text-red-400/80">›</span>
			</button>
		)
	}

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={`${base} ${
				disabled
					? 'cursor-not-allowed border-[#3a2a1a] bg-[#161009] text-[#6b5a3e]'
					: 'border-[#79502b] bg-gradient-to-b from-[#2a1d0a] to-[#171109] text-amber-100 shadow-[0_3px_0_#100904] hover:border-amber-500 hover:from-[#3a2a12] hover:text-amber-50 active:translate-y-[2px] active:shadow-[0_1px_0_#100904] focus-visible:ring-amber-400'
			}`}
		>
			{content}
			<span className="text-[14px] leading-none text-[#8a7340]">›</span>
		</button>
	)
}
