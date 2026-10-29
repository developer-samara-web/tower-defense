'use client'

import { useState } from 'react'

import {
	MAP_LIMITS,
	type MapWave,
	type MapWaves,
} from '@/features/game/engine/map/custom-map'
import DialogShell from './DialogShell'

type Props = {
	waves: MapWaves
	onApply: (waves: MapWaves) => void
	onClose: () => void
}

type WaveDraft = {
	id: string
	health: string
	speed: string
	count: string
}

const fieldClass =
	'w-full border-2 border-[#5c3a1a] bg-[#0f0a05] px-1 py-1 text-center text-[11px] font-black tabular-nums text-amber-200 outline-none focus:border-amber-500'

const labelClass =
	'text-[8px] font-black uppercase tracking-[0.1em] text-[#8a7340]'

function clamp(value: string) {
	const parsed = Number(value)
	if (!Number.isFinite(parsed)) return 100
	return Math.min(
		MAP_LIMITS.wavePercentMax,
		Math.max(MAP_LIMITS.wavePercentMin, Math.round(parsed)),
	)
}

function toDraft(wave: MapWave): WaveDraft {
	return {
		id: wave.id,
		health: String(wave.health),
		speed: String(wave.speed),
		count: String(wave.count),
	}
}

let newWaveCounter = 0

function nextWave(): WaveDraft {
	newWaveCounter += 1
	return {
		id: `wave-${Date.now().toString(36)}-${newWaveCounter}`,
		health: '100',
		speed: '100',
		count: '100',
	}
}

export default function WavesDialog({ waves, onApply, onClose }: Props) {
	const [useCommon, setUseCommon] = useState(waves.useCommon)
	const [list, setList] = useState<WaveDraft[]>(() => waves.waves.map(toDraft))

	const updateWave = (index: number, patch: Partial<WaveDraft>) => {
		setList((current) =>
			current.map((wave, waveIndex) =>
				waveIndex === index ? { ...wave, ...patch } : wave,
			),
		)
	}

	return (
		<DialogShell title="Волны" onClose={onClose}>
			<form
				onSubmit={(event) => {
					event.preventDefault()
					onApply({
						useCommon,
						waves: list.map((wave) => ({
							id: wave.id,
							health: clamp(wave.health),
							speed: clamp(wave.speed),
							count: clamp(wave.count),
						})),
					})
				}}
				className="space-y-2"
			>
				<label className="flex cursor-pointer items-start gap-1.5 border-2 border-[#3a2a1a] bg-[#140d07] p-1.5">
					<input
						type="checkbox"
						checked={useCommon}
						onChange={(event) => {
							const checked = event.target.checked
							setUseCommon(checked)
							if (!checked && list.length === 0) {
								setList([nextWave()])
							}
						}}
						className="mt-0.5 h-3 w-3 shrink-0 accent-[#6b8e32]"
					/>
					<span className="min-w-0">
						<span className="block text-[9px] font-black uppercase tracking-[0.12em] text-amber-200">
							Общие параметры
						</span>
						<span className="mt-0.5 block text-[8px] font-bold leading-tight text-[#8a7340]">
							Характеристики растут с номером волны по правилам игры.
						</span>
					</span>
				</label>

				{useCommon ? null : (
					<>
						<div className="space-y-1.5">
							{list.map((wave, index) => (
								<div
									key={wave.id}
									className="border-2 border-[#3a2a1a] bg-[#140d07] p-1.5"
								>
									<div className="flex items-center justify-between gap-1">
										<span className="text-[9px] font-black uppercase tracking-[0.12em] text-amber-300">
											Волна {index + 1}
										</span>
										<button
											type="button"
											onClick={() =>
												setList((current) =>
													current.filter((_, waveIndex) => waveIndex !== index),
												)
											}
											aria-label={`Удалить волну ${index + 1}`}
											className="h-5 w-5 shrink-0 border-2 border-[#7f2d24] bg-[#2a0f0a] text-[11px] font-black leading-none text-red-200 transition-colors hover:border-red-500 hover:text-red-100"
										>
											×
										</button>
									</div>

									<div className="mt-1 grid grid-cols-3 gap-1">
										<label className="block">
											<span className={labelClass}>HP %</span>
											<input
												type="number"
												inputMode="numeric"
												min={MAP_LIMITS.wavePercentMin}
												max={MAP_LIMITS.wavePercentMax}
												step={5}
												value={wave.health}
												onChange={(event) =>
													updateWave(index, { health: event.target.value })
												}
												className={fieldClass}
											/>
										</label>
										<label className="block">
											<span className={labelClass}>Скор. %</span>
											<input
												type="number"
												inputMode="numeric"
												min={MAP_LIMITS.wavePercentMin}
												max={MAP_LIMITS.wavePercentMax}
												step={5}
												value={wave.speed}
												onChange={(event) =>
													updateWave(index, { speed: event.target.value })
												}
												className={fieldClass}
											/>
										</label>
										<label className="block">
											<span className={labelClass}>Кол-во %</span>
											<input
												type="number"
												inputMode="numeric"
												min={MAP_LIMITS.wavePercentMin}
												max={MAP_LIMITS.wavePercentMax}
												step={5}
												value={wave.count}
												onChange={(event) =>
													updateWave(index, { count: event.target.value })
												}
												className={fieldClass}
											/>
										</label>
									</div>
								</div>
							))}
						</div>

						<button
							type="button"
							onClick={() => setList((current) => [...current, nextWave()])}
							disabled={list.length >= MAP_LIMITS.maxWaves}
							className="w-full border-2 border-dashed border-[#5c3a1a] bg-[#0f0a05] py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#8a7340] transition-colors hover:border-amber-500 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
						>
							+ Волна
						</button>

						<p className="text-[8px] font-bold uppercase tracking-[0.1em] text-[#5c3a1a]">
							Проценты от характеристик казарм. После последней волны повторяется
							её настройка.
						</p>
					</>
				)}

				<button
					type="submit"
					className="w-full border-2 border-[#6b8e32] bg-gradient-to-b from-[#527c28] to-[#304d19] px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-lime-100 shadow-[inset_0_1px_0_#a3cf65,0_2px_0_#100904] transition-colors hover:from-[#628e33] hover:to-[#3d6022] active:translate-y-[1px] active:shadow-[0_1px_0_#100904]"
				>
					Сохранить
				</button>
			</form>
		</DialogShell>
	)
}
