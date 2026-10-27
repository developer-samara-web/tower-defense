import { useEffect, useRef } from 'react'

export default function MiniMap({
	pathCells,
	towerCells,
	towers,
}: {
	pathCells?: ReadonlySet<string>
	towerCells?: ReadonlySet<string> | string[]
	towers?: Array<{ id: string; x: number; y: number }>
}) {
	const ref = useRef<HTMLCanvasElement>(null)

	useEffect(() => {
		const canvas = ref.current
		if (!canvas) return
		const ctx = canvas.getContext('2d')
		if (!ctx) return

		const size = 128
		const cellPx = 1
		const cols = 125
		const rows = 125

		canvas.width = size
		canvas.height = size

		// Фон
		ctx.fillStyle = '#0f0a05'
		ctx.fillRect(0, 0, size, size)

		// Дорога
		if (pathCells) {
			ctx.fillStyle = '#8a7340'
			for (const key of pathCells) {
				const [cx, cy] = key.split(',').map(Number)
				if (cx !== undefined && cy !== undefined) {
					ctx.fillRect(cx * cellPx, cy * cellPx, cellPx, cellPx)
				}
			}
		}

		// Башни
		if (towers) {
			for (const t of towers) {
				const cx = Math.floor(t.x / 32)
				const cy = Math.floor(t.y / 32)
				ctx.fillStyle = '#facc15'
				ctx.fillRect(cx * cellPx, cy * cellPx, cellPx, cellPx)
			}
		} else if (towerCells) {
			// Запасной вариант по ключам клеток
			ctx.fillStyle = '#facc15'
			for (const key of towerCells) {
				const [cx, cy] = key.split(',').map(Number)
				if (cx !== undefined && cy !== undefined) {
					ctx.fillRect(cx * cellPx, cy * cellPx, cellPx, cellPx)
				}
			}
		}

		// Рамка
		ctx.strokeStyle = '#79502b'
		ctx.lineWidth = 1
		ctx.strokeRect(0, 0, size, size)
	}, [pathCells, towerCells, towers])

	return (
		<div className="absolute top-[70px] right-3 z-50 w-[128px] h-[128px] border-2 border-[#3a2a1a] bg-[#0f0a05]/90 shadow-[0_8px_24px_rgba(0,0,0,0.9)] rounded-none overflow-hidden backdrop-blur-sm">
			<p className="absolute top-0.5 left-1 text-[7px] font-black uppercase tracking-[0.14em] text-[#8a7340] select-none pointer-events-none">Карта</p>
			<canvas
				ref={ref}
				className="w-full h-full block"
				aria-label="Миникарта уровня"
			/>
		</div>
	)
}
