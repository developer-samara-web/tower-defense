import Link from 'next/link'

import PlayerAvatar from '@/components/ui/PlayerAvatar'
import PlayerTitle from '@/components/ui/PlayerTitle'
import type { PlayerProfile } from '@/features/account/types'

type Props = {
	user: PlayerProfile
}

// Мини-профиль в начале панели меню: ник и титул стопкой, под ними
// метрики одной строкой. Весь блок ведёт на страницу профиля, поэтому
// роль и прочие бейджи здесь не показываем.
export default function AccountCard({ user }: Props) {
	const wave = user.bestWave || Math.floor((user.record ?? 0) / 25) || 1

	// «Рейтинг» — очки с рейтинговых карт, место — позиция в общем топе по ним.
	const metrics: Array<{ label: string; value: number | string; color: string }> = [
		{ label: 'Рейтинг', value: user.ratingPoints ?? 0, color: 'text-yellow-300' },
		{ label: 'Место', value: (user.rank ?? 0) > 0 ? `#${user.rank}` : '—', color: 'text-amber-100' },
		{ label: 'Игр', value: user.gamesPlayed ?? 0, color: 'text-amber-200' },
		{ label: 'Волна', value: wave, color: 'text-lime-300' },
	]

	return (
		<Link
			href="/profile"
			title="Открыть профиль"
			className="flex items-stretch gap-3 border-2 border-[#5c3a1a] bg-[#0f0a05]/70 px-3 py-2 transition-colors hover:border-[#a67c36] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
		>
			{/* 50px — высота столбика с ником, титулом и метриками. */}
			<PlayerAvatar avatar={user.avatar} frame={user.avatarFrame} size={50} />

			<span className="flex min-w-0 flex-1 flex-col justify-center">
				<span className="truncate text-[11px] font-black uppercase leading-tight tracking-[0.12em] text-amber-200">
					{user.login}
				</span>
				<PlayerTitle title={user.title} className="truncate leading-tight" />

				<span className="mt-1.5 flex gap-1">
					{metrics.map((metric) => (
						<span
							key={metric.label}
							className="flex min-w-0 flex-1 items-baseline justify-center gap-1 border border-[#5c3a1a] bg-[#0f0a05]/70 px-1 py-0.5"
						>
							<span className="truncate text-[7px] font-black uppercase tracking-[0.08em] text-[#8a7340]">
								{metric.label}
							</span>
							<span className={`shrink-0 text-[10px] font-black tabular-nums ${metric.color}`}>
								{metric.value}
							</span>
						</span>
					))}
				</span>
			</span>
		</Link>
	)
}
