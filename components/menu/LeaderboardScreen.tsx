import ScoreTable from '@/components/menu/ScoreTable'
import type { PlayerScore } from '@/features/account/types'

type LeaderboardScreenProps = {
	scores: PlayerScore[]
	currentUserId?: string
	onBack: () => void
}

export default function LeaderboardScreen({ scores, currentUserId, onBack }: LeaderboardScreenProps) {
	return (
		<main className="relative h-[100dvh] w-full overflow-y-auto bg-[url(/game/background.png)] bg-cover bg-center px-3 py-4 font-mono text-[#e2c8a0] selection:bg-amber-900 selection:text-amber-100 sm:px-4">
			<div className="fixed inset-0 bg-[#05080a]/85" />

			<div className="relative mx-auto w-full max-w-2xl pb-6">
				<button
					type="button"
					onClick={onBack}
					className="mb-3 inline-flex items-center gap-2 rounded-none border-2 border-[#79502b] bg-[#21150c] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-amber-200 shadow-[0_3px_0_#100904] transition-colors hover:border-amber-400 hover:text-amber-50 active:translate-y-[2px] active:shadow-[0_1px_0_#100904] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
				>
					<span className="text-[14px] leading-none">←</span>
					Главное меню
				</button>

				<div className="rounded-none border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208]/95 to-[#0f0a05]/95 shadow-[0_0_30px_rgba(0,0,0,0.9)]">
					<div className="flex items-center justify-between border-b border-[#3a2a1a] px-3 py-2.5">
						<h1 className="text-sm font-black uppercase tracking-[0.18em] text-amber-300 drop-shadow-[0_2px_0_#5c2d0e]">
							Топ игроков
						</h1>
						<span className="text-[8px] font-bold uppercase tracking-[0.14em] text-[#8a7340]">По очкам рейтинга</span>
					</div>

					<ScoreTable scores={scores} currentUserId={currentUserId} />
				</div>
			</div>
		</main>
	)
}
