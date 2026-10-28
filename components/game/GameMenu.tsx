import CloseButton from '@/components/ui/CloseButton'

type GameMenuProps = {
	onClose: () => void
	onStats: () => void
	onMainMenu: () => void
}

export default function GameMenu({ onClose, onStats, onMainMenu }: GameMenuProps) {
	return (
		<div
			className="absolute inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
			role="dialog"
			aria-modal="true"
			aria-label="Меню игры"
		>
			<div className="w-full max-w-xs rounded-none border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208] to-[#0f0a05] p-4 shadow-[0_0_30px_rgba(0,0,0,0.9),inset_0_0_24px_rgba(74,55,35,0.25)]">
				<div className="mb-3 flex items-center justify-between border-b border-[#3a2a1a] pb-2">
					<h2 className="text-sm font-black uppercase tracking-[0.2em] text-amber-300 drop-shadow-[0_2px_0_#5c2d0e]">
						Меню
					</h2>
					<CloseButton onClick={onClose} label="Закрыть меню" size="md" />
				</div>

				<div className="space-y-2">
					<button
						type="button"
						onClick={onClose}
						className="flex w-full items-center justify-between rounded-none border-2 border-[#6b8e32] bg-gradient-to-b from-[#527c28] to-[#304d19] px-3 py-3 text-left text-[11px] font-black uppercase tracking-[0.16em] text-lime-100 shadow-[inset_0_1px_0_#a3cf65,0_3px_0_#100904] transition-colors hover:from-[#628e33] hover:to-[#3d6022] active:translate-y-[2px] active:shadow-[0_1px_0_#100904] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400"
					>
						<span>Продолжить</span>
						<span className="text-[14px] leading-none text-lime-300">▶</span>
					</button>

					<button
						type="button"
						onClick={onStats}
						className="flex w-full items-center justify-between rounded-none border-2 border-[#79502b] bg-gradient-to-b from-[#2a1d0a] to-[#171109] px-3 py-3 text-left text-[11px] font-black uppercase tracking-[0.16em] text-amber-100 shadow-[0_3px_0_#100904] transition-colors hover:border-amber-500 hover:from-[#3a2a12] hover:text-amber-50 active:translate-y-[2px] active:shadow-[0_1px_0_#100904] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
					>
						<span>Статистика</span>
						<span className="text-[14px] leading-none text-[#8a7340]">›</span>
					</button>

					<button
						type="button"
						onClick={onMainMenu}
						className="flex w-full items-center justify-between rounded-none border-2 border-[#7f2d24] bg-gradient-to-b from-[#5a1f16] to-[#2a0f0a] px-3 py-3 text-left text-[11px] font-black uppercase tracking-[0.16em] text-red-200 shadow-[inset_0_1px_0_#a34b3d,0_3px_0_#1a0704] transition-colors hover:border-red-500 hover:from-[#7a2a1e] hover:to-[#3a150d] hover:text-red-100 active:translate-y-[2px] active:shadow-[0_1px_0_#1a0704] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
					>
						<span>В главное меню</span>
						<span className="text-[14px] leading-none text-red-400/80">›</span>
					</button>
				</div>
			</div>
		</div>
	)
}
