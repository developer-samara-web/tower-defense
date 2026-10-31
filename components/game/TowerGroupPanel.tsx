'use client'

import CloseButton from '@/components/ui/CloseButton'
import { MAX_TOWER_LEVEL, TOWER_TYPES } from '@/features/game/config/game.config'
import type { TowerSelectionSummary } from '@/features/game/domain/game-rules'

type Props = {
	selection: TowerSelectionSummary
	onUpgrade: () => void
	onToggleAutoUpgrade: () => void
	onSell: () => void
	onClose: () => void
}

type StatRow = { label: string; value: string; tone?: string }

// Квадратная кнопка в стиле игрового HUD: тёмный камень и янтарная рамка.
const SQUARE_BUTTON =
	'group relative flex h-10 w-10 shrink-0 flex-col items-center justify-center border-2 border-[#5c3a1a] bg-[#21170d] text-amber-200 transition-colors hover:border-[#a67c36] hover:bg-[#352411] hover:text-yellow-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400'

// Уровень пишется диапазоном только когда башни в выделении разные.
function levelLabel(levelMin: number, levelMax: number) {
	return levelMin === levelMax ? `${levelMin}` : `${levelMin}–${levelMax}`
}

// Панель группы башен: выделяет рамкой или Ctrl+кликом, улучшает сразу
// несколько. Порядок действий задаёт сцена — здесь только сводка.
export default function TowerGroupPanel({
	selection,
	onUpgrade,
	onToggleAutoUpgrade,
	onSell,
	onClose,
}: Props) {
	const { upgradeable, affordable, upgradeCost, sellValue, autoUpgrade, count } = selection

	const maxed = upgradeable === 0
	// Денег может хватить не на всю группу: тогда растёт часть башен.
	const partial = !maxed && affordable < upgradeable
	const cannotPay = !maxed && affordable === 0

	const rows: StatRow[] = [
		{
			label: 'Улучшить',
			value: maxed ? 'макс. уровень' : `${upgradeCost} 🪙`,
			tone: maxed
				? 'text-[#8c785a]'
				: cannotPay
					? 'text-red-300'
					: partial
						? 'text-yellow-300'
						: 'text-amber-100',
		},
		{ label: 'Продажа', value: `+${sellValue} 🪙`, tone: 'text-lime-200' },
		{
			label: 'Автоулучшение',
			value: autoUpgrade ? 'включено' : 'выключено',
			tone: autoUpgrade ? 'text-yellow-300' : 'text-amber-100',
		},
	]

	if (partial) {
		rows.push({ label: 'Хватит на', value: `${affordable} из ${upgradeable}`, tone: 'text-yellow-300' })
	}

	// Смешанное выделение показываем по типам: у одинаковых — общий уровень.
	const showGroups = selection.groups.length > 1

	return (
		<div className="rounded-none border-2 border-[#79552c] bg-[#0f0a05]/90 p-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.65),0_3px_0_#2a1d0a] backdrop-blur-md">
			<div className="flex items-center justify-between gap-2">
				<span className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-amber-300">
					{selection.type ? TOWER_TYPES[selection.type].name : 'Башни'} ×{count} · ур.{' '}
					{levelLabel(selection.levelMin, selection.levelMax)}/{MAX_TOWER_LEVEL}
				</span>
				<CloseButton onClick={onClose} label="Снять выделение" />
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

			{showGroups && (
				<ul className="mt-1.5 flex flex-col gap-[2px] border-t border-[#3c2a16]/70 pt-1.5">
					{selection.groups.map((group) => (
						<li key={group.type} className="flex items-baseline justify-between gap-3 text-[9px] font-black uppercase tracking-[0.1em]">
							<span className="min-w-0 truncate text-amber-100">
								{group.name} ×{group.count}
							</span>
							<span className="whitespace-nowrap tabular-nums text-[#8a7340]">
								ур. {levelLabel(group.levelMin, group.levelMax)}
							</span>
						</li>
					))}
				</ul>
			)}

			<div className="mt-2 flex items-stretch gap-1.5">
				<button
					type="button"
					onClick={onUpgrade}
					disabled={maxed || cannotPay}
					title={
						maxed
							? 'Все выбранные башни уже максимального уровня'
							: partial
								? `Золота хватает на ${affordable} улучшений — вырастут именно они`
								: `Улучшить все ${upgradeable} башни`
					}
					className={`flex h-10 min-w-0 flex-1 items-center justify-between gap-2 border-2 px-2 text-[10px] font-black uppercase tracking-[0.04em] transition-colors ${
						maxed || cannotPay
							? 'cursor-not-allowed border-[#3c2a16] bg-[#21170d] text-[#8c785a]'
							: 'border-[#8b651f] bg-[#4a3408] text-amber-200 hover:border-yellow-400 hover:bg-[#5c4210] hover:text-yellow-100'
					}`}
				>
					<span className="whitespace-nowrap">{maxed ? 'МАКС. УРОВЕНЬ' : `УЛУЧШИТЬ ${upgradeable}`}</span>
					{!maxed && <span className="whitespace-nowrap tabular-nums">{upgradeCost} 🪙</span>}
				</button>

				<button
					type="button"
					onClick={onToggleAutoUpgrade}
					aria-pressed={autoUpgrade}
					aria-label={`Автоулучшение выбранных башен ${autoUpgrade ? 'включено' : 'выключено'}`}
					disabled={maxed}
					title="Автоулучшение: все выбранные башни растут сами, как только хватит золота"
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
					aria-label={`Продать выбранные башни и вернуть ${sellValue} золота`}
					title={`Продать все · +${sellValue} 🪙`}
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
