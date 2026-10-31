'use client'

import { useState } from 'react'

import GameHistory from '@/components/game/GameHistory'
import BestMapsList from '@/components/menu/BestMapsList'
import PlayerAvatar from '@/components/ui/PlayerAvatar'
import type { PlayerProfile } from '@/features/account/types'
import { useBestMaps } from '@/hooks/useBestMaps'
import { useGameHistory } from '@/hooks/useGameHistory'
import { titleOption } from '@/lib/account/title-options'
import AvatarDialog from './AvatarDialog'

type ProfileScreenProps = {
	user: PlayerProfile | null
	onBack: () => void
	backLabel: string
	token?: string | null
	onUserChange?: (user: PlayerProfile) => void
}

const SQUARE = 'border border-[#5c3a1a] bg-[#0f0a05]/70 px-1 py-1.5 text-center'
const SQUARE_LABEL = 'text-[7px] font-black uppercase tracking-[0.14em] text-[#8a7340]'
const SQUARE_VALUE = 'mt-0.5 text-[13px] font-black tabular-nums'
// Квадратная кнопка-иконка в стиле игрового HUD: подпись здесь не нужна.
const APPEARANCE_BUTTON =
	'group relative flex h-10 w-10 shrink-0 self-start items-center justify-center border-2 border-[#79502b] bg-[#21150c] text-amber-300 shadow-[inset_0_1px_0_rgba(255,220,150,0.15),0_3px_0_#100904,0_5px_10px_rgba(0,0,0,0.45)] transition-all duration-150 hover:border-amber-400 hover:bg-[#493713] hover:text-yellow-200 hover:shadow-[inset_0_1px_0_rgba(255,220,150,0.2),0_3px_0_#100904,0_0_12px_rgba(250,204,21,0.25)] active:translate-y-[2px] active:shadow-[0_1px_0_#100904] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-40'

export default function ProfileScreen({
	user,
	onBack,
	backLabel,
	token,
	onUserChange,
}: ProfileScreenProps) {
	const history = useGameHistory()
	const bestMaps = useBestMaps()
	const [editing, setEditing] = useState(false)
	const title = titleOption(user?.title)

	// «Рейтинг» — очки рейтинга с рейтинговых карт, «Рекорд» — лучшее золото за
	// партию. Это разные числа, поэтому путать их в подписях нельзя.
	const metrics: Array<{ label: string; value: number | string; color: string }> = [
		{ label: 'Рейтинг', value: user?.ratingPoints ?? 0, color: 'text-yellow-300' },
		{ label: 'Место', value: (user?.rank ?? 0) > 0 ? `#${user?.rank}` : '—', color: 'text-amber-100' },
		{ label: 'Игр', value: user?.gamesPlayed ?? 0, color: 'text-amber-200' },
		{ label: 'Убито', value: user?.monstersKilled ?? 0, color: 'text-orange-300' },
		{ label: 'Волн', value: user?.bestWave ?? 0, color: 'text-lime-300' },
		{ label: 'Рекорд', value: user?.record ?? 0, color: 'text-amber-300' },
	]

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
					{backLabel}
				</button>

				<div className="rounded-none border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208]/95 to-[#0f0a05]/95 p-4 shadow-[0_0_30px_rgba(0,0,0,0.9)] sm:p-5">
					<div className="flex items-start gap-4">
						{/* 118px — высота блока с титулом, ником и метриками рядом с ним. */}
						<PlayerAvatar
							avatar={user?.avatar}
							frame={user?.avatarFrame}
							size={118}
							priority
						/>

						<div className="min-w-0 flex-1">
							{/* Титул вместо надписи «профиль игрока»: рамка и текст в цвет титула. */}
							<span
								className="inline-flex max-w-full items-center border-2 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em]"
								style={
									title
										? { borderColor: title.color, color: title.color, textShadow: `0 0 6px ${title.color}55` }
										: { borderColor: '#5c3a1a', color: '#8a7340' }
								}
							>
								<span className="truncate">{title?.label || 'Без титула'}</span>
							</span>
							<h1 className="mt-1.5 truncate text-2xl font-black uppercase tracking-[0.08em] text-amber-200 drop-shadow-[0_2px_0_#5c2d0e]">
								{user?.login || 'Герой'}
							</h1>

							<div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
								{metrics.map((metric) => (
									<div key={metric.label} className={SQUARE}>
										<p className={SQUARE_LABEL}>{metric.label}</p>
										<p className={`${SQUARE_VALUE} ${metric.color}`}>{metric.value}</p>
									</div>
								))}
							</div>
						</div>

						<button
							type="button"
							onClick={() => setEditing(true)}
							disabled={!user}
							aria-label="Внешний вид"
							title="Внешний вид"
							className={APPEARANCE_BUTTON}
						>
							<span className="pointer-events-none absolute inset-[3px] border border-[#79502b]/40 transition-colors group-hover:border-yellow-400/40" />
							<svg
								viewBox="0 0 24 24"
								className="relative h-[21px] w-[21px] transition-transform duration-200 group-hover:scale-110"
								fill="none"
								aria-hidden="true"
							>
								<path
									d="M12 3.4c-4.7 0-8.6 3.9-8.6 8.6s3.9 8.6 8.6 8.6c1.6 0 2.2-1.2 1.5-2.2-.7-1.1.1-2.5 1.4-2.5h2.3c2 0 3.5-1.7 3.4-3.7-.3-4.6-4.1-8.8-8.6-8.8Z"
									stroke="currentColor"
									strokeWidth="1.7"
									strokeLinejoin="miter"
								/>
								<rect x="7.4" y="8.6" width="2.3" height="2.3" fill="currentColor" />
								<rect x="11.6" y="6.2" width="2.3" height="2.3" fill="currentColor" />
								<rect x="6.4" y="12.8" width="2.3" height="2.3" fill="currentColor" />
							</svg>
						</button>
					</div>
				</div>

				<div className="mt-3 rounded-none border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208]/95 to-[#0f0a05]/95 shadow-[0_0_30px_rgba(0,0,0,0.9)]">
					<div className="flex items-center justify-between border-b border-[#3a2a1a] px-3 py-2">
						<span className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Лучшие карты</span>
						<span className="text-[8px] font-bold uppercase tracking-[0.14em] text-[#8a7340]">
							{bestMaps.ratedMaps > 0 ? `рейтинговых карт: ${bestMaps.ratedMaps}` : 'рейтинговых карт нет'}
						</span>
					</div>

					<BestMapsList maps={bestMaps.maps} loading={bestMaps.loading} />
				</div>

				<div className="mt-3 rounded-none border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208]/95 to-[#0f0a05]/95 shadow-[0_0_30px_rgba(0,0,0,0.9)]">
					<div className="flex items-center justify-between border-b border-[#3a2a1a] px-3 py-2">
						<span className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Мои игры</span>
						<span className="text-[8px] font-bold uppercase tracking-[0.14em] text-[#8a7340]">Последние результаты</span>
					</div>

					<div className="max-h-[52vh] overflow-y-auto">
						<GameHistory
							games={history.games}
							hasMore={history.hasMore}
							loading={history.loading}
							loadingMore={history.loadingMore}
							error={history.error}
							locked={history.locked}
							onLoadMore={history.loadMore}
							onRetry={history.refresh}
						/>
					</div>
				</div>
			</div>

			{editing && user ? (
				<AvatarDialog
					user={user}
					token={token ?? null}
					onClose={() => setEditing(false)}
					onSaved={(updated) => {
						onUserChange?.(updated)
						setEditing(false)
					}}
				/>
			) : null}
		</main>
	)
}
