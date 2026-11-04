
'use client'

import { useEffect, useRef } from 'react'

import type { MapDraft } from '@/features/game/engine/map/custom-map'

type Props = {
	mapSeed?: string
	// Черновик из редактора: если он есть, сид не используется.
	customDraft?: MapDraft | null
	// Сколько волн отбить до победы; 0 — забег без конца, как в обычной игре.
	waveLimit?: number
}

export default function GameCanvas({
	mapSeed = 'default',
	customDraft = null,
	waveLimit = 0,
}: Props) {
	const containerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const parent = containerRef.current

		if (!parent) {
			return
		}

		let game: import('phaser').Game | undefined
		let disposed = false

		const initialize = async () => {
			const PhaserModule = await import('phaser')
			const { MainScene } = await import(
				'@/features/game/engine/scenes/MainScene'
			)

			if (disposed) {
				return
			}

			game = new PhaserModule.default.Game({
				type: PhaserModule.default.AUTO,
				width: parent.clientWidth,
				height: parent.clientHeight,
				parent,
				scene: [new MainScene(mapSeed, customDraft, waveLimit)],
				// Правая кнопка перетаскивает камеру, а клик без смещения
				// ставит башню в очередь стройки, поэтому стандартное
				// контекстное меню браузера отключаем.
				disableContextMenu: true,
				input: {
					// Два пальца нужны для pinch-зума, третий — запас для мыши.
					activePointers: 3,
					// Touch включаем всегда: на гибридных устройствах детект
					// иногда ошибается, а лишние слушатели ничего не ломают.
					touch: { capture: true },
					mouse: {
						preventDefaultDown: true,
						preventDefaultUp: true,
						preventDefaultWheel: true,
					},
				},
				scale: {
					mode: PhaserModule.default.Scale.RESIZE,
					autoCenter: PhaserModule.default.Scale.CENTER_BOTH,
				},
				render: {
					transparent: true,
					antialias: true,
					roundPixels: true,
					// Тайлы земли из пака — 256 px, а на поле они весят по
					// 32 px. Без мипмапов GPU берёт один пиксель из восьми,
					// и двухпиксельная обводка кромки дороги рвётся в пунктир.
					mipmapFilter: 'LINEAR_MIPMAP_LINEAR',
				},
			})
		}

		void initialize()

		return () => {
			disposed = true
			game?.destroy(true)
		}
	}, [mapSeed, customDraft, waveLimit])

	return (
		<div
			ref={containerRef}
			role="application"
			aria-label="Игровое поле TowerForce"
			className="game-viewport relative h-full w-full overflow-hidden"
		/>
	)
}
