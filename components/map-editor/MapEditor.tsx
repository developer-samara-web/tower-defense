'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import MapEditorCanvas from '@/components/map-editor/MapEditorCanvas'
import CastleDialog from '@/components/map-editor/CastleDialog'
import SpawnerDialog from '@/components/map-editor/SpawnerDialog'
import WavesDialog from '@/components/map-editor/WavesDialog'
import { useAuth } from '@/hooks/useAuth'
import { BOARD_SIZE_STEP, clampBoardSize } from '@/features/game/config/game.config'
import type { EditorCell, EditorTool } from '@/features/game/editor/types'
import {
	canPlaceSpawner,
	castleCellKeys,
	cellKey,
	clampCastleCell,
	createEmptyMapDraft,
	createMapSpawner,
	draftSize,
	DEFAULT_CASTLE_HP,
	isBoardCell,
	isCastleCell,
	MAP_LIMITS,
	parseCellKey,
	resizeMapDraft,
	spawnerRoads,
	validateDraft,
	type BoardSize,
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

// Те же плавающие панели, что и в игровом HUD: карта занимает весь
// экран, а интерфейс висит над ней и не спорит с полем.
const PANEL =
	'border-2 border-[#79552c] bg-[#0f0a05]/90 shadow-[0_8px_24px_rgba(0,0,0,0.65),0_3px_0_#2a1d0a] backdrop-blur-md'

const SQUARE_BUTTON =
	'group relative flex h-10 w-10 items-center justify-center border-2 border-[#79502b] bg-[#21150c] text-amber-300 shadow-[inset_0_1px_0_rgba(255,220,150,0.15),0_3px_0_#100904] transition-colors hover:border-yellow-400 hover:bg-[#493713] hover:text-yellow-200 active:translate-y-[2px] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400'

const SQUARE_BUTTON_ACTIVE =
	'group relative flex h-10 w-10 items-center justify-center border-2 border-yellow-400 bg-[#493713] text-yellow-200 shadow-[inset_0_1px_0_rgba(255,220,150,0.2),0_0_12px_rgba(250,204,21,0.3)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400'

// Название инструмента показываем только по наведению, как в HUD.
const HOVER_LABEL =
	'pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 -translate-x-1/2 whitespace-nowrap border-2 border-[#3a2a1a] bg-[#0f0a05]/95 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-amber-200 opacity-0 shadow-[0_6px_14px_rgba(0,0,0,0.8)] transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100'

const FIELD_BUTTON =
	'flex h-6 w-6 items-center justify-center border-2 border-[#5c3a1a] bg-[#21170d] text-[12px] font-black leading-none text-amber-200 transition-colors hover:border-[#a67c36] hover:bg-[#352411] disabled:cursor-not-allowed disabled:opacity-35'

const PLAY_BUTTON =
	'group relative flex h-10 w-10 items-center justify-center border-2 border-[#6b8e32] bg-gradient-to-b from-[#527c28] to-[#304d19] text-lime-100 shadow-[inset_0_1px_0_#a3cf65,0_3px_0_#100904] transition-colors hover:from-[#628e33] hover:to-[#3d6022] disabled:cursor-not-allowed disabled:opacity-40 active:translate-y-[2px] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400'

// Кнопка выхода та же, что в библиотеке карт и профиле: стрелка со словами.
const BACK_BUTTON =
	'inline-flex shrink-0 items-center gap-2 rounded-none border-2 border-[#79502b] bg-[#21150c] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-amber-200 shadow-[0_3px_0_#100904] transition-colors hover:border-amber-400 hover:text-amber-50 active:translate-y-[2px] active:shadow-[0_1px_0_#100904] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400'

const TOOL_ICONS: Record<EditorTool, string> = {
	castle: 'M6 19V8l6-4 6 4v11h-4v-5h-4v5H6z',
	spawner: 'M5 19V9l7-4 7 4v10h-5v-4h-4v4H5z M12 2v3',
	road: 'M8 20c0-5 8-5 8-10M8 4c0 5 8 5 8 10 M6 5h4M6 19h4M14 5h4M14 19h4',
	river: 'M3 9c3-2 5 2 8 0s5-2 8 0M3 15c3-2 5 2 8 0s5-2 8 0',
	forest: 'M12 3l5 8h-3l3 5H7l3-5H7l5-8z M12 16v5',
	erase: 'M5 15l6-6 6 6-4 4H9l-4-4z M11 19h9',
}

// Клетки храним по порядку: одинаковый черновик даёт одинаковый JSON,
// и сохранение без правок не плодит лишних записей.
function sortCells(cells: Iterable<string>) {
	return Array.from(cells).sort((a, b) => {
		const [ax = 0, ay = 0] = parseCellKey(a)
		const [bx = 0, by = 0] = parseCellKey(b)
		return ay === by ? ax - bx : ay - by
	})
}

function ToolIcon({ tool }: { tool: EditorTool }) {
	return (
		<svg
			viewBox="0 0 24 24"
			className="relative h-5 w-5 transition-transform duration-150 group-hover:scale-110"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="square"
			strokeLinejoin="miter"
			aria-hidden="true"
		>
			<path d={TOOL_ICONS[tool]} />
		</svg>
	)
}

// Размер поля задают в клетках: шаг и пределы берут из конфига поля.
function SizeField({
	label,
	value,
	onChange,
}: {
	label: string
	value: number
	onChange: (next: number) => void
}) {
	const shift = (delta: number) => onChange(clampBoardSize(value + delta, value))

	return (
		<div className="flex items-center gap-1" title="Размер поля в клетках">
			<span className="text-[8px] font-black uppercase tracking-[0.12em] text-[#8a7340]">
				{label}
			</span>
			<button
				type="button"
				onClick={() => shift(-BOARD_SIZE_STEP)}
				disabled={clampBoardSize(value - BOARD_SIZE_STEP, value) === value}
				aria-label={`${label} меньше`}
				className={FIELD_BUTTON}
			>
				−
			</button>
			<span className="w-9 shrink-0 text-center text-[11px] font-black tabular-nums text-amber-200">
				{value}
			</span>
			<button
				type="button"
				onClick={() => shift(BOARD_SIZE_STEP)}
				disabled={clampBoardSize(value + BOARD_SIZE_STEP, value) === value}
				aria-label={`${label} больше`}
				className={FIELD_BUTTON}
			>
				+
			</button>
		</div>
	)
}

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
	const [hintsOpen, setHintsOpen] = useState(false)
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
				setHintsOpen(false)
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

	// Размер поля живёт в черновике, поэтому вместе с ним уходят и клетки
	// за новым краем. Полотну передаём новый ключ — сцена строит поле заново.
	const resizeBoard = useCallback(
		(size: BoardSize) => {
			if (!draft) return

			const resized = resizeMapDraft(draft, size.cols, size.rows)
			setDraft(resized.draft)
			setDirty(true)
			if (resized.removed > 0) {
				setNotice(`За новым краем карты пропало клеток: ${resized.removed}`)
			}
		},
		[draft],
	)

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
				const size = draftSize(current)
				const water = new Set(current.waterCells)
				const forest = new Set(current.forestCells)
				const road = new Set(current.roadCells)

				for (const key of list) {
					const [x, y] = parseCellKey(key)
					if (!isBoardCell(x, y, size)) continue
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

			const [x, y] = clampCastleCell(cell.x, cell.y, draftSize(draft))
			updateDraft((current) => {
				const size = draftSize(current)
				const castle = { x, y, hp: current.castle?.hp ?? DEFAULT_CASTLE_HP }
				const castleKeys = new Set(castleCellKeys(castle))

				return {
					...current,
					castle,
					waterCells: current.waterCells.filter((key) => !castleKeys.has(key)),
					forestCells: current.forestCells.filter((key) => !castleKeys.has(key)),
					roadCells: current.roadCells.filter((key) => !castleKeys.has(key)),
					spawners: current.spawners.filter((spawner) =>
						canPlaceSpawner(castle, spawner.x, spawner.y, size),
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

			if (!canPlaceSpawner(draft.castle, cell.x, cell.y, draftSize(draft))) {
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
				<div className={`relative w-full max-w-sm p-5 text-center ${PANEL}`}>
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
		<main className="relative h-[100dvh] w-full overflow-hidden bg-[#0b1408] font-mono text-[#e2c8a0] selection:bg-amber-900 selection:text-amber-100">
			<div className="absolute inset-0">
				<MapEditorCanvas
					key={`${draft.cols}x${draft.rows}`}
					draft={draft}
					roads={roads}
					tool={tool}
					seed={seed}
					onClick={handleClick}
					onStroke={handleStroke}
				/>
			</div>

			{/* Карта занимает весь экран, интерфейс только висит поверх неё. */}
			<div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 p-3">
				<div className={`pointer-events-auto flex items-center gap-2.5 p-2.5 ${PANEL}`}>
					<button
						type="button"
						onClick={goBack}
						aria-label="К списку карт"
						title="К списку карт"
						className={BACK_BUTTON}
					>
						<span className="text-[14px] leading-none">←</span>
						Назад
					</button>

					<input
						type="text"
						value={name}
						maxLength={40}
						onChange={(event) => {
							setName(event.target.value)
							setDirty(true)
						}}
						placeholder="Название карты"
						aria-label="Название карты"
						className="w-[120px] border-2 border-[#5c3a1a] bg-[#0f0a05] px-2.5 py-2 text-[11px] font-black text-amber-200 outline-none focus:border-amber-500 sm:w-[190px]"
					/>

					<select
						value={difficulty}
						onChange={(event) => {
							setDifficulty(event.target.value)
							setDirty(true)
						}}
						aria-label="Сложность"
						className="border-2 border-[#5c3a1a] bg-[#0f0a05] px-2 py-2 text-[10px] font-black text-amber-200 outline-none focus:border-amber-500"
					>
						{DIFFICULTIES.map((value) => (
							<option key={value} value={value}>
								{value}
							</option>
						))}
					</select>
				</div>

				<div className="pointer-events-auto flex items-center gap-2 p-2.5">
					<button
						type="button"
						onClick={() => setWavesOpen(true)}
						aria-label="Настройки волн"
						title={`Волны: ${draft.waves.useCommon ? 'общие' : draft.waves.waves.length}`}
						className={SQUARE_BUTTON}
					>
						<svg viewBox="0 0 24 24" className="relative h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" aria-hidden="true">
							<path d="M3 15l4-6 4 6 4-6 4 6" />
						</svg>
						<span className="absolute -bottom-1 -right-1 min-w-4 border border-[#21150c] bg-[#493713] px-0.5 text-center text-[8px] font-black leading-tight text-yellow-200">
							{draft.waves.useCommon ? '∞' : draft.waves.waves.length}
						</span>
					</button>

					<button
						type="button"
						onClick={() => void persist()}
						disabled={saving || loading}
						aria-label={saving ? 'Сохраняем' : dirty ? 'Сохранить карту' : 'Карта сохранена'}
						title={saving ? 'Сохраняем…' : dirty ? 'Сохранить' : 'Сохранено'}
						className={SQUARE_BUTTON}
					>
						<svg viewBox="0 0 24 24" className="relative h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" aria-hidden="true">
							<path d="M5 5h11l3 3v11H5z" />
							<path d="M9 5v5h6V5M8 19v-5h8v5" />
						</svg>
						{dirty && !saving ? (
							<span className="absolute -right-[3px] -top-[3px] h-2 w-2 border border-[#21150c] bg-yellow-400 shadow-[0_0_5px_#facc15]" />
						) : null}
					</button>

					<button
						type="button"
						onClick={() => void play()}
						disabled={saving || Boolean(issue)}
						aria-label="Играть на этой карте"
						title={issue ?? 'Играть на этой карте'}
						className={PLAY_BUTTON}
					>
						<svg viewBox="0 0 24 24" className="relative h-5 w-5" fill="currentColor" aria-hidden="true">
							<path d="M8 5l11 7-11 7z" />
						</svg>
					</button>
				</div>
			</div>

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

			<div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-1.5 p-2 sm:p-3">
				{hintsOpen ? (
					<div className={`pointer-events-auto max-w-[92vw] px-3 py-1.5 text-center text-[9px] font-bold uppercase tracking-[0.1em] text-[#8a7340] ${PANEL}`}>
						ЛКМ — ставить и рисовать · ПКМ/СКМ — двигать камеру · колесо — зум ·
						1–6 — инструменты · клик по замку или казарме — настройки
					</div>
				) : (
					<div className={`pointer-events-auto flex max-w-[92vw] items-center gap-2 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${PANEL}`}>
						<span className={`truncate ${statusClass}`}>{statusText}</span>
						<span className="hidden shrink-0 tabular-nums text-[#8a7340] sm:block">
							{draft.cols}×{draft.rows} кл. · HP {draft.castle?.hp ?? '—'} · Казармы{' '}
							{draft.spawners.length}
							{brokenRoads > 0 ? ` (${brokenRoads} без дороги)` : ''} · Дороги{' '}
							{draft.roadCells.length} · Вода {draft.waterCells.length} · Лес{' '}
							{draft.forestCells.length}
						</span>
					</div>
				)}

				<div className={`pointer-events-auto flex flex-wrap items-center justify-center gap-2 p-1.5 ${PANEL}`}>
					{PALETTE.map((entry) => (
						<button
							key={entry.tool}
							type="button"
							onClick={() => setTool(entry.tool)}
							aria-pressed={tool === entry.tool}
							aria-label={entry.label}
							className={tool === entry.tool ? SQUARE_BUTTON_ACTIVE : SQUARE_BUTTON}
						>
							<ToolIcon tool={entry.tool} />
							<span className={HOVER_LABEL}>
								{entry.label} · {entry.key}
							</span>
						</button>
					))}

					<span className="h-10 w-px bg-[#3a2a1a]" />

					<div className="flex items-center gap-2">
						<span className="text-[8px] font-black uppercase tracking-[0.12em] text-[#8a7340]">
							Поле
						</span>
						<SizeField
							label="Ш"
							value={draft.cols}
							onChange={(cols) => resizeBoard({ cols, rows: draft.rows })}
						/>
						<SizeField
							label="В"
							value={draft.rows}
							onChange={(rows) => resizeBoard({ cols: draft.cols, rows })}
						/>
					</div>

					<span className="h-10 w-px bg-[#3a2a1a]" />

					<button
						type="button"
						onClick={() => setHintsOpen((open) => !open)}
						aria-expanded={hintsOpen}
						aria-label="Как управлять редактором"
						title="Управление"
						className={hintsOpen ? SQUARE_BUTTON_ACTIVE : SQUARE_BUTTON}
					>
						<svg viewBox="0 0 24 24" className="relative h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" aria-hidden="true">
							<circle cx="12" cy="12" r="9" />
							<path d="M9.5 9.5a2.5 2.5 0 114 2c-1 .8-1.5 1.3-1.5 2.5" />
							<rect x="11" y="17" width="2" height="2" fill="currentColor" stroke="none" />
						</svg>
					</button>
				</div>
			</div>
		</main>
	)
}
