import { useEffect, useRef } from 'react'

export default function MiniMap({
	pathCells,
	towerCells,
	towers,
	viewport,
}: {
	pathCells?: ReadonlySet<string> | string[]
	towerCells?: ReadonlySet<string> | string[]
	towers?: Array<{ id: string; x: number; y: number }>
	viewport?: { worldX: number; worldY: number; width: number; height: number; zoom: number }
}) {
	const ref = useRef<HTMLCanvasElement>(null)

	useEffect(() => {
		const canvas = ref.current
		if (!canvas) return
		const ctx = canvas.getContext('2d')
		if (!ctx) return

		const size = 128
		const cols = 125
		const rows = 125
		const scale = size / Math.max(cols, rows)

		canvas.width = size
		canvas.height = size

		// Тёмный фон поля
		ctx.fillStyle = '#1a1508'
		ctx.fillRect(0, 0, size, size)

		// Тонкая сетка для ориентировки
		ctx.strokeStyle = '#2a1d0a'
		ctx.lineWidth = 0.5
		for (let i = 0; i <= cols; i += 25) {
			const px = i * scale
			ctx.beginPath()
			ctx.moveTo(px, 0)
			ctx.lineTo(px, size)
			ctx.stroke()
		}
		for (let i = 0; i <= rows; i += 25) {
			const py = i * scale
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
			(cxCenter - 1) * scale,
			(cyCenter - 1) * scale,
			3 * scale,
			3 * scale,
		)

		// Область просмотра (камера)
		if (viewport) {
			ctx.strokeStyle = '#eab308'
			ctx.lineWidth = 1.5
			ctx.setLineDash([3, 2])
			const vx = viewport.worldX / 32 * scale
			const vy = viewport.worldY / 32 * scale
			const vw = (viewport.width / viewport.zoom) / 32 * scale
			const vh = (viewport.height / viewport.zoom) / 32 * scale
			ctx.strokeRect(Math.round(vx), Math.round(vy), Math.round(vw), Math.round(vh))
			ctx.setLineDash([])
		}

		// Дорога
		if (pathCells) {
			ctx.fillStyle = '#c99b3b'
			const setPath = typeof (pathCells as any).has === 'function'
				? (pathCells as ReadonlySet<string>)
				: new Set(pathCells as string[])

			for (const key of setPath) {
				const [cx, cy] = key.split(',').map(Number)
				if (cx !== undefined && cy !== undefined) {
					ctx.fillRect(
						Math.round(cx * scale),
						Math.round(cy * scale),
						Math.max(1, Math.ceil(scale)),
						Math.max(1, Math.ceil(scale)),
					)
				}
			}
		}

		// Башни
		const towerArr = towers ?? []
		if (towerArr.length > 0) {
			for (const t of towerArr) {
				const cx = Math.round(t.x / 32)
				const cy = Math.round(t.y / 32)
				ctx.fillStyle = '#facc15'
				ctx.fillRect(
					Math.round(cx * scale),
					Math.round(cy * scale),
					Math.max(2, Math.ceil(scale * 0.8)),
					Math.max(2, Math.ceil(scale * 0.8)),
				)
				// Точка типа башни
				ctx.fillStyle = '#2a1d0a'
				ctx.fillRect(
					Math.round(cx * scale + scale * 0.3),
					Math.round(cy * scale + scale * 0.3),
					Math.max(1, Math.ceil(scale * 0.3)),
					Math.max(1, Math.ceil(scale * 0.3)),
				)
			}
		} else if (towerCells) {
			const arr = typeof (towerCells as any).has === 'function'
				? Array.from(towerCells as ReadonlySet<string>)
				: towerCells as string[]

			for (const key of arr) {
				const [cx, cy] = key.split(',').map(Number)
				if (cx !== undefined && cy !== undefined) {
					ctx.fillStyle = '#facc15'
					ctx.fillRect(
						Math.round(cx * scale),
						Math.round(cy * scale),
						Math.max(2, Math.ceil(scale * 0.8)),
						Math.max(2, Math.ceil(scale * 0.8)),
					)
				}
			}
		}

		// Рамка
		ctx.strokeStyle = '#79502b'
		ctx.lineWidth = 1
		ctx.strokeRect(0.5, 0.5, size - 1, size - 1)
	}, [pathCells, towerCells, towers])

	return (
		<div className="absolute top-[70px] right-3 z-50 w-[128px] h-[128px] border-2 border-[#3a2a1a] bg-[#0f0a05]/90 shadow-[0_8px_24px_rgba(0,0,0,0.9)] rounded-none overflow-hidden backdrop-blur-sm">
			<p className="absolute top-0.5 left-1 text-[7px] font-black uppercase tracking-[0.14em] text-[#8a7340] select-none pointer-events-none">
				Карта
			</p>
			<canvas
				ref={ref}
				className="w-full h-full block"
				aria-label="Миникарта уровня"
			/>
		</div>
	)
}
