'use client'

import { useState } from 'react'

import type { GameRecord } from '@/features/account/types'

const numberFormat = new Intl.NumberFormat('ru-RU')
const dateFormat = new Intl.DateTimeFormat('ru-RU', {
	day: '2-digit',
	month: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
})

const RATED_BADGE =
	'shrink-0 border border-yellow-500/60 bg-yellow-500/10 px-1 py-0.5 text-[7px] font-black uppercase tracking-[0.12em] text-yellow-300'
const PLAIN_BADGE =
	'shrink-0 border border-[#5c3a1a] bg-[#0f0a05]/70 px-1 py-0.5 text-[7px] font-black uppercase tracking-[0.12em] text-[#8a7340]'

type Props = {
	games: GameRecord[]
	hasMore: boolean
	loading: boolean
	loadingMore: boolean
	error: boolean
	locked: boolean
	onLoadMore: () => void
	onRetry: () => void
}

export default function GameHistory({
	games,
	hasMore,
	loading,
	loadingMore,
	error,
	locked,
	onLoadMore,
	onRetry,
}: Props) {
	const [expandedId, setExpandedId] = useState<string | null>(null)

	if (loading && games.length === 0) {
		return <p className="px-1 py-3 text-center text-[9px] font-bold uppercase tracking-[0.14em] text-[#8a7340]">Загрузка…</p>
	}

	if (games.length === 0) {
		return (
			<div className="px-1 py-3 text-center">
				<p className="text-[9px] font-bold text-[#5c3a1a]">
					{locked
						? 'Войдите в аккаунт, чтобы сохранять историю игр'
						: error
							? 'Не удалось загрузить историю'
							: 'Пока нет завершённых игр'}
				</p>
				{error && !locked && (
					<button
						type="button"
						onClick={onRetry}
						className="mt-2 border border-[#5c3a1a] bg-[#21150c] px-3 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-amber-200 transition-colors hover:border-amber-400 hover:text-amber-50"
					>
						Повторить
					</button>
				)}
			</div>
		)
	}

	return (
		<div className="px-2 py-1">
			<ul>
				{games.map((game) => {
					const expanded = expandedId === game.id
					return (
						<li key={game.id} className="border-b border-[#3a2a1a]/40 last:border-b-0">
							<button
								type="button"
								onClick={() => setExpandedId(expanded ? null : game.id)}
								aria-expanded={expanded}
								aria-controls={`game-${game.id}`}
								className="flex w-full items-center gap-2 py-1.5 text-left transition-colors hover:bg-[#21150c]/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400"
							>
								<span className="flex min-w-0 flex-1 flex-col leading-tight">
									<span className="flex min-w-0 items-center gap-1.5">
										<span className="truncate text-[10px] font-black uppercase tracking-wide text-amber-200">Волна {game.wave}</span>
										{/* Рейтинг двигают только забеги на одобренных рейтинговых картах. */}
										<span className={game.rated ? RATED_BADGE : PLAIN_BADGE}>
											{game.rated ? 'рейтинг' : 'обычная'}
										</span>
									</span>
									<span className="mt-0.5 text-[8px] font-bold text-[#8a7340]">{dateFormat.format(new Date(game.createdAt))}</span>
								</span>
								<span className="shrink-0 text-[10px] font-black tabular-nums text-yellow-300">🪙 {numberFormat.format(game.gold)}</span>
								<span className="shrink-0 text-[9px] font-bold tabular-nums text-[#c5a76b]">{game.monstersKilled} убито</span>
								<span className={`shrink-0 text-[9px] text-[#8a7340] transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`} aria-hidden="true">▼</span>
							</button>

							{expanded && (
								<div id={`game-${game.id}`} className="grid grid-cols-2 gap-1 pb-2">
									<StatCell label="Монстры" value={game.monstersKilled} />
									<StatCell label="Постройки" value={game.buildingsBuilt} />
									<StatCell label="Потрачено" value={game.moneySpent} />
									<StatCell label="Урон" value={game.damageDealt} />
									<StatCell label="Золото" value={game.gold} />
									<StatCell label="Уровень" value={game.level} />
								</div>
							)}
						</li>
					)
				})}
			</ul>

			{error && (
				<button
					type="button"
					onClick={onRetry}
					className="mt-2 w-full border border-[#5c3a1a] bg-[#21150c] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.16em] text-amber-200 transition-colors hover:border-amber-400 hover:text-amber-50"
				>
					Не удалось загрузить · Повторить
				</button>
			)}

			{hasMore && (
				<button
					type="button"
					onClick={onLoadMore}
					disabled={loadingMore}
					className="mt-2 w-full border border-[#5c3a1a] bg-[#21150c] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-amber-200 transition-colors hover:border-amber-400 hover:text-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{loadingMore ? 'Загружаем…' : 'Показать ещё'}
				</button>
			)}
		</div>
	)
}

function StatCell({ label, value }: { label: string; value: number }) {
	return (
		<div className="flex items-baseline justify-between gap-2 border border-[#3a2a1a] bg-[#0f0a05]/70 px-2 py-1">
			<span className="text-[8px] font-black uppercase tracking-[0.12em] text-[#8a7340]">{label}</span>
			<span className="text-[10px] font-black tabular-nums text-amber-100">{numberFormat.format(value)}</span>
		</div>
	)
}
