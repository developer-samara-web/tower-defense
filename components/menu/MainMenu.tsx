import Image from 'next/image'

import type { PlayerProfile } from '@/features/account/types'

type MainMenuProps = {
	user: PlayerProfile | null
	onSingle: () => void
	onProfile: () => void
	onLeaderboard: () => void
	onLogout: () => void
}

type MenuButtonProps = {
	children: React.ReactNode
	onClick?: () => void
	disabled?: boolean
	variant?: 'primary' | 'default'
	badge?: string
}

function MenuButton({ children, onClick, disabled, variant = 'default', badge }: MenuButtonProps) {
	const base =
		'relative flex w-full items-center justify-between rounded-none border-2 px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] transition-all focus-visible:outline-none focus-visible:ring-2'

	if (variant === 'primary') {
		return (
			<button
				type="button"
				onClick={onClick}
				disabled={disabled}
				className={`${base} border-[#6b8e32] bg-gradient-to-b from-[#527c28] to-[#304d19] text-lime-100 shadow-[inset_0_1px_0_#a3cf65,0_4px_0_#1d2f0f] hover:from-[#628e33] hover:to-[#3d6022] active:translate-y-[2px] active:shadow-[0_2px_0_#1d2f0f] focus-visible:ring-lime-400`}
			>
				<span>{children}</span>
				<span className="text-[16px] leading-none text-lime-300">▶</span>
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
			<span>{children}</span>
			{badge ? (
				<span className="border border-[#5c3a1a] bg-[#0f0a05]/80 px-1.5 py-0.5 text-[8px] tracking-[0.14em] text-[#8a7340]">
					{badge}
				</span>
			) : (
				<span className="text-[14px] leading-none text-[#8a7340]">›</span>
			)}
		</button>
	)
}

export default function MainMenu({ user, onSingle, onProfile, onLeaderboard, onLogout }: MainMenuProps) {
	return (
		<main className="relative flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-[url(/game/background.png)] bg-cover bg-center px-4 font-mono text-[#e2c8a0] selection:bg-amber-900 selection:text-amber-100">
			<div className="absolute inset-0 bg-gradient-to-b from-[#05080a]/70 via-[#0a0e12]/40 to-[#05080a]/85" />

			<div className="relative w-full max-w-md rounded-none border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208]/95 to-[#0f0a05]/95 p-5 shadow-[0_0_30px_rgba(0,0,0,0.9),inset_0_0_30px_rgba(74,55,35,0.2)] sm:p-7">
				<div className="flex items-center justify-between gap-3">
					<Image
						src="/game/logo.png"
						alt="Legends of Prigranica"
						width={120}
						height={60}
						priority
						className="drop-shadow-[0_3px_6px_rgba(0,0,0,0.6)]"
					/>

					{user ? (
						<div className="flex items-center gap-2 border border-[#5c3a1a] bg-[#0f0a05]/70 px-2 py-1">
							<span className="h-2 w-2 bg-lime-400 shadow-[0_0_5px_#a3e635]" />
							<span className="max-w-[110px] truncate text-[9px] font-black uppercase tracking-[0.12em] text-amber-200">
								{user.login}
							</span>
						</div>
					) : null}
				</div>

				<h1 className="mt-5 text-center text-xl font-black uppercase tracking-[0.2em] text-amber-300 drop-shadow-[0_3px_0_#5c2d0e]">
					Главное меню
				</h1>

				<div className="mt-5 space-y-2">
					<MenuButton variant="primary" onClick={onSingle}>
						Одиночная игра
					</MenuButton>
					<MenuButton disabled badge="скоро">
						Мультиплеер
					</MenuButton>
					<MenuButton onClick={onProfile}>Профиль</MenuButton>
					<MenuButton onClick={onLeaderboard}>Топ игроков</MenuButton>
				</div>

				<button
					type="button"
					onClick={onLogout}
					className="mt-4 w-full rounded-none border border-[#5c2d0e] bg-[#2a120c]/60 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-[#c98b7a] transition-colors hover:border-red-500 hover:bg-[#421b13] hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
				>
					Выйти из аккаунта
				</button>
			</div>
		</main>
	)
}
