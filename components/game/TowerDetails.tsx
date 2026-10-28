'use client'

import CloseButton from '@/components/ui/CloseButton'

type TowerDetailsProps = {
	level: number
	maxLevel: number
	damage: number
	range: number
	attackSpeed: number
	crit: number
	burn: number
	chain: number
	execute: number
	upgradeCost: number | null
	sellValue: number
	gold: number
	onUpgrade: () => void
	onSell: () => void
	onClose: () => void
}

type StatRow = { label: string; value: string; tone?: string }

export default function TowerDetails({
	level,
	maxLevel,
	damage,
	range,
	attackSpeed,
	crit,
	burn,
	chain,
	execute,
	upgradeCost,
	sellValue,
	gold,
	onUpgrade,
	onSell,
	onClose,
}: TowerDetailsProps) {
	const maxed = upgradeCost === null
	const affordable = upgradeCost !== null && gold >= upgradeCost

	// Каждая характеристика — отдельная строка: значения с бонусами
	// могут быть четырёхзначными и не должны обрезаться.
	const rows: StatRow[] = [
		{ label: 'Урон', value: String(damage) },
		{ label: 'Радиус', value: String(range) },
		{ label: 'Перезарядка', value: `${(attackSpeed / 1000).toFixed(2)} с` },
		crit > 0 && { label: 'Крит', value: `${Math.round(crit * 100)}%`, tone: 'text-yellow-300' },
		burn > 0 && { label: 'Поджог', value: `${burn}/с`, tone: 'text-orange-300' },
		chain > 0 && { label: 'Цепь', value: `+${chain}`, tone: 'text-sky-300' },
		execute > 0 && { label: 'Добивание', value: `${Math.round(execute * 100)}%`, tone: 'text-rose-300' },
	].filter((row): row is StatRow => Boolean(row))

	return (
		<div className="rounded-none border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208] to-[#0f0a05] p-3 shadow-[inset_0_0_12px_rgba(0,0,0,0.7)]">
			<div className="flex items-center justify-between gap-2">
				<span className="rounded-none border border-[#5c2d0e] bg-gradient-to-b from-[#4a3728] to-[#2a1d0a] px-2 py-0.5 text-[10px] font-black text-amber-200">
					ур. {level} / {maxLevel}
				</span>
				<CloseButton onClick={onClose} label="Снять выбор с башни" />
			</div>

			<dl className="mt-2 border-y border-[#2a1d0a]">
				{rows.map((row) => (
					<div
						key={row.label}
						className="flex items-baseline justify-between gap-3 border-b border-[#2a1d0a]/60 py-1 last:border-b-0"
					>
						<dt className="min-w-0 text-[9px] font-black uppercase tracking-[0.14em] text-[#8a7340]">{row.label}</dt>
						<dd className={`whitespace-nowrap text-[11px] font-black tabular-nums ${row.tone ?? 'text-amber-100'}`}>{row.value}</dd>
					</div>
				))}
			</dl>

			<div className="mt-2 flex items-stretch gap-2">
				<button
					type="button"
					onClick={onUpgrade}
					disabled={!affordable}
					className="flex h-10 flex-1 items-center justify-center border-2 border-[#8b651f] bg-gradient-to-b from-[#f2c14b] to-[#a97b1f] px-2 text-[11px] font-black uppercase tracking-[0.08em] text-[#3a2405] shadow-[inset_0_1px_0_#ffe9a8,0_3px_0_#4a3408] transition-all hover:from-[#ffd35e] hover:to-[#b98a26] active:translate-y-[2px] active:shadow-[inset_0_1px_0_#ffe9a8,0_1px_0_#4a3408] disabled:cursor-not-allowed disabled:from-[#5a4a2e] disabled:to-[#332a18] disabled:text-[#a2937a] disabled:shadow-none"
				>
					{maxed ? 'МАКС. УРОВЕНЬ' : `УЛУЧШИТЬ · ${upgradeCost} 🪙`}
				</button>
				<button
					type="button"
					onClick={onSell}
					aria-label={`Продать башню и вернуть ${sellValue} золота`}
					title={`Продать · +${sellValue} 🪙`}
					className="group relative flex h-10 w-10 shrink-0 flex-col items-center justify-center border-2 border-[#79502b] bg-[#21150c] text-amber-200 shadow-[inset_0_1px_0_rgba(255,220,150,0.15),0_3px_0_#100904] transition-all duration-150 hover:border-amber-400 hover:bg-[#493713] hover:text-yellow-200 active:translate-y-[2px] active:shadow-[0_1px_0_#100904] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
				>
					<span className="pointer-events-none absolute inset-[3px] border border-[#79502b]/40 transition-colors group-hover:border-yellow-400/40" />
					<svg viewBox="0 0 16 16" className="relative h-4 w-4" fill="none" aria-hidden="true">
						<circle cx="8" cy="8" r="5.2" stroke="currentColor" strokeWidth="1.6" />
						<path d="M8 5.4v5.2M6.4 7h3.2M6.4 9h3.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" />
					</svg>
					<span className="relative mt-0.5 text-[8px] font-black leading-none tabular-nums">+{sellValue}</span>
				</button>
			</div>
		</div>
	)
}
