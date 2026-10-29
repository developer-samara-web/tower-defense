'use client'

import type { ReactNode } from 'react'

import CloseButton from '@/components/ui/CloseButton'

type Props = {
	title: string
	children: ReactNode
	onClose: () => void
}

// Компактная карточка, как панель башни в игре: висит поверх поля
// справа и не перекрывает всю карту затемнением.
export default function DialogShell({ title, children, onClose }: Props) {
	return (
		<div className="pointer-events-none absolute inset-0 z-40 flex items-start justify-end p-2">
			<div
				className="pointer-events-auto max-h-full w-[232px] overflow-y-auto border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208]/95 to-[#0f0a05]/95 p-2.5 shadow-[0_10px_24px_rgba(0,0,0,0.8),inset_0_0_24px_rgba(74,55,35,0.25)] backdrop-blur-sm"
				role="dialog"
				aria-modal="false"
				aria-label={title}
			>
				<div className="mb-2 flex items-center justify-between gap-2 border-b border-[#3a2a1a] pb-1.5">
					<h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-300 drop-shadow-[0_2px_0_#5c2d0e]">
						{title}
					</h2>
					<CloseButton onClick={onClose} label="Закрыть окно" />
				</div>
				{children}
			</div>
		</div>
	)
}
