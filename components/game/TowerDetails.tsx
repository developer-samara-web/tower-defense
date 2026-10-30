'use client'

import CloseButton from '@/components/ui/CloseButton'

type TowerDetailsProps = {
	name: string
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
	autoUpgrade: boolean
	onUpgrade: () => void
	onToggleAutoUpgrade: () => void
	onSell: () => void
	onClose: () => void
}

type StatRow = { label: string; value: string; tone?: string }

// Квадратная кнопка в стиле игрового HUD: тёмный камень и янтарная рамка.
const SQUARE_BUTTON =
	'group relative flex h-10 w-10 shrink-0 flex-col items-center justify-center border-2 border-[#5c3a1a] bg-[#21170d] text-amber-200 transition-colors hover:border-[#a67c36] hover:bg-[#352411] hover:text-yellow-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400'

export default function TowerDetails({
	name,
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
	autoUpgrade,
	onUpgrade,
	onToggleAutoUpgrade,
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
		<div className="rounded-none border-2 border-[#79552c] bg-[#0f0a05]/90 p-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.65),0_3px_0_#2a1d0a] backdrop-blur-md">
			<div className="flex items-center justify-between gap-2">
				<span className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-amber-300">
					{name} · ур. {level}/{maxLevel}
				</span>
				<CloseButton onClick={onClose} label="Снять выбор с башни" />
			</div>

			<dl className="mt-1.5 border-t border-[#3c2a16]">
				{rows.map((row) => (
					<div
						key={row.label}
						className="flex items-baseline justify-between gap-3 border-b border-[#3c2a16]/70 py-[3px] last:border-b-0"
					>
						<dt className="min-w-0 text-[9px] font-black uppercase tracking-[0.14em] text-[#8a7340]">{row.label}</dt>
						<dd className={`whitespace-nowrap text-[11px] font-black tabular-nums ${row.tone ?? 'text-amber-100'}`}>{row.value}</dd>
					</div>
				))}
			</dl>

			<div className="mt-2 flex items-stretch gap-1.5">
				<button
					type="button"
					onClick={onUpgrade}
					disabled={!affordable}
					className={`flex h-10 min-w-0 flex-1 items-center justify-between gap-2 border-2 px-2 text-[10px] font-black uppercase tracking-[0.04em] transition-colors ${
						affordable
							? 'border-[#8b651f] bg-[#4a3408] text-amber-200 hover:border-yellow-400 hover:bg-[#5c4210] hover:text-yellow-100'
							: 'cursor-not-allowed border-[#3c2a16] bg-[#21170d] text-[#8c785a]'
					}`}
				>
					<span className="whitespace-nowrap">{maxed ? 'МАКС. УРОВЕНЬ' : 'УЛУЧШИТЬ'}</span>
					{!maxed && <span className="whitespace-nowrap tabular-nums">{upgradeCost} 🪙</span>}
				</button>

				<button
					type="button"
					onClick={onToggleAutoUpgrade}
					aria-pressed={autoUpgrade}
					aria-label={`Автоулучшение ${autoUpgrade ? 'включено' : 'выключено'}`}
					disabled={maxed}
					title="Автоулучшение: башня растёт сама, как только хватит золота"
					className={`${SQUARE_BUTTON} ${
						autoUpgrade
							? 'border-yellow-400 bg-[#493713] text-yellow-200 shadow-[0_0_8px_#eab30866]'
							: ''
					} ${maxed ? 'cursor-not-allowed opacity-50' : ''}`}
				>
					<span className="pointer-events-none absolute inset-[3px] border border-[#5c3a1a]/50 transition-colors group-hover:border-yellow-400/40" />
					<svg viewBox="0 0 24 24" className="relative h-[15px] w-[15px]" fill="none" aria-hidden="true">
						<path d="M12 20V7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" />
						<path d="M5.8 12.8 12 6.6l6.2 6.2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" strokeLinejoin="miter" />
					</svg>
					<span className="relative text-[7px] font-black leading-none">АВТО</span>
					{autoUpgrade && (
						<span className="absolute -right-[3px] -top-[3px] h-2 w-2 border border-[#0f0a05] bg-yellow-400 shadow-[0_0_5px_#facc15]" />
					)}
				</button>

				<button
					type="button"
					onClick={onSell}
					aria-label={`Продать башню и вернуть ${sellValue} золота`}
					title={`Продать · +${sellValue} 🪙`}
					className={SQUARE_BUTTON}
				>
					<span className="pointer-events-none absolute inset-[3px] border border-[#5c3a1a]/50 transition-colors group-hover:border-yellow-400/40" />
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
