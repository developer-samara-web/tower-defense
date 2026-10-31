import type { PlayerBestMap } from '@/types'

type BestMapsListProps = {
	maps: PlayerBestMap[]
	loading: boolean
}

const rankColor = (index: number) => {
	if (index === 0) return 'text-yellow-300'
	if (index === 1) return 'text-[#cfd8e3]'
	if (index === 2) return 'text-[#d99a5b]'
	return 'text-[#8a7340]'
}

// Один рекорд с карты — как top plays в профиле osu!. Очки здесь уже с учётом
// сложности карты, поэтому список показывает, что реально двигает рейтинг.
export default function BestMapsList({ maps, loading }: BestMapsListProps) {
	if (loading && maps.length === 0) {
		return (
			<p className="px-3 py-6 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#5c3a1a]">
				Загружаем рекорды
			</p>
		)
	}

	if (maps.length === 0) {
		return (
			<p className="px-3 py-6 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#5c3a1a]">
				Рекордов по картам пока нет
			</p>
		)
	}

	return (
		<div className="divide-y divide-[#2a1d0a]">
			{maps.map((item, index) => (
				<div key={item.mapId} className="flex items-center gap-3 px-3 py-2 text-[11px] font-bold">
					<span className={`w-5 shrink-0 text-center text-xs font-black tabular-nums ${rankColor(index)}`}>
						{index + 1}
					</span>

					<span className="flex min-w-0 flex-1 flex-col leading-tight">
						<span className="truncate text-amber-100">{item.name}</span>
						<span className="text-[8px] font-bold uppercase tracking-[0.12em] text-[#8a7340]">
							{item.stars.toFixed(1)}★ · волна {item.wave} · попыток {item.plays}
							{item.rated ? ' · рейтинговая' : ''}
						</span>
					</span>

					<span className="shrink-0 tabular-nums text-yellow-300">{item.points} очк.</span>
				</div>
			))}
		</div>
	)
}
