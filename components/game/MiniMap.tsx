import { useEffect, useRef } from 'react'

import { CELL_SIZE, COLS, ROWS } from '@/features/game/config/game.config'

const SIZE = 96
const GRID_STEP = 25

export default function MiniMap({
	pathCells,
	waterCells,
	towerCells,
	towers,
	enemies,
	viewport,
	onNavigate,
}: {
	pathCells?: ReadonlySet<string> | string[]
	waterCells?: ReadonlySet<string> | string[]
	towerCells?: ReadonlySet<string> | string[]
	towers?: Array<{ id: string; x: number; y: number }>
	enemies?: Array<{ x: number; y: number }>
	viewport?: { worldX: number; worldY: number; width: number; height: number; zoom: number }
	onNavigate?: (worldX: number, worldY: number) => void
}) {
	const ref = useRef<HTMLCanvasElement>(null)

	useEffect(() => {
		const canvas = ref.current
		if (!canvas) return
		const ctx = canvas.getContext('2d')
		if (!ctx) return

		const size = SIZE
		const cols = COLS
		const rows = ROWS
		// Канва квадратная, а поле — нет. Тянем каждую ось своим
		// масштабом, тогда и клик по миникарте, и рамка обзора попадают
		// в ту же клетку, что и нарисованная дорога.
		const scaleX = size / cols
		const scaleY = size / rows
		const cellW = Math.max(1, Math.ceil(scaleX))
		const cellH = Math.max(1, Math.ceil(scaleY))

		canvas.width = size
		canvas.height = size

		// Тёмный фон поля
		ctx.fillStyle = '#1a1508'
		ctx.fillRect(0, 0, size, size)

		// Тонкая сетка для ориентировки
		ctx.strokeStyle = '#2a1d0a'
		ctx.lineWidth = 0.5
		for (let i = 0; i <= cols; i += GRID_STEP) {
			const px = i * scaleX
			ctx.beginPath()
			ctx.moveTo(px, 0)
			ctx.lineTo(px, size)
			ctx.stroke()
		}
		for (let i = 0; i <= rows; i += GRID_STEP) {
			const py = i * scaleY
			ctx.beginPath()
			ctx.moveTo(0, py)
			ctx.lineTo(size, py)
			ctx.stroke()
		}

		// Замок (центр карты)
		const cxCenter = Math.round(cols / 2)
		const cyCenter = Math.round(rows / 2)
		ctx.fillStyle = '#68451f'
		ctx.fillRect(
			(cxCenter - 1) * scaleX,
			(cyCenter - 1) * scaleY,
			3 * scaleX,
			3 * scaleY,
		)

		// Область просмотра (камера). worldView уже лежит в мировых
		// пикселях, поэтому на zoom больше не делим.
		if (viewport) {
			const vx = (viewport.worldX / CELL_SIZE) * scaleX
			const vy = (viewport.worldY / CELL_SIZE) * scaleY
			const vw = (viewport.width / CELL_SIZE) * scaleX
			const vh = (viewport.height / CELL_SIZE) * scaleY
			// На минимальном зуме обзор шире поля — рамку режем по канве.
			let left = Math.max(0, Math.round(vx))
			let top = Math.max(0, Math.round(vy))
			let right = Math.min(size, Math.round(vx + vw))
			let bottom = Math.min(size, Math.round(vy + vh))
			// Обводка идёт по центру контура, поэтому у самого края канвы
			// её отрезает: отступаем на пиксель, чтобы рамку было видно.
			if (left === 0) left = 1
			if (top === 0) top = 1
			if (right >= size) right = size - 1
			if (bottom >= size) bottom = size - 1

			if (right > left && bottom > top) {
				ctx.strokeStyle = '#eab308'
				ctx.lineWidth = 1.5
				ctx.setLineDash([3, 2])
				ctx.strokeRect(left, top, right - left, bottom - top)
				ctx.setLineDash([])
			}
		}

		// Дорога
		if (pathCells) {
			ctx.fillStyle = '#c99b3b'
			const setPath = typeof (pathCells as Set<string>).has === 'function'
				? (pathCells as ReadonlySet<string>)
				: new Set(pathCells as string[])

			for (const key of setPath) {
				const [cx, cy] = key.split(',').map(Number)
				if (cx !== undefined && cy !== undefined) {
					ctx.fillRect(
						Math.round(cx * scaleX),
						Math.round(cy * scaleY),
						cellW,
						cellH,
					)
				}
			}
		}

		// Реки — голубые пятна, чтобы их было видно и на миникарте.
		if (waterCells) {
			const setWater = typeof (waterCells as Set<string>).has === 'function'
				? (waterCells as ReadonlySet<string>)
				: new Set(waterCells as string[])

			ctx.fillStyle = '#4fb8dd'

			for (const key of setWater) {
				const [cx, cy] = key.split(',').map(Number)
				if (cx !== undefined && cy !== undefined) {
					ctx.fillRect(
						Math.round(cx * scaleX),
						Math.round(cy * scaleY),
						cellW,
						cellH,
					)
				}
			}
		}

		// Башни
		const towerArr = towers ?? []
		if (towerArr.length > 0) {
			for (const t of towerArr) {
				const cx = Math.round(t.x / CELL_SIZE)
				const cy = Math.round(t.y / CELL_SIZE)
				ctx.fillStyle = '#facc15'
				ctx.fillRect(
					Math.round(cx * scaleX),
					Math.round(cy * scaleY),
					Math.max(2, Math.ceil(scaleX * 0.8)),
					Math.max(2, Math.ceil(scaleY * 0.8)),
				)
				// Точка типа башни
				ctx.fillStyle = '#2a1d0a'
				ctx.fillRect(
					Math.round(cx * scaleX + scaleX * 0.3),
					Math.round(cy * scaleY + scaleY * 0.3),
					Math.max(1, Math.ceil(scaleX * 0.3)),
					Math.max(1, Math.ceil(scaleY * 0.3)),
				)
			}
		} else if (towerCells) {
			const arr = typeof (towerCells as Set<string>).has === 'function'
				? Array.from(towerCells as ReadonlySet<string>)
				: towerCells as string[]

			for (const key of arr) {
				const [cx, cy] = key.split(',').map(Number)
				if (cx !== undefined && cy !== undefined) {
					ctx.fillStyle = '#facc15'
					ctx.fillRect(
						Math.round(cx * scaleX),
						Math.round(cy * scaleY),
						Math.max(2, Math.ceil(scaleX * 0.8)),
						Math.max(2, Math.ceil(scaleY * 0.8)),
					)
				}
			}
		}

		// Враги поверх башен и дороги, чтобы их было видно в любой момент волны.
		if (enemies) {
			for (const enemy of enemies) {
				const ex = Math.round((enemy.x / CELL_SIZE) * scaleX)
				const ey = Math.round((enemy.y / CELL_SIZE) * scaleY)
				ctx.fillStyle = '#1a0505'
				ctx.fillRect(ex - 1, ey - 1, 5, 5)
				ctx.fillStyle = '#ef4444'
				ctx.fillRect(ex, ey, 3, 3)
			}
		}

		// Рамка
		ctx.strokeStyle = '#79502b'
		ctx.lineWidth = 1
		ctx.strokeRect(0.5, 0.5, size - 1, size - 1)
	}, [pathCells, waterCells, towerCells, towers, enemies, viewport])

	return (
		<div className="relative h-[77px] w-[77px] shrink-0 overflow-hidden border-2 border-[#3a2a1a] bg-[#0f0a05]/90 shadow-[0_4px_12px_rgba(0,0,0,0.6)] backdrop-blur-sm sm:h-[92px] sm:w-[92px]">
			<canvas
				ref={ref}
				className="w-full h-full block"
				aria-label="Миникарта уровня"
			/>
			{onNavigate ? (
				<button
					type="button"
					onClick={(event) => {
						const canvas = ref.current
						if (!canvas) return

						const rect = canvas.getBoundingClientRect()
						if (rect.width === 0 || rect.height === 0) return

						const ratioX = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
						const ratioY = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))

						onNavigate(ratioX * COLS * CELL_SIZE, ratioY * ROWS * CELL_SIZE)
					}}
					title="Перейти к точке на карте"
					aria-label="Перейти к точке на карте"
					className="absolute inset-0 cursor-crosshair focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
				/>
			) : null}
		</div>
	)
}
