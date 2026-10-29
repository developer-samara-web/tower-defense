'use client'

import { useState } from 'react'

import {
	MAP_LIMITS,
	type MapCastle,
} from '@/features/game/engine/map/custom-map'
import DialogShell from './DialogShell'

type Props = {
	castle: MapCastle
	onApply: (hp: number) => void
	onDelete: () => void
	onClose: () => void
}

export default function CastleDialog({ castle, onApply, onDelete, onClose }: Props) {
	const [hp, setHp] = useState(String(castle.hp))

	const value = Math.round(Number(hp))
	const valid =
		Number.isFinite(value) && value >= MAP_LIMITS.castleHpMin && value <= MAP_LIMITS.castleHpMax

	return (
		<DialogShell title="Замок" onClose={onClose}>
			<form
				onSubmit={(event) => {
					event.preventDefault()
					if (valid) onApply(value)
				}}
				className="space-y-3"
			>
				<label className="block">
					<span className="text-[9px] font-black uppercase tracking-[0.14em] text-[#8a7340]">
						Прочность замка
					</span>
					<input
						type="number"
						inputMode="numeric"
						min={MAP_LIMITS.castleHpMin}
						max={MAP_LIMITS.castleHpMax}
						value={hp}
						onChange={(event) => setHp(event.target.value)}
						autoFocus
						className="mt-1 w-full border-2 border-[#5c3a1a] bg-[#0f0a05] px-2 py-1.5 text-sm font-black tabular-nums text-amber-200 outline-none focus:border-amber-500"
					/>
				</label>

				<p className="text-[8px] font-bold uppercase tracking-[0.1em] text-[#5c3a1a]">
					Каждый прорвавшийся монстр снимает прочность замка. При нуле игра
					заканчивается.
				</p>

				<div className="flex gap-2 pt-1">
					<button
						type="submit"
						disabled={!valid}
						className="flex-1 border-2 border-[#6b8e32] bg-gradient-to-b from-[#527c28] to-[#304d19] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-lime-100 shadow-[inset_0_1px_0_#a3cf65,0_2px_0_#100904] transition-colors hover:from-[#628e33] hover:to-[#3d6022] disabled:cursor-not-allowed disabled:opacity-40 active:translate-y-[1px] active:shadow-[0_1px_0_#100904]"
					>
						Сохранить
					</button>
					<button
						type="button"
						onClick={onDelete}
						className="border-2 border-[#7f2d24] bg-gradient-to-b from-[#5a1f16] to-[#2a0f0a] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-red-200 shadow-[inset_0_1px_0_#a34b3d,0_2px_0_#1a0704] transition-colors hover:border-red-500 hover:text-red-100 active:translate-y-[1px] active:shadow-[0_1px_0_#1a0704]"
					>
						Удалить
					</button>
				</div>
			</form>
		</DialogShell>
	)
}
