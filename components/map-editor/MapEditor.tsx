'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import MapEditorCanvas from '@/components/map-editor/MapEditorCanvas'
import CastleDialog from '@/components/map-editor/CastleDialog'
import SpawnerDialog from '@/components/map-editor/SpawnerDialog'
import WavesDialog from '@/components/map-editor/WavesDialog'
import { useAuth } from '@/hooks/useAuth'
import type { EditorCell, EditorTool } from '@/features/game/editor/types'
import {
	canPlaceSpawner,
	castleCellKeys,
	cellKey,
	clampCastleCell,
	createEmptyMapDraft,
	createMapSpawner,
	DEFAULT_CASTLE_HP,
	isBoardCell,
	isCastleCell,
	MAP_LIMITS,
	parseCellKey,
	spawnerRoads,
	validateDraft,
	type MapDraft,
	type MapSpawner,
	type MapWaves,
} from '@/features/game/engine/map/custom-map'
import { mapSeedToNumber } from '@/features/game/engine/map/game-map'
import { createMap, fetchMap, saveMap } from '@/lib/services/map-service'

type Props = {
	// Пустой id — редактор сам создаст новую карту.
	mapId: string
}

const PALETTE: Array<{ tool: EditorTool; label: string; key: string }> = [
	{ tool: 'castle', label: 'Замок', key: '1' },
	{ tool: 'spawner', label: 'Казарма', key: '2' },
	{ tool: 'road', label: 'Дорога', key: '3' },
	{ tool: 'river', label: 'Река', key: '4' },
	{ tool: 'forest', label: 'Лес', key: '5' },
	{ tool: 'erase', label: 'Ластик', key: '6' },
]

const DIFFICULTIES = ['Лёгкая', 'Средняя', 'Трудная', 'Экстремальная']

// Клетки храним по порядку: одинаковый черновик даёт одинаковый JSON,
// и сохранение без правок не плодит лишних записей.
function sortCells(cells: Iterable<string>) {
	return Array.from(cells).sort((a, b) => {
		const [ax = 0, ay = 0] = parseCellKey(a)
		const [bx = 0, by = 0] = parseCellKey(b)
		return ay === by ? ax - bx : ay - by
	})
}

const toolButtonClass = (active: boolean) =>
	`group relative flex flex-1 flex-col items-center gap-0.5 border-2 px-1 py-2 text-[9px] font-black uppercase tracking-[0.12em] transition-colors sm:text-[10px] ${
		active
			? 'border-amber-400 bg-gradient-to-b from-[#4a3712] to-[#2a1d0a] text-amber-100 shadow-[inset_0_1px_0_rgba(255,220,150,0.25),0_0_12px_rgba(250,204,21,0.18)]'
			: 'border-[#3a2a1a] bg-gradient-to-b from-[#21150c] to-[#150e08] text-[#8a7340] hover:border-[#79502b] hover:text-amber-200'
	}`

export default function MapEditor({ mapId: initialMapId }: Props) {
	const router = useRouter()
	const { token, checked } = useAuth()

	const [mapId, setMapId] = useState(initialMapId)
	const [draft, setDraft] = useState<MapDraft | null>(null)
	const [name, setName] = useState('')
	const [difficulty, setDifficulty] = useState('Средняя')
	const [tool, setTool] = useState<EditorTool>('castle')
	const [seed, setSeed] = useState(0)
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [notice, setNotice] = useState<string | null>(null)
	const [dirty, setDirty] = useState(false)
	const [castleOpen, setCastleOpen] = useState(false)
	const [spawnerId, setSpawnerId] = useState<string | null>(null)
	const [wavesOpen, setWavesOpen] = useState(false)
	// Какой id уже загружен: создание карты меняет mapId и не должно
	// запускать повторную загрузку.
	const loadedIdRef = useRef<string | null>(null)

	const roads = useMemo(() => (draft ? spawnerRoads(draft) : []), [draft])
	const issue = draft ? validateDraft(draft) : 'Карта ещё не загружена'
	const brokenRoads = roads.filter((entry) => !entry.road).length
	const activeSpawner = draft && spawnerId
		? draft.spawners.find((spawner) => spawner.id === spawnerId) ?? null
		: null

	// Загружаем карту один раз: для нового редактора сначала создаём пустую.
	useEffect(() => {
		if (!checked) return
		if (mapId && loadedIdRef.current === mapId) return

		let cancelled = false

		const load = async () => {
			if (!token) {
				setLoading(false)
				setError('Войдите в аккаунт, чтобы создавать карты')
				return
			}

			setLoading(true)
			setError(null)

			try {
				let id = mapId
				if (!id) {
					const created = await createMap(token)
					if (cancelled) return
					id = created.id
					setMapId(id)
					router.replace(`/maps/editor?id=${id}`)
				}

				const map = await fetchMap(token, id)
				if (cancelled) return
				loadedIdRef.current = id

				setDraft(map.data ?? createEmptyMapDraft())
				setName(map.name)
				setDifficulty(map.difficulty)
				setSeed(mapSeedToNumber(map.seed))
				setDirty(false)
			} catch (loadError) {
				if (cancelled) return
				setError(
					loadError instanceof Error
						? loadError.message
						: 'Не удалось загрузить карту',
				)
			} finally {
				if (!cancelled) setLoading(false)
			}
		}

		void load()

		return () => {
			cancelled = true
		}
	}, [checked, token, mapId, router])

	// Служебное сообщение живёт недолго и не должно закрывать подсказку.
	useEffect(() => {
		if (!notice) return
		const timer = window.setTimeout(() => setNotice(null), 3500)
		return () => window.clearTimeout(timer)
	}, [notice])

	// Переход на другую карту из меню меняет только id в адресе.
	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setMapId(initialMapId)
	}, [initialMapId])

	// Цифры переключают инструменты, Escape закрывает диалог.
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const target = event.target
			if (
				target instanceof HTMLElement &&
				['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)
			) {
				return
			}

			if (event.key === 'Escape') {
				setCastleOpen(false)
				setSpawnerId(null)
				setWavesOpen(false)
				return
			}

			const next = PALETTE.find((entry) => entry.key === event.key)
			if (next) setTool(next.tool)
		}

		window.addEventListener('keydown', onKeyDown)
		return () => window.removeEventListener('keydown', onKeyDown)
	}, [])

	const updateDraft = useCallback((updater: (current: MapDraft) => MapDraft) => {
		setDraft((current) => (current ? updater(current) : current))
		setDirty(true)
	}, [])

	const applyTerrain = useCallback(
		(activeTool: EditorTool, cells: Iterable<string>) => {
			if (!draft) return

			const list = Array.from(cells)
			if (
				(activeTool === 'river' || activeTool === 'forest') &&
				draft.waterCells.length + draft.forestCells.length + list.length >
					MAP_LIMITS.maxTerrainCells
			) {
				setNotice('Слишком много воды и леса')
				return
			}
			if (
				activeTool === 'road' &&
				draft.roadCells.length + list.length > MAP_LIMITS.maxRoadCells
			) {
				setNotice('Слишком много дорог')
				return
			}

			updateDraft((current) => {
				const water = new Set(current.waterCells)
				const forest = new Set(current.forestCells)
				const road = new Set(current.roadCells)

				for (const key of list) {
					const [x, y] = parseCellKey(key)
					if (!isBoardCell(x, y)) continue
					if (current.castle && isCastleCell(current.castle, x, y)) continue
					if (current.spawners.some((spawner) => spawner.x === x && spawner.y === y)) {
						continue
					}

					if (activeTool === 'river') {
						water.add(key)
						forest.delete(key)
						road.delete(key)
					} else if (activeTool === 'forest') {
						forest.add(key)
						water.delete(key)
						road.delete(key)
					} else if (activeTool === 'road') {
						road.add(key)
						water.delete(key)
						forest.delete(key)
					} else {
						water.delete(key)
						forest.delete(key)
						road.delete(key)
					}
				}

				return {
					...current,
					waterCells: sortCells(water),
					forestCells: sortCells(forest),
					roadCells: sortCells(road),
				}
			})
		},
		[draft, updateDraft],
	)

	const eraseCell = useCallback(
		(cell: EditorCell) => {
			updateDraft((current) => {
				const key = cellKey(cell.x, cell.y)
				const castle =
					current.castle && isCastleCell(current.castle, cell.x, cell.y)
						? null
						: current.castle

				return {
					...current,
					castle,
					spawners: current.spawners.filter(
						(spawner) => !(spawner.x === cell.x && spawner.y === cell.y),
					),
					waterCells: current.waterCells.filter((item) => item !== key),
					forestCells: current.forestCells.filter((item) => item !== key),
					roadCells: current.roadCells.filter((item) => item !== key),
				}
			})
		},
		[updateDraft],
	)

	const placeCastle = useCallback(
		(cell: EditorCell) => {
			if (!draft) return

			if (draft.castle && isCastleCell(draft.castle, cell.x, cell.y)) {
				setCastleOpen(true)
				return
			}

			const [x, y] = clampCastleCell(cell.x, cell.y)
			updateDraft((current) => {
				const castle = { x, y, hp: current.castle?.hp ?? DEFAULT_CASTLE_HP }
				const castleKeys = new Set(castleCellKeys(castle))

				return {
					...current,
					castle,
					waterCells: current.waterCells.filter((key) => !castleKeys.has(key)),
					forestCells: current.forestCells.filter((key) => !castleKeys.has(key)),
					roadCells: current.roadCells.filter((key) => !castleKeys.has(key)),
					spawners: current.spawners.filter((spawner) =>
						canPlaceSpawner(castle, spawner.x, spawner.y),
					),
				}
			})
			setCastleOpen(true)
		},
		[draft, updateDraft],
	)

	const placeSpawner = useCallback(
		(cell: EditorCell) => {
			if (!draft) return

			const existing = draft.spawners.find(
				(spawner) => spawner.x === cell.x && spawner.y === cell.y,
			)
			if (existing) {
				setSpawnerId(existing.id)
				return
			}

			if (!canPlaceSpawner(draft.castle, cell.x, cell.y)) {
				setNotice('Казарму нельзя ставить вплотную к замку')
				return
			}

			const key = cellKey(cell.x, cell.y)
			if (draft.waterCells.includes(key) || draft.forestCells.includes(key)) {
				setNotice('Сначала освободите клетку от воды или леса')
				return
			}

			if (draft.spawners.length >= MAP_LIMITS.maxSpawners) {
				setNotice(`Максимум казарм: ${MAP_LIMITS.maxSpawners}`)
				return
			}

			const spawner = createMapSpawner(cell.x, cell.y)
			updateDraft((current) => ({
				...current,
				spawners: [...current.spawners, spawner],
				// Казарма занимает клетку: дорога под ней не нужна.
				roadCells: current.roadCells.filter(
					(key) => key !== cellKey(cell.x, cell.y),
				),
			}))
			setSpawnerId(spawner.id)
		},
		[draft, updateDraft],
	)

	const handleClick = useCallback(
		(activeTool: EditorTool, cell: EditorCell) => {
			if (activeTool === 'castle') {
				placeCastle(cell)
			} else if (activeTool === 'spawner') {
				placeSpawner(cell)
			} else if (activeTool === 'erase') {
				eraseCell(cell)
			} else {
				applyTerrain(activeTool, [cellKey(cell.x, cell.y)])
			}
		},
		[applyTerrain, eraseCell, placeCastle, placeSpawner],
	)

	const handleStroke = useCallback(
		(activeTool: EditorTool, cells: string[]) => {
			if (activeTool === 'erase') {
				updateDraft((current) => {
					const removed = new Set(cells)
					const spawners = current.spawners.filter(
						(spawner) => !removed.has(cellKey(spawner.x, spawner.y)),
					)
					const castleAt = current.castle
					const castleErased =
						castleAt !== null &&
						cells.some((key) => {
							const [x, y] = parseCellKey(key)
							return isCastleCell(castleAt, x, y)
						})

					return {
						...current,
						castle: castleErased ? null : castleAt,
						spawners,
						waterCells: current.waterCells.filter((key) => !removed.has(key)),
						forestCells: current.forestCells.filter((key) => !removed.has(key)),
						roadCells: current.roadCells.filter((key) => !removed.has(key)),
					}
				})
				return
			}

			applyTerrain(activeTool, cells)
		},
		[applyTerrain, updateDraft],
	)

	const applyCastleHp = useCallback(
		(hp: number) => {
			updateDraft((current) =>
				current.castle
					? { ...current, castle: { ...current.castle, hp } }
					: current,
			)
			setCastleOpen(false)
		},
		[updateDraft],
	)

	const deleteCastle = useCallback(() => {
		updateDraft((current) => ({ ...current, castle: null }))
		setCastleOpen(false)
	}, [updateDraft])

	const applySpawner = useCallback(
		(updated: MapSpawner) => {
			updateDraft((current) => ({
				...current,
				spawners: current.spawners.map((spawner) =>
					spawner.id === updated.id ? updated : spawner,
				),
			}))
			setSpawnerId(null)
		},
		[updateDraft],
	)

	const applyWaves = useCallback(
		(waves: MapWaves) => {
			updateDraft((current) => ({ ...current, waves }))
			setWavesOpen(false)
		},
		[updateDraft],
	)

	const deleteSpawner = useCallback(() => {
		const id = spawnerId
		if (!id) return
		updateDraft((current) => ({
			...current,
			spawners: current.spawners.filter((spawner) => spawner.id !== id),
		}))
		setSpawnerId(null)
	}, [spawnerId, updateDraft])

	// Сохраняет карту на сервере. Возвращает false, если сохранить не вышло.
	const persist = useCallback(async () => {
		if (!token || !mapId || !draft || saving) return false
		if (!name.trim()) {
			setError('Введите название карты')
			return false
		}

		setSaving(true)
		setError(null)
		try {
			const map = await saveMap(token, mapId, {
				name: name.trim(),
				difficulty,
				data: draft,
			})
			setName(map.name)
			setDirty(false)
			setNotice('Карта сохранена')
			return true
		} catch (saveError) {
			setError(
				saveError instanceof Error ? saveError.message : 'Не удалось сохранить карту',
			)
			return false
		} finally {
			setSaving(false)
		}
	}, [token, mapId, draft, saving, name, difficulty])

	const play = useCallback(async () => {
		if (!draft) return
		const problem = validateDraft(draft)
		if (problem) {
			setNotice(problem)
			return
		}

		const saved = await persist()
		if (saved && mapId) router.push(`/game?map=${mapId}`)
	}, [draft, persist, mapId, router])

	const goBack = useCallback(() => {
		if (dirty && !window.confirm('Изменения не сохранены. Выйти из редактора?')) {
			return
		}
		router.push('/maps')
	}, [dirty, router])

	const statusText = error
		? error
		: notice
			? notice
			: loading
				? 'Загрузка карты…'
				: issue ?? 'Карта готова к игре'

	const statusClass = error
		? 'text-red-300'
		: notice || issue
			? 'text-amber-500'
			: 'text-lime-300'

	if (loading || !draft) {
		return (
			<main className="relative flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-[url(/game/background.png)] bg-cover bg-center px-4 font-mono text-[#e2c8a0]">
				<div className="absolute inset-0 bg-[#05080a]/85" />
				<div className="relative w-full max-w-sm border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208]/95 to-[#0f0a05]/95 p-5 text-center shadow-[0_0_30px_rgba(0,0,0,0.9)]">
					<p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-300">
						{error ? 'Редактор недоступен' : 'Загрузка редактора…'}
					</p>
					{error ? (
						<>
							<p className="mt-2 text-[10px] font-bold text-red-300">{error}</p>
							<div className="mt-4 flex justify-center gap-2">
								<a
									href="/auth"
									className="border-2 border-[#79502b] bg-[#21150c] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-amber-200 transition-colors hover:border-amber-400 hover:text-amber-50"
								>
									Войти
								</a>
								<button
									type="button"
									onClick={() => router.push('/maps')}
									className="border-2 border-[#79502b] bg-[#21150c] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-amber-200 transition-colors hover:border-amber-400 hover:text-amber-50"
								>
									К картам
								</button>
							</div>
						</>
					) : null}
				</div>
			</main>
		)
	}

	return (
		<main className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#0b1408] font-mono text-[#e2c8a0] selection:bg-amber-900 selection:text-amber-100">
			<header className="relative z-30 flex flex-wrap items-center gap-2 border-b-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208] to-[#0f0a05] px-2 py-2 sm:px-3">
				<button
					type="button"
					onClick={goBack}
					className="flex shrink-0 items-center gap-1 border-2 border-[#79502b] bg-[#21150c] px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-amber-200 shadow-[0_2px_0_#100904] transition-colors hover:border-amber-400 hover:text-amber-50 active:translate-y-[1px] active:shadow-[0_1px_0_#100904]"
				>
					<span className="text-[13px] leading-none">←</span>
					Карты
				</button>

				<label className="flex min-w-0 flex-1 items-center gap-1.5">
					<span className="hidden text-[8px] font-black uppercase tracking-[0.14em] text-[#5c3a1a] sm:block">
						Название
					</span>
					<input
						type="text"
						value={name}
						maxLength={40}
						onChange={(event) => {
							setName(event.target.value)
							setDirty(true)
						}}
						className="min-w-0 flex-1 border-2 border-[#5c3a1a] bg-[#0f0a05] px-2 py-1.5 text-[11px] font-black text-amber-200 outline-none focus:border-amber-500 sm:max-w-[220px]"
					/>
				</label>

				<select
					value={difficulty}
					onChange={(event) => {
						setDifficulty(event.target.value)
						setDirty(true)
					}}
					className="shrink-0 border-2 border-[#5c3a1a] bg-[#0f0a05] px-1.5 py-1.5 text-[10px] font-black text-amber-200 outline-none focus:border-amber-500"
					aria-label="Сложность"
				>
					{DIFFICULTIES.map((value) => (
						<option key={value} value={value}>
							{value}
						</option>
					))}
				</select>

				<div className="ml-auto flex shrink-0 items-center gap-1.5">
					<button
						type="button"
						onClick={() => setWavesOpen(true)}
						title="Сложность волн"
						className="border-2 border-[#79502b] bg-[#21150c] px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-amber-200 shadow-[0_2px_0_#100904] transition-colors hover:border-amber-400 hover:text-amber-50 active:translate-y-[1px] active:shadow-[0_1px_0_#100904]"
					>
						Волны
						<span className="ml-1 text-[9px] text-amber-400">
							{draft.waves.useCommon ? '∞' : draft.waves.waves.length}
						</span>
					</button>
					<button
						type="button"
						onClick={() => void persist()}
						disabled={saving || loading}
						className="border-2 border-[#79502b] bg-[#21150c] px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-amber-200 shadow-[0_2px_0_#100904] transition-colors hover:border-amber-400 hover:text-amber-50 disabled:cursor-not-allowed disabled:opacity-40 active:translate-y-[1px] active:shadow-[0_1px_0_#100904]"
					>
						{saving ? 'Сохраняем…' : dirty ? 'Сохранить' : 'Сохранено'}
					</button>
					<button
						type="button"
						onClick={() => void play()}
						disabled={saving || Boolean(issue)}
						title={issue ?? 'Начать игру на этой карте'}
						className="border-2 border-[#6b8e32] bg-gradient-to-b from-[#527c28] to-[#304d19] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-lime-100 shadow-[inset_0_1px_0_#a3cf65,0_2px_0_#100904] transition-colors hover:from-[#628e33] hover:to-[#3d6022] disabled:cursor-not-allowed disabled:opacity-40 active:translate-y-[1px] active:shadow-[0_1px_0_#100904]"
					>
						Играть
					</button>
				</div>
			</header>

			<section className="relative min-h-0 flex-1 overflow-hidden">
				<MapEditorCanvas
					draft={draft}
					roads={roads}
					tool={tool}
					seed={seed}
					onClick={handleClick}
					onStroke={handleStroke}
				/>

				{castleOpen && draft.castle ? (
					<CastleDialog
						castle={draft.castle}
						onApply={applyCastleHp}
						onDelete={deleteCastle}
						onClose={() => setCastleOpen(false)}
					/>
				) : null}

				{activeSpawner ? (
					<SpawnerDialog
						key={activeSpawner.id}
						spawner={activeSpawner}
						onApply={applySpawner}
						onDelete={deleteSpawner}
						onClose={() => setSpawnerId(null)}
					/>
				) : null}

				{wavesOpen ? (
					<WavesDialog
						waves={draft.waves}
						onApply={applyWaves}
						onClose={() => setWavesOpen(false)}
					/>
				) : null}
			</section>

			<footer className="relative z-30 border-t-2 border-[#3a2a1a] bg-gradient-to-t from-[#1a1208] to-[#0f0a05] px-2 pb-2 pt-1.5 sm:px-3">
				<div className="mb-1.5 flex items-center justify-between gap-2 text-[8px] font-black uppercase tracking-[0.12em]">
					<span className={`truncate ${statusClass}`}>{statusText}</span>
					<span className="hidden shrink-0 tabular-nums text-[#5c3a1a] sm:block">
						HP {draft.castle?.hp ?? '—'} · Казармы {draft.spawners.length}
						{brokenRoads > 0 ? ` (${brokenRoads} без дороги)` : ''} · Волны{' '}
						{draft.waves.useCommon ? 'общие' : draft.waves.waves.length} · Дороги{' '}
						{draft.roadCells.length} · Вода {draft.waterCells.length} · Лес{' '}
						{draft.forestCells.length}
					</span>
				</div>

				<div className="mx-auto flex w-full max-w-3xl gap-1.5">
					{PALETTE.map((entry) => (
						<button
							key={entry.tool}
							type="button"
							onClick={() => setTool(entry.tool)}
							aria-pressed={tool === entry.tool}
							className={toolButtonClass(tool === entry.tool)}
						>
							<span className="text-[8px] leading-none text-[#5c3a1a]">
								{entry.key}
							</span>
							<span className="leading-none">{entry.label}</span>
						</button>
					))}
				</div>

				<p className="mt-1.5 text-center text-[8px] font-bold uppercase tracking-[0.1em] text-[#5c3a1a]">
					ЛКМ — поставить или рисовать · ПКМ/СКМ — двигать камеру · колесо — зум ·
					1–6 — инструменты · клик по замку или казарме — настройки
				</p>
			</footer>
		</main>
	)
}
