type GameMenuProps = {
	onClose: () => void
	onProfile: () => void
	onMainMenu: () => void
	onLogout: () => void
}

export default function GameMenu({ onClose, onProfile, onMainMenu, onLogout }: GameMenuProps) {
	return (
		<div
			className="absolute inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
			role="dialog"
			aria-modal="true"
			aria-label="Меню игры"
		>
			<div className="w-full max-w-xs rounded-none border-2 border-[#5c2d0e] bg-gradient-to-b from-[#1a1208] to-[#0f0a05] p-4 shadow-[0_0_30px_rgba(0,0,0,0.9),inset_0_0_24px_rgba(74,55,35,0.25)]">
				<div className="mb-3 flex items-center justify-between border-b border-[#3a2a1a] pb-2">
					<h2 className="text-sm font-black uppercase tracking-[0.2em] text-amber-300 drop-shadow-[0_2px_0_#5c2d0e]">
						Меню
					</h2>
					<button
						type="button"
						onClick={onClose}
						aria-label="Закрыть меню"
						className="text-lg font-black leading-none text-[#8a7340] transition-colors hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
					>
						×
					</button>
				</div>

				<div className="space-y-2">
					<button
						type="button"
						onClick={onProfile}
						className="w-full rounded-none border-2 border-[#79502b] bg-gradient-to-b from-[#2a1d0a] to-[#171109] px-3 py-3 text-left text-[11px] font-black uppercase tracking-[0.16em] text-amber-100 shadow-[0_3px_0_#100904] transition-colors hover:border-amber-500 hover:from-[#3a2a12] hover:text-amber-50 active:translate-y-[2px] active:shadow-[0_1px_0_#100904] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
					>
						Профиль
					</button>

					<button
						type="button"
						onClick={onMainMenu}
						className="w-full rounded-none border-2 border-[#79502b] bg-gradient-to-b from-[#2a1d0a] to-[#171109] px-3 py-3 text-left text-[11px] font-black uppercase tracking-[0.16em] text-amber-100 shadow-[0_3px_0_#100904] transition-colors hover:border-amber-500 hover:from-[#3a2a12] hover:text-amber-50 active:translate-y-[2px] active:shadow-[0_1px_0_#100904] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
					>
						Главное меню
					</button>

					<button
						type="button"
						onClick={onLogout}
						className="w-full rounded-none border-2 border-[#5c2d0e] bg-[#2a120c]/70 px-3 py-3 text-left text-[11px] font-black uppercase tracking-[0.16em] text-[#c98b7a] shadow-[0_3px_0_#100904] transition-colors hover:border-red-500 hover:bg-[#421b13] hover:text-red-300 active:translate-y-[2px] active:shadow-[0_1px_0_#100904] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
					>
						Выход
					</button>
				</div>

				<button
					type="button"
					onClick={onClose}
					className="mt-3 w-full rounded-none border border-[#5c3a1a] bg-[#0f0a05]/70 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-[#b5a17b] transition-colors hover:border-amber-500 hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
				>
					Продолжить
				</button>
			</div>
		</div>
	)
}
