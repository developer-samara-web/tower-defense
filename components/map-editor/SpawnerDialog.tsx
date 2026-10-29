'use client'

import { useState } from 'react'

import {
	ENEMY_TYPES,
	type EnemyType,
} from '@/features/game/config/game.config'
import {
	DEFAULT_TROOP,
	MAP_LIMITS,
	MAP_SPAWN_TYPES,
	type MapSpawner,
	type SpawnerTroop,
} from '@/features/game/engine/map/custom-map'
import DialogShell from './DialogShell'

type Props = {
	spawner: MapSpawner
	onApply: (spawner: MapSpawner) => void
	onDelete: () => void
	onClose: () => void
}

type TroopDraft = {
	type: EnemyType
	count: string
	speed: string
	strength: string
	health: string
}

const fieldClass =
	'w-full border-2 border-[#5c3a1a] bg-[#0f0a05] px-1.5 py-1 text-[11px] font-black tabular-nums text-amber-200 outline-none focus:border-amber-500'

const labelClass =
	'text-[8px] font-black uppercase tracking-[0.12em] text-[#8a7340]'

function clamp(value: string, min: number, max: number, fallback: number) {
	const parsed = Number(value)
	if (!Number.isFinite(parsed)) return fallback
	return Math.min(max, Math.max(min, Math.round(parsed)))
}

function toDraft(troop: SpawnerTroop): TroopDraft {
	return {
		type: troop.type,
		count: String(troop.count),
		speed: String(troop.speed),
		strength: String(troop.strength),
		health: String(troop.health),
	}
}

function emptyTroop(type: EnemyType): TroopDraft {
	return toDraft({ ...DEFAULT_TROOP, type })
}

export default function SpawnerDialog({ spawner, onApply, onDelete, onClose }: Props) {
	const [troops, setTroops] = useState<TroopDraft[]>(() =>
		spawner.troops.length > 0 ? spawner.troops.map(toDraft) : [emptyTroop(DEFAULT_TROOP.type)],
	)

	const updateTroop = (index: number, patch: Partial<TroopDraft>) => {
		setTroops((current) =>
			current.map((troop, troopIndex) =>
				troopIndex === index ? { ...troop, ...patch } : troop,
			),
		)
	}

	const removeTroop = (index: number) => {
		setTroops((current) =>
			current.length > 1 ? current.filter((_, troopIndex) => troopIndex !== index) : current,
		)
	}

	const unusedTypes = MAP_SPAWN_TYPES.filter(
		(type) => !troops.some((troop) => troop.type === type),
	)

	const submit = () => {
		onApply({
			...spawner,
			troops: troops.map((troop) => ({
				type: troop.type,
				count: clamp(troop.count, MAP_LIMITS.countMin, MAP_LIMITS.countMax, DEFAULT_TROOP.count),
				speed: clamp(troop.speed, MAP_LIMITS.speedMin, MAP_LIMITS.speedMax, DEFAULT_TROOP.speed),
				strength: clamp(
					troop.strength,
					MAP_LIMITS.strengthMin,
					MAP_LIMITS.strengthMax,
					DEFAULT_TROOP.strength,
				),
				health: clamp(troop.health, MAP_LIMITS.healthMin, MAP_LIMITS.healthMax, DEFAULT_TROOP.health),
			})),
		})
	}

	return (
		<DialogShell title="Казарма" onClose={onClose}>
			<form
				onSubmit={(event) => {
					event.preventDefault()
					submit()
				}}
				className="space-y-2"
			>
				<div className="space-y-1.5">
					{troops.map((troop, index) => (
						<div
							key={`${index}-${troop.type}`}
							className="border-2 border-[#3a2a1a] bg-[#140d07] p-1.5"
						>
							<div className="flex items-center gap-1">
								<select
									value={troop.type}
									onChange={(event) =>
										updateTroop(index, { type: event.target.value as EnemyType })
									}
									aria-label="Вид монстров"
									className={`${fieldClass} min-w-0 flex-1`}
								>
									{MAP_SPAWN_TYPES.map((type) => (
										<option
											key={type}
											value={type}
											disabled={troops.some(
												(other, otherIndex) => otherIndex !== index && other.type === type,
											)}
										>
											{ENEMY_TYPES[type].name}
										</option>
									))}
								</select>
								<button
									type="button"
									onClick={() => removeTroop(index)}
									disabled={troops.length <= 1}
									aria-label="Убрать вид монстров"
									className="h-[27px] w-6 shrink-0 border-2 border-[#7f2d24] bg-[#2a0f0a] text-[12px] font-black leading-none text-red-200 transition-colors hover:border-red-500 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-30"
								>
									×
								</button>
							</div>

							<div className="mt-1 grid grid-cols-2 gap-x-1.5 gap-y-1">
								<label className="block">
									<span className={labelClass}>Кол-во</span>
									<input
										type="number"
										inputMode="numeric"
										min={MAP_LIMITS.countMin}
										max={MAP_LIMITS.countMax}
										value={troop.count}
										onChange={(event) => updateTroop(index, { count: event.target.value })}
										className={fieldClass}
									/>
								</label>
								<label className="block">
									<span className={labelClass}>Здоровье</span>
									<input
										type="number"
										inputMode="numeric"
										min={MAP_LIMITS.healthMin}
										max={MAP_LIMITS.healthMax}
										value={troop.health}
										onChange={(event) => updateTroop(index, { health: event.target.value })}
										className={fieldClass}
									/>
								</label>
								<label className="block">
									<span className={labelClass}>Скорость</span>
									<input
										type="number"
										inputMode="numeric"
										min={MAP_LIMITS.speedMin}
										max={MAP_LIMITS.speedMax}
										value={troop.speed}
										onChange={(event) => updateTroop(index, { speed: event.target.value })}
										className={fieldClass}
									/>
								</label>
								<label className="block">
									<span className={labelClass}>Урон по замку</span>
									<input
										type="number"
										inputMode="numeric"
										min={MAP_LIMITS.strengthMin}
										max={MAP_LIMITS.strengthMax}
										value={troop.strength}
										onChange={(event) => updateTroop(index, { strength: event.target.value })}
										className={fieldClass}
									/>
								</label>
							</div>
						</div>
					))}
				</div>

				{unusedTypes.length > 0 ? (
					<button
						type="button"
						onClick={() => {
							const next = unusedTypes[0]
							if (next) setTroops((current) => [...current, emptyTroop(next)])
						}}
						className="w-full border-2 border-dashed border-[#5c3a1a] bg-[#0f0a05] py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#8a7340] transition-colors hover:border-amber-500 hover:text-amber-200"
					>
						+ Вид монстров
					</button>
				) : null}

				<p className="text-[8px] font-bold uppercase tracking-[0.1em] text-[#5c3a1a]">
					Монстры выходят по очереди; кол-во — за волну.
				</p>

				<div className="flex gap-1.5 pt-0.5">
					<button
						type="submit"
						className="flex-1 border-2 border-[#6b8e32] bg-gradient-to-b from-[#527c28] to-[#304d19] px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-lime-100 shadow-[inset_0_1px_0_#a3cf65,0_2px_0_#100904] transition-colors hover:from-[#628e33] hover:to-[#3d6022] active:translate-y-[1px] active:shadow-[0_1px_0_#100904]"
					>
						Сохранить
					</button>
					<button
						type="button"
						onClick={onDelete}
						className="border-2 border-[#7f2d24] bg-gradient-to-b from-[#5a1f16] to-[#2a0f0a] px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-red-200 shadow-[inset_0_1px_0_#a34b3d,0_2px_0_#1a0704] transition-colors hover:border-red-500 hover:text-red-100 active:translate-y-[1px] active:shadow-[0_1px_0_#1a0704]"
					>
						Удалить
					</button>
				</div>
			</form>
		</DialogShell>
	)
}
