'use client'

import { useCallback, useEffect, useState } from 'react'

import { DEFAULT_COLS, DEFAULT_ROWS, resetBoardSize } from '@/features/game/config/game.config'
import { createGameMap } from '@/features/game/engine/map/game-map'
import {
	decodeMapPreview,
	TERRAIN_FOREST,
	TERRAIN_GRASS,
	TERRAIN_ROAD,
	TERRAIN_WATER,
	type MapPreview,
} from '@/features/game/engine/map/map-preview'
import type { PlayerProfile } from '@/features/account/types'
import {
	createMap,
	deleteMap,
	fetchMaps,
	moderateMap,
	submitMap,
	type MapTab,
} from '@/lib/services/map-service'
import type { MapStatus, MapSummary } from '@/types'

type Props = {
	token: string | null
	user: PlayerProfile | null
	onBack: () => void
	onPlay: (map: MapSummary) => void
	onEdit: (map: MapSummary) => void
	// Открыть карту с её личным топом.
	onOpenMap: (map: MapSummary) => void
	// Страница с одним табом: например только рейтинговые карты.
	// Табы тогда скрываются, а список стартует с указанной выборки.
	fixedTab?: MapTab
}

const TABS: Array<{ id: MapTab; label: string }> = [
	{ id: 'rated', label: 'Рейтинговые' },
	{ id: 'unrated', label: 'Не рейтинговые' },
	{ id: 'mine', label: 'Мои' },
]

const ADMIN_TAB: { id: MapTab; label: string } = {
	id: 'pending',
	label: 'На модерацию',
}

const STATUS_LABELS: Record<MapStatus, string> = {
	draft: 'Черновик',
	pending: 'На проверке',
	approved: 'Опубликована',
	rejected: 'Отклонена',
}

const STATUS_TONES: Record<MapStatus, string> = {
	draft: 'border-[#5c3a1a] text-[#8a7340]',
	pending: 'border-sky-700/70 text-sky-300',
	approved: 'border-lime-700/70 text-lime-300',
	rejected: 'border-red-800/70 text-red-300',
}

const dateFormat = new Intl.DateTimeFormat('ru-RU', {
	day: '2-digit',
	month: '2-digit',
	year: '2-digit',
})

const GREEN_BUTTON =
	'border-2 border-[#6b8e32] bg-gradient-to-b from-[#527c28] to-[#304d19] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-lime-100 shadow-[inset_0_1px_0_#a3cf65,0_2px_0_#100904] transition-colors hover:from-[#628e33] hover:to-[#3d6022] disabled:cursor-not-allowed disabled:opacity-40 active:translate-y-[1px] active:shadow-[0_1px_0_#100904] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400'

const DARK_BUTTON =
	'border-2 border-[#79502b] bg-[#21150c] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-amber-200 shadow-[0_2px_0_#100904] transition-colors hover:border-amber-400 hover:text-amber-50 disabled:cursor-not-allowed disabled:opacity-40 active:translate-y-[1px] active:shadow-[0_1px_0_#100904] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400'

const DANGER_BUTTON =
	'border-2 border-[#7f2d24] bg-[#2a0f0a] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-red-200 shadow-[0_2px_0_#100904] transition-colors hover:border-red-500 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-40 active:translate-y-[1px] active:shadow-[0_1px_0_#100904] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400'

const TERRAIN_FILLS: Record<number, string> = {
	[TERRAIN_FOREST]: '#33501c',
	[TERRAIN_WATER]: '#3d7f9c',
	[TERRAIN_ROAD]: '#cdb178',
}

type TerrainRun = { key: string; x: number; y: number; width: number; fill: string }

// Превью приходит строкой уменьшенных клеток, поэтому ряды одинакового
// типа сливаем в один прямоугольник: узлов получаются десятки, а тысячи.
function previewRuns(preview: MapPreview): TerrainRun[] {
	const cells = decodeMapPreview(preview)
	const runs: TerrainRun[] = []

	for (let y = 0; y < preview.rows; y++) {
		let x = 0
		while (x < preview.cols) {
			const value = cells[y * preview.cols + x] ?? TERRAIN_GRASS
			if (value === TERRAIN_GRASS) {
				x++
				continue
			}

			const fill = TERRAIN_FILLS[value] ?? ''
			let end = x + 1
			while (end < preview.cols && cells[y * preview.cols + end] === value) end++
			runs.push({ key: `${x},${y},${value}`, x, y, width: end - x, fill })
			x = end
		}
	}

	return runs
}

// Лес плотный, поэтому рисуем его рядами: соседние клетки сливаются
// в один прямоугольник, и миниатюра не распухает до тысяч узлов.
function forestRuns(cells: string[]) {
	const byRow = new Map<number, number[]>()
	for (const cell of cells) {
		const [x = 0, y = 0] = cell.split(',').map(Number)
		const row = byRow.get(y)
		if (row) row.push(x)
		else byRow.set(y, [x])
	}

	const runs: Array<{ x: number; y: number; width: number }> = []
	for (const [y, xs] of byRow) {
		xs.sort((a, b) => a - b)
		let start = xs[0] ?? 0
		let previous = start

		for (let i = 1; i < xs.length; i++) {
			const x = xs[i] ?? 0
			if (x === previous + 1) {
				previous = x
				continue
			}

			runs.push({ x: start, y, width: previous - start + 1 })
			start = x
			previous = x
		}

		runs.push({ x: start, y, width: previous - start + 1 })
	}

	return runs
}

// Клетка-превью в карточке: список задаёт ей размер, поэтому он же
// решает, остаётся ли миниатюра квадратом или растягивается на всю карточку.
const THUMB_TILE = 'h-20 w-20 shrink-0 overflow-hidden'

// Схема настоящей карты по её сиду: трава, лес, водоёмы, дороги и замок.
function SeedThumbnail({ seed, size = THUMB_TILE }: { seed: string; size?: string }) {
	// Карта по сиду всегда занимает поле по умолчанию.
	resetBoardSize()
	const map = createGameMap(seed)
	const [castleX, castleY] = [Math.floor(DEFAULT_COLS / 2), Math.floor(DEFAULT_ROWS / 2)]

	return (
		<span className={`relative block border border-[#5c3a1a] bg-[#0f0a05] shadow-[inset_0_2px_8px_#000] ${size}`}>
			<svg
				viewBox={`0 0 ${DEFAULT_COLS} ${DEFAULT_ROWS}`}
				preserveAspectRatio="xMidYMid slice"
				className="h-full w-full"
				aria-hidden="true"
			>
				<rect width={DEFAULT_COLS} height={DEFAULT_ROWS} fill="#4c6d26" />
				<g fill="#33501c">
					{forestRuns(map.forestCells).map((run) => (
						<rect key={`${run.x},${run.y}`} x={run.x} y={run.y} width={run.width} height={1} />
					))}
				</g>
				{map.waterCells.map((cell) => {
					const [x = 0, y = 0] = cell.split(',').map(Number)
					return <rect key={cell} x={x - 0.05} y={y - 0.05} width={1.1} height={1.1} rx={0.35} fill="#3d7f9c" />
				})}
				{map.roads.map((road, index) => (
					<polyline
						key={index}
						points={road.map(([x, y]) => `${x},${y}`).join(' ')}
						fill="none"
						stroke="#cdb178"
						strokeWidth={2}
						strokeLinejoin="round"
						strokeLinecap="round"
					/>
				))}
				<rect
					x={castleX - 2.5}
					y={castleY - 2.5}
					width={5}
					height={5}
					fill="#2b1a0b"
					stroke="#e0b25a"
					strokeWidth={0.9}
				/>
			</svg>
		</span>
	)
}

// Превью пользовательской карты: местность из уменьшенной сетки сервера
// плюс замок и точки казарм из сохранённого черновика.
function CustomThumbnail({ map, size = THUMB_TILE }: { map: MapSummary; size?: string }) {
	const preview = map.preview
	const runs = preview ? previewRuns(preview) : []
	const cellWidth = preview ? map.cols / preview.cols : 0
	const cellHeight = preview ? map.rows / preview.rows : 0

	return (
		<span className={`relative block border border-[#5c3a1a] bg-[#0f0a05] shadow-[inset_0_2px_8px_#000] ${size}`}>
			<svg
				viewBox={`0 0 ${map.cols} ${map.rows}`}
				preserveAspectRatio="xMidYMid slice"
				className="h-full w-full"
				aria-hidden="true"
			>
				<rect width={map.cols} height={map.rows} fill="#4c6d26" />
				<g shapeRendering="crispEdges">
					{runs.map((run) => (
						<rect
							key={run.key}
							x={run.x * cellWidth - cellWidth * 0.04}
							y={run.y * cellHeight - cellHeight * 0.04}
							width={run.width * cellWidth + cellWidth * 0.08}
							height={cellHeight * 1.08}
							fill={run.fill}
						/>
					))}
				</g>
				{map.spawners.map((spawner, index) => (
					<rect
						key={`${spawner.x},${spawner.y},${index}`}
						x={spawner.x - 1.5}
						y={spawner.y - 1.5}
						width={3}
						height={3}
						fill="#2b1a0b"
						stroke="#8a7340"
						strokeWidth={0.7}
					/>
				))}
				{map.castle ? (
					<rect
						x={map.castle.x - 2.5}
						y={map.castle.y - 2.5}
						width={5}
						height={5}
						fill="#2b1a0b"
						stroke="#e0b25a"
						strokeWidth={0.9}
					/>
				) : null}
			</svg>
		</span>
	)
}

function MapThumbnail({ map, size }: { map: MapSummary; size?: string }) {
	return map.custom ? <CustomThumbnail map={map} size={size} /> : <SeedThumbnail seed={map.seed} size={size} />
}

export default function MapsMenu({ token, user, onBack, onPlay, onEdit, onOpenMap, fixedTab }: Props) {
	const [mounted, setMounted] = useState(false)
	const [tab, setTab] = useState<MapTab>(fixedTab ?? 'mine')
	const [maps, setMaps] = useState<MapSummary[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [creating, setCreating] = useState(false)
	const [busyId, setBusyId] = useState<string | null>(null)
	const [confirmId, setConfirmId] = useState<string | null>(null)
	const [notice, setNotice] = useState<string | null>(null)

	const isAdmin = user?.role === 'admin'
	const tabs = isAdmin ? [...TABS, ADMIN_TAB] : TABS

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setMounted(true)
	}, [])

	const load = useCallback(async () => {
		if (!token) {
			setMaps([])
			setLoading(false)
			setError(null)
			return
		}
		setLoading(true)
		setError(null)
		try {
			setMaps(await fetchMaps(token, tab))
		} catch (loadError) {
			setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить карты')
		} finally {
			setLoading(false)
		}
	}, [token, tab])

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		void load()
	}, [load])

	const changeTab = (next: MapTab) => {
		if (next === tab) return
		setTab(next)
		setConfirmId(null)
		setNotice(null)
	}

	const handleCreate = async () => {
		if (!token || creating) return
		setCreating(true)
		setError(null)
		try {
			const map = await createMap(token)
			onEdit(map)
		} catch (createError) {
			setError(createError instanceof Error ? createError.message : 'Не удалось создать карту')
			setCreating(false)
		}
	}

	const handleSubmit = async (map: MapSummary) => {
		if (!token || busyId) return
		setBusyId(map.id)
		setNotice(null)
		try {
			const updated = await submitMap(token, map.id)
			setMaps((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
			setNotice(`«${updated.name}» отправлена на модерацию`)
		} catch (submitError) {
			setNotice(submitError instanceof Error ? submitError.message : 'Не удалось отправить карту')
		} finally {
			setBusyId(null)
		}
	}

	const handleModerate = async (map: MapSummary, rated: boolean) => {
		if (!token || busyId) return
		setBusyId(map.id)
		setNotice(null)
		try {
			await moderateMap(token, map.id, { moderation: 'approved', rated })
			setMaps((prev) => prev.filter((item) => item.id !== map.id))
			setNotice(
				`«${map.name}» опубликована как ${rated ? 'рейтинговая' : 'обычная'} карта`,
			)
		} catch (moderateError) {
			setNotice(moderateError instanceof Error ? moderateError.message : 'Не удалось обновить карту')
		} finally {
			setBusyId(null)
		}
	}

	const handleReject = async (map: MapSummary) => {
		if (!token || busyId) return
		setBusyId(map.id)
		setNotice(null)
		try {
			await moderateMap(token, map.id, { moderation: 'rejected' })
			setMaps((prev) => prev.filter((item) => item.id !== map.id))
			setNotice(`«${map.name}» отклонена`)
		} catch (rejectError) {
			setNotice(rejectError instanceof Error ? rejectError.message : 'Не удалось отклонить карту')
		} finally {
			setBusyId(null)
		}
	}

	const handleDelete = async (map: MapSummary) => {
		if (!token || busyId) return
		setBusyId(map.id)
		setNotice(null)
		try {
			await deleteMap(token, map.id)
			setMaps((prev) => prev.filter((item) => item.id !== map.id))
			setConfirmId(null)
			setNotice(`«${map.name}» удалена`)
		} catch (deleteError) {
			setNotice(deleteError instanceof Error ? deleteError.message : 'Не удалось удалить карту')
		} finally {
			setBusyId(null)
		}
	}

	const renderActions = (map: MapSummary) => {
		const busy = busyId === map.id

		if (tab === 'pending') {
			return (
				<>
					<button
						type="button"
						onClick={() => void handleModerate(map, true)}
						disabled={busy}
						className={GREEN_BUTTON}
					>
						Рейтинговая
					</button>
					<button
						type="button"
						onClick={() => void handleModerate(map, false)}
						disabled={busy}
						className={DARK_BUTTON}
					>
						Обычная
					</button>
					<button
						type="button"
						onClick={() => void handleReject(map)}
						disabled={busy}
						className={DANGER_BUTTON}
					>
						Отклонить
					</button>
				</>
			)
		}

		if (tab !== 'mine') {
			return (
				<button type="button" onClick={() => onPlay(map)} className={GREEN_BUTTON}>
					Играть
				</button>
			)
		}

		return (
			<>
				<button
					type="button"
					onClick={() => onPlay(map)}
					disabled={busy}
					className={GREEN_BUTTON}
				>
					Играть
				</button>
				<button
					type="button"
					onClick={() => onEdit(map)}
					disabled={busy}
					className={DARK_BUTTON}
				>
					Редактор
				</button>
				{map.status === 'pending' ? (
					<span className="border-2 border-sky-700/70 px-2 py-1 text-center text-[8px] font-black uppercase tracking-[0.12em] text-sky-300">
						На проверке
					</span>
				) : (
					<button
						type="button"
						onClick={() => void handleSubmit(map)}
						disabled={busy || !map.custom}
						className={DARK_BUTTON}
					>
						{map.status === 'rejected' ? 'Повторить' : 'На модерацию'}
					</button>
				)}
				{confirmId === map.id ? (
					<span className="flex gap-1">
						<button
							type="button"
							onClick={() => void handleDelete(map)}
							disabled={busy}
							className={DANGER_BUTTON}
						>
							Точно?
						</button>
						<button
							type="button"
							onClick={() => setConfirmId(null)}
							disabled={busy}
							className={DARK_BUTTON}
						>
							Нет
						</button>
					</span>
				) : (
					<button
						type="button"
						onClick={() => setConfirmId(map.id)}
						disabled={busy}
						className={DANGER_BUTTON}
					>
						Удалить
					</button>
				)}
			</>
		)
	}

	const rows = maps.map((map) => (
		<div
			key={map.id}
			className="flex flex-col gap-2 border border-[#3a2a1a]/60 bg-[#161009]/70 p-2 transition-colors hover:border-[#79502b] hover:bg-[#21150c]/70"
		>
			<button
				type="button"
				onClick={() => onOpenMap(map)}
				aria-label={`Топ карты ${map.name}`}
				className="flex min-w-0 flex-col items-start gap-1.5 self-stretch text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
			>
				<MapThumbnail map={map} size="h-24 w-full overflow-hidden sm:h-28" />

				<span className="flex flex-wrap items-center gap-1.5">
					<span className="min-w-0 truncate text-[11px] font-black uppercase tracking-wide text-amber-200">{map.name}</span>
					<span className={`border px-1 py-0.5 text-[7px] font-black uppercase tracking-[0.1em] ${STATUS_TONES[map.status]}`}>
						{STATUS_LABELS[map.status]}
					</span>
					{map.rated ? (
						<span className="border border-amber-600/70 px-1 py-0.5 text-[7px] font-black uppercase tracking-[0.1em] text-amber-300">
							Рейтинг
						</span>
					) : null}
				</span>
				<span className="text-[8px] font-bold uppercase tracking-[0.1em] text-[#8a7340]">
					{map.stars.toFixed(1)}★ &#183; {map.custom ? `Редактор · ${map.spawners.length} каз.` : `${map.cols}\u00d7${map.rows}`} &#183; Сложность: {map.difficulty}
				</span>
				<span className="w-full truncate text-[8px] font-bold tabular-nums text-[#5c3a1a]">
					{map.custom ? `HP ${map.castle?.hp ?? '—'}` : `Сид ${map.seed.slice(0, 8)}`} &#183; {dateFormat.format(new Date(map.createdAt))}
					{map.author ? ` · Автор: ${map.author}` : ''}
				</span>
			</button>

			<span className="mt-auto flex flex-wrap gap-1">{renderActions(map)}</span>
		</div>
	))

	const emptyText =
		tab === 'rated'
			? 'Рейтинговых карт пока нет'
			: tab === 'unrated'
				? 'Опубликованных карт пока нет'
				: tab === 'pending'
					? 'Очередь модерации пуста'
					: 'Сохранённых карт пока нет'

	return (
		<main className="relative h-[100dvh] w-full overflow-y-auto bg-[url(/game/background.png)] bg-cover bg-center px-3 py-4 font-mono text-[#e2c8a0] selection:bg-amber-900 selection:text-amber-100 sm:px-4">
			<div className="fixed inset-0 bg-[#05080a]/85" />

			<div className="relative mx-auto w-full max-w-3xl pb-6 sm:max-w-5xl xl:max-w-7xl">
				<button
					type="button"
					onClick={onBack}
					className="mb-3 inline-flex items-center gap-2 rounded-none border-2 border-[#79502b] bg-[#21150c] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-amber-200 shadow-[0_3px_0_#100904] transition-colors hover:border-amber-400 hover:text-amber-50 active:translate-y-[2px] active:shadow-[0_1px_0_#100904] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
				>
					<span className="text-[14px] leading-none">←</span>
					Назад
				</button>

				<div className="rounded-none border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208]/95 to-[#0f0a05]/95 shadow-[0_0_30px_rgba(0,0,0,0.9)]">
					<div className="flex items-center justify-between gap-3 border-b border-[#3a2a1a] px-3 py-2.5">
						<div className="min-w-0">
							<h1 className="text-sm font-black uppercase tracking-[0.18em] text-amber-300 drop-shadow-[0_2px_0_#5c2d0e]">
								{fixedTab === 'rated' ? 'Рейтинговые карты' : 'Библиотека карт'}
							</h1>
							<p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-[#8a7340]">
								{fixedTab === 'rated'
									? 'Выбери карту — забег засчитается в рейтинг'
									: 'Опубликованные и свои карты'}
							</p>
						</div>

						{tab === 'mine' ? (
							<button
								type="button"
								onClick={() => void handleCreate()}
								disabled={creating || !mounted || !token}
								className="shrink-0 border-2 border-[#6b8e32] bg-gradient-to-b from-[#527c28] to-[#304d19] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-lime-100 shadow-[inset_0_1px_0_#a3cf65,0_2px_0_#100904] transition-colors hover:from-[#628e33] hover:to-[#3d6022] disabled:cursor-not-allowed disabled:opacity-40 active:translate-y-[1px] active:shadow-[0_1px_0_#100904] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400"
							>
								{creating ? 'Создаём…' : 'Создать'}
							</button>
						) : null}
					</div>

					{fixedTab ? null : (
						<div className="flex flex-wrap gap-1 border-b border-[#3a2a1a] p-1.5">
							{tabs.map((item) => {
								const active = tab === item.id
								return (
									<button
										key={item.id}
										type="button"
										onClick={() => changeTab(item.id)}
										aria-pressed={active}
										className={`border-2 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] transition-colors ${
											active
												? 'border-amber-500 bg-[#3a2a12] text-amber-100'
												: 'border-[#3a2a1a] bg-[#161009] text-[#8a7340] hover:border-[#79502b] hover:text-amber-200'
										}`}
									>
										{item.label}
									</button>
								)
							})}
						</div>
					)}

					<div className={rows.length > 0 ? 'grid gap-2 p-1.5 sm:grid-cols-2 xl:grid-cols-3' : undefined}>
						{!mounted || loading ? (
							<p className="px-3 py-6 text-center text-[9px] font-bold uppercase tracking-[0.14em] text-[#8a7340]">Загрузка карт…</p>
						) : rows.length > 0 ? (
							rows
						) : !token ? (
							<p className="px-3 py-6 text-center text-[9px] font-bold text-[#5c3a1a]">
								Войдите в аккаунт, чтобы видеть карты
							</p>
						) : error ? (
							<div className="px-3 py-6 text-center">
								<p className="text-[9px] font-bold text-red-300">{error}</p>
								<button
									type="button"
									onClick={() => void load()}
									className="mt-2 border border-[#5c3a1a] bg-[#21150c] px-3 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-amber-200 transition-colors hover:border-amber-400 hover:text-amber-50"
								>
									Повторить
								</button>
							</div>
						) : (
							<p className="px-3 py-6 text-center text-[9px] font-bold text-[#5c3a1a]">{emptyText}</p>
						)}
					</div>

					{notice ? (
						<div className="border-t border-[#3a2a1a] px-3 py-2 text-center text-[9px] font-black uppercase tracking-[0.12em] text-amber-200">
							{notice}
						</div>
					) : null}

					{error && maps.length > 0 ? (
						<div className="border-t border-[#3a2a1a] px-3 py-2 text-center text-[9px] font-black uppercase tracking-[0.12em] text-red-300">
							{error}
						</div>
					) : null}
				</div>

				{mounted && tab === 'mine' && !loading && !error && maps.length === 0 && token ? (
					<p className="mt-3 text-center text-[10px] font-bold text-[#8a7340]">
						Нажмите &#171;Создать&#187;, чтобы добавить первую карту
					</p>
				) : null}
			</div>
		</main>
	)
}
