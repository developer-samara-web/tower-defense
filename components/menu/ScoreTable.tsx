import type { PlayerScore } from '@/features/account/types'

type ScoreTableProps = {
	scores: PlayerScore[]
	currentUserId?: string
}

const rankColor = (index: number) => {
	if (index === 0) return 'text-yellow-300'
	if (index === 1) return 'text-[#cfd8e3]'
	if (index === 2) return 'text-[#d99a5b]'
	return 'text-[#8a7340]'
}

export default function ScoreTable({ scores, currentUserId }: ScoreTableProps) {
	if (scores.length === 0) {
		return (
			<p className="px-3 py-6 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#5c3a1a]">
				Пока нет рекордов
			</p>
		)
	}

	return (
		<div className="divide-y divide-[#2a1d0a]">
			{scores.map((score, index) => {
				const isMe = Boolean(currentUserId) && score.id === currentUserId

				return (
					<div
						key={score.id}
						className={`flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold ${
							isMe ? 'bg-amber-500/10' : ''
						}`}
					>
						<span className={`w-6 shrink-0 text-center text-xs font-black tabular-nums ${rankColor(index)}`}>
							{index + 1}
						</span>

						<span className="min-w-0 flex-1 truncate text-amber-100">
							{score.login || 'Герой'}
							{isMe ? (
								<span className="ml-2 border border-amber-500/50 bg-amber-500/10 px-1 py-0.5 text-[7px] uppercase tracking-[0.12em] text-amber-300">
									вы
								</span>
							) : null}
						</span>

						<span className="shrink-0 text-[10px] text-[#b5a17b]">{score.wave} волна</span>
						<span className="w-24 shrink-0 text-right tabular-nums text-amber-300">{score.gold} 🪙</span>
					</div>
				)
			})}
		</div>
	)
}
