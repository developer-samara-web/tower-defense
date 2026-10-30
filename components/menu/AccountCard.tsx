import Link from 'next/link'

import PlayerAvatar from '@/components/ui/PlayerAvatar'
import PlayerTitle from '@/components/ui/PlayerTitle'
import type { PlayerProfile } from '@/features/account/types'

type Props = {
	user: PlayerProfile
}

// Мини-профиль над меню: весь блок ведёт на страницу профиля,
// поэтому метрики стоят в одну строку и не растягивают карточку.
export default function AccountCard({ user }: Props) {
	const isAdmin = user.role === 'admin'
	const wave = user.bestWave || Math.floor((user.record ?? 0) / 25) || 1

	const metrics: Array<{ label: string; value: number | string; color: string }> = [
		{ label: 'Рейтинг', value: user.record ?? 0, color: 'text-yellow-300' },
		{ label: 'Игр', value: user.gamesPlayed ?? 0, color: 'text-amber-200' },
		{ label: 'Волна', value: wave, color: 'text-lime-300' },
	]

	return (
		<Link
			href="/profile"
			title="Открыть профиль"
			className="mb-2 block border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208]/95 to-[#0f0a05]/95 px-3 py-2 shadow-[0_0_20px_rgba(0,0,0,0.7)] transition-colors hover:border-[#79502b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
		>
			<span className="flex items-center gap-3">
				<PlayerAvatar avatar={user.avatar} frame={user.avatarFrame} size={56} />

				<span className="flex min-w-0 flex-1 flex-col">
					<span className="flex min-w-0 items-center gap-2">
						<span className="truncate text-[11px] font-black uppercase tracking-[0.12em] text-amber-200">
							{user.login}
						</span>
						<PlayerTitle title={user.title} className="truncate" />
						{isAdmin ? (
							<span className="shrink-0 border border-amber-500/70 bg-amber-900/40 px-1 py-0.5 text-[7px] font-black uppercase tracking-[0.14em] text-amber-200">
								Админ
							</span>
						) : null}
					</span>

					<span className="mt-1.5 grid grid-cols-3 gap-1.5">
						{metrics.map((metric) => (
							<span
								key={metric.label}
								className="border border-[#5c3a1a] bg-[#0f0a05]/70 px-1 py-1 text-center"
							>
								<span className="block text-[7px] font-black uppercase tracking-[0.1em] text-[#8a7340]">
									{metric.label}
								</span>
								<span className={`mt-0.5 block text-[11px] font-black tabular-nums ${metric.color}`}>
									{metric.value}
								</span>
							</span>
						))}
					</span>
				</span>
			</span>
		</Link>
	)
}
