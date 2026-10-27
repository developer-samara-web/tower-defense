import Image from 'next/image'

import ScoreTable from '@/components/menu/ScoreTable'
import type { PlayerProfile, PlayerScore } from '@/features/account/types'

type ProfileScreenProps = {
	user: PlayerProfile | null
	scores: PlayerScore[]
	onBack: () => void
}

export default function ProfileScreen({ user, scores, onBack }: ProfileScreenProps) {
	const record = user?.record ?? 0
	const rankIndex = user ? scores.findIndex((score) => score.id === user.id) : -1
	const rank = rankIndex >= 0 ? rankIndex + 1 : null
	const wave = Math.floor(record / 25) || 1

	return (
		<main className="relative h-[100dvh] w-full overflow-y-auto bg-[url(/game/background.png)] bg-cover bg-center px-3 py-4 font-mono text-[#e2c8a0] selection:bg-amber-900 selection:text-amber-100 sm:px-4">
			<div className="fixed inset-0 bg-[#05080a]/85" />

			<div className="relative mx-auto w-full max-w-3xl pb-6">
				<button
					type="button"
					onClick={onBack}
					className="mb-3 inline-flex items-center gap-2 rounded-none border-2 border-[#79502b] bg-[#21150c] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-amber-200 shadow-[0_3px_0_#100904] transition-colors hover:border-amber-400 hover:text-amber-50 active:translate-y-[2px] active:shadow-[0_1px_0_#100904] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
				>
					<span className="text-[14px] leading-none">←</span>
					Главное меню
				</button>

				<div className="rounded-none border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208]/95 to-[#0f0a05]/95 p-4 shadow-[0_0_30px_rgba(0,0,0,0.9)] sm:p-5">
					<div className="flex items-center gap-4">
						<Image
							src="/game/avatar-default.svg"
							alt="Аватар игрока"
							width={96}
							height={96}
							unoptimized
							loading="eager"
							className="h-20 w-20 shrink-0 border-2 border-[#79502b] bg-[#0f0a05] shadow-[inset_0_0_0_2px_#21150c] [image-rendering:pixelated] sm:h-24 sm:w-24"
						/>

						<div className="min-w-0">
							<p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#8a7340]">Профиль игрока</p>
							<h1 className="mt-1 truncate text-2xl font-black uppercase tracking-[0.08em] text-amber-200 drop-shadow-[0_2px_0_#5c2d0e]">
								{user?.login || 'Герой'}
							</h1>
							<p className="mt-1 truncate text-[10px] font-bold text-[#8a7340]">{user?.email || '—'}</p>
						</div>
					</div>

					<div className="mt-4 grid grid-cols-3 gap-2">
						<div className="border border-[#5c3a1a] bg-[#0f0a05]/70 px-2 py-2 text-center">
							<p className="text-[8px] font-black uppercase tracking-[0.14em] text-[#8a7340]">Рекорд</p>
							<p className="mt-1 text-base font-black tabular-nums text-yellow-300">{record} 🪙</p>
						</div>

						<div className="border border-[#5c3a1a] bg-[#0f0a05]/70 px-2 py-2 text-center">
							<p className="text-[8px] font-black uppercase tracking-[0.14em] text-[#8a7340]">Место в топе</p>
							<p className="mt-1 text-base font-black tabular-nums text-amber-200">{rank ?? '—'}</p>
						</div>

						<div className="border border-[#5c3a1a] bg-[#0f0a05]/70 px-2 py-2 text-center">
							<p className="text-[8px] font-black uppercase tracking-[0.14em] text-[#8a7340]">Волна</p>
							<p className="mt-1 text-base font-black tabular-nums text-lime-300">{wave}</p>
						</div>
					</div>
				</div>

				<div className="mt-3 rounded-none border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208]/95 to-[#0f0a05]/95 shadow-[0_0_30px_rgba(0,0,0,0.9)]">
					<div className="flex items-center justify-between border-b border-[#3a2a1a] px-3 py-2">
						<span className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Топ игроков</span>
						<span className="text-[8px] font-bold uppercase tracking-[0.14em] text-[#8a7340]">Лучшие результаты</span>
					</div>

					<ScoreTable scores={scores} currentUserId={user?.id} />
				</div>
			</div>
		</main>
	)
}
