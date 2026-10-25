'use client'

type TowerDetailsProps = {
	name: string
	level: number
	maxLevel: number
	damage: number
	range: number
	attackSpeed: number
	upgradeCost: number | null
	gold: number
	onUpgrade: () => void
	onClose: () => void
}

export default function TowerDetails({
	name,
	level,
	maxLevel,
	damage,
	range,
	attackSpeed,
	upgradeCost,
	gold,
	onUpgrade,
	onClose,
}: TowerDetailsProps) {
	const maxed = upgradeCost === null
	const affordable = upgradeCost !== null && gold >= upgradeCost

	return (
		<div className="rounded-none border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208] to-[#0f0a05] p-3 shadow-[inset_0_0_12px_rgba(0,0,0,0.7)]">
			<div className="flex items-center justify-between gap-2">
				<p className="min-w-0 truncate text-xs font-black uppercase tracking-[0.1em] text-amber-100">{name}</p>
				<span className="shrink-0 rounded-none border border-[#5c2d0e] bg-gradient-to-b from-[#4a3728] to-[#2a1d0a] px-2 py-0.5 text-[10px] font-black text-amber-200">
					ур. {level} / {maxLevel}
				</span>
			</div>

			<dl className="mt-2 grid grid-cols-3 gap-1 text-center">
				<div className="rounded-none border border-[#2a1d0a] bg-[#0f0a05]/60 py-1.5">
					<dt className="text-[9px] font-black uppercase tracking-[0.15em] text-[#8a7340]">Урон</dt>
					<dd className="text-xs font-black text-amber-100">{damage}</dd>
				</div>
				<div className="rounded-none border border-[#2a1d0a] bg-[#0f0a05]/60 py-1.5">
					<dt className="text-[9px] font-black uppercase tracking-[0.15em] text-[#8a7340]">Радиус</dt>
					<dd className="text-xs font-black text-amber-100">{range}</dd>
				</div>
				<div className="rounded-none border border-[#2a1d0a] bg-[#0f0a05]/60 py-1.5">
					<dt className="text-[9px] font-black uppercase tracking-[0.15em] text-[#8a7340]">Перезарядка</dt>
					<dd className="text-xs font-black text-amber-100">
						{(attackSpeed / 1000).toFixed(2)} с
					</dd>
				</div>
			</dl>

			<div className="mt-2 flex items-center gap-2">
				<button
					type="button"
					onClick={onUpgrade}
					disabled={!affordable}
					className="flex h-8 flex-1 items-center justify-center rounded-none border border-[#5c2d0e] bg-gradient-to-b from-[#8a5a2e] to-[#5c2d0e] px-2 text-[11px] font-black uppercase tracking-[0.1em] text-[#f5e6c8] shadow-[0_2px_0_#3a1d0a] transition-all hover:from-[#9b6a3e] hover:to-[#6a3a1e] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
				>
					{maxed ? 'МАКСИМАЛЬНЫЙ УРОВЕНЬ' : `УЛУЧШИТЬ · ${upgradeCost}`}
				</button>
				<button
					type="button"
					onClick={onClose}
					aria-label="Снять выбор с башни"
					className="flex h-8 w-8 shrink-0 items-center justify-center rounded-none border border-[#5c2d0e] bg-gradient-to-b from-[#2a1d0a] to-[#0f0a05] text-sm font-black text-amber-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:text-amber-100 hover:border-amber-700"
				>
					×
				</button>
			</div>
		</div>
	)
}
