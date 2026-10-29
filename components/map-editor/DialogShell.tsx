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
		<div className="pointer-events-none absolute inset-0 z-40 flex items-start justify-end p-2 pt-16 sm:p-3 sm:pt-20">
			<div
				className="pointer-events-auto max-h-[calc(100%-4rem)] w-[232px] overflow-y-auto border-2 border-[#79552c] bg-[#0f0a05]/90 p-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.65),0_3px_0_#2a1d0a] backdrop-blur-md"
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
