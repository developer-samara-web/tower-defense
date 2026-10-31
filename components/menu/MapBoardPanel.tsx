'use client'

import { useCallback, useEffect, useState } from 'react'

import PlayerAvatar from '@/components/ui/PlayerAvatar'
import PlayerTitle from '@/components/ui/PlayerTitle'
import { NO_TITLE } from '@/lib/account/title-options'
import { fetchMapBoard } from '@/lib/services/map-service'
import type { MapLeaderboard, MapSummary } from '@/types'

type Props = {
	token: string | null
	map: MapSummary
	onBack: () => void
	onPlay: (map: MapSummary) => void
}

const MEDALS = ['text-yellow-300', 'text-slate-200', 'text-[#c98b5a]']

function playsForm(plays: number): string {
	const last = plays % 10
	const lastTwo = plays % 100
	if (last === 1 && lastTwo !== 11) return 'попытка'
	if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return 'попытки'
	return 'попыток'
}

// Карточка карты с её личным топом — как страница битмапа в osu!: звёзды
// сложности, рекорды игроков и собственное место рядом с ними.
export default function MapBoardPanel({ token, map, onBack, onPlay }: Props) {
	const [board, setBoard] = useState<MapLeaderboard | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const load = useCallback(async () => {
		if (!token) {
			setBoard(null)
			setLoading(false)
			return
		}
		setLoading(true)
		setError(null)
		try {
			setBoard(await fetchMapBoard(token, map.id, 20))
		} catch (loadError) {
			setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить топ карты')
		} finally {
			setLoading(false)
		}
	}, [token, map.id])

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		void load()
	}, [load])

	const rows = board?.entries ?? []
	const mine = board?.my ?? null

	return (
		<main className="relative min-h-[100dvh] w-full overflow-y-auto bg-[url(/game/background.png)] bg-cover bg-center px-3 py-4 font-mono text-[#e2c8a0] selection:bg-amber-900 selection:text-amber-100 sm:px-4">
			<div className="fixed inset-0 bg-[#05080a]/85" />

			<div className="relative mx-auto w-full max-w-2xl pb-6">
				<button
					type="button"
					onClick={onBack}
					className="mb-3 inline-flex items-center gap-2 border-2 border-[#79502b] bg-[#21150c] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-amber-200 shadow-[0_3px_0_#100904] transition-colors hover:border-amber-400 hover:text-amber-50 active:translate-y-[2px] active:shadow-[0_1px_0_#100904] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
				>
					<span className="text-[14px] leading-none">←</span>
					К списку карт
				</button>

				<div className="border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208]/95 to-[#0f0a05]/95 shadow-[0_0_30px_rgba(0,0,0,0.9)]">
					<div className="flex items-start justify-between gap-3 border-b border-[#3a2a1a] px-3 py-2.5">
						<div className="min-w-0">
							<h1 className="truncate text-sm font-black uppercase tracking-[0.18em] text-amber-300 drop-shadow-[0_2px_0_#5c2d0e]">
								{map.name}
							</h1>
							<p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.12em] text-[#8a7340]">
								<span className="text-amber-200">{map.stars.toFixed(1)}★</span>
								<span>{map.difficulty}</span>
								<span>{map.cols}×{map.rows}</span>
								{map.rated ? <span className="border border-amber-600/70 px-1 text-amber-300">Рейтинговая</span> : null}
							</p>
						</div>
						<button
							type="button"
							onClick={() => onPlay(map)}
							className="shrink-0 border-2 border-[#6b8e32] bg-gradient-to-b from-[#527c28] to-[#304d19] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-lime-100 shadow-[inset_0_1px_0_#a3cf65,0_2px_0_#100904] transition-colors hover:from-[#628e33] hover:to-[#3d6022] active:translate-y-[1px] active:shadow-[0_1px_0_#100904] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400"
						>
							Играть
						</button>
					</div>

					{/* Забег на нерейтинговой карте тоже попадает в топ карты, но
						очки идут только в общий рейтинг за рейтинговые карты. */}
					<p className="border-b border-[#3a2a1a] px-3 py-1.5 text-[8px] font-bold uppercase tracking-[0.12em] text-[#8a7340]">
						{map.rated
							? 'Очки этой карты входят в общий рейтинг игрока'
							: 'Топ карты есть, но общий рейтинг за неё не начисляется'}
					</p>

					<div className="px-3 py-2">
						{loading ? (
							<p className="py-6 text-center text-[9px] font-bold uppercase tracking-[0.14em] text-[#8a7340]">Загрузка топа…</p>
						) : error ? (
							<div className="py-6 text-center">
								<p className="text-[9px] font-bold text-red-300">{error}</p>
								<button
									type="button"
									onClick={() => void load()}
									className="mt-2 border border-[#5c3a1a] bg-[#21150c] px-3 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-amber-200 transition-colors hover:border-amber-400 hover:text-amber-50"
								>
									Повторить
								</button>
							</div>
						) : !board?.board ? (
							<p className="py-6 text-center text-[9px] font-bold text-[#5c3a1a]">
								У черновика топа нет — он появится после публикации
							</p>
						) : rows.length === 0 ? (
							<p className="py-6 text-center text-[9px] font-bold text-[#5c3a1a]">На этой карте ещё никто не играл</p>
						) : (
							<ul className="space-y-0.5">
								{rows.map((row, index) => (
									<li
										key={row.userId}
										className="flex items-center gap-2 px-1 py-0.5 text-[10px] font-bold"
									>
										<span className={`w-5 text-center font-black ${MEDALS[index] ?? 'text-amber-400'}`}>
											{index + 1}
										</span>
										<PlayerAvatar avatar={row.avatar} frame={row.avatarFrame} size={22} alt="" bordered={false} />
										<span className="flex min-w-0 flex-1 flex-col leading-tight">
											<span className="truncate text-amber-100">{row.login}</span>
											{row.title && row.title !== NO_TITLE ? (
												<PlayerTitle title={row.title} className="truncate text-[7px] tracking-[0.1em]" />
											) : null}
										</span>
										<span className="shrink-0 tabular-nums text-[8px] font-bold uppercase tracking-[0.1em] text-[#8a7340]">
											{row.wave}в · {row.plays} {playsForm(row.plays)}
										</span>
										<span className="w-14 shrink-0 text-right tabular-nums text-yellow-300">{row.points} очк.</span>
									</li>
								))}
							</ul>
						)}

						{mine ? (
							<div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#3a2a1a] px-1 pt-2 text-[9px] font-black uppercase tracking-[0.12em]">
								<span className="text-amber-200">
									Ваше место: {mine.rank || '—'}
								</span>
								<span className="text-[#8a7340]">
									рекордов на карте: {board?.total ?? 0}
								</span>
								<span className="tabular-nums text-yellow-300">{mine.points} очк. · волна {mine.wave}</span>
							</div>
						) : null}
					</div>
				</div>
			</div>
		</main>
	)
}
