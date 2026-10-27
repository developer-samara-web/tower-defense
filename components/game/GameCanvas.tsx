
'use client'

import { useEffect, useRef } from 'react'

export default function GameCanvas({ mapSeed = 'default' }: { mapSeed?: string }) {
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
				scene: [new MainScene(mapSeed)],
				// Правая кнопка перетаскивает камеру, поэтому
				// стандартное контекстное меню браузера отключаем.
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
				},
			})
		}

		void initialize()

		return () => {
			disposed = true
			game?.destroy(true)
		}
	}, [mapSeed])

	return (
		<div
			ref={containerRef}
			role="application"
			aria-label="Игровое поле Tower Defense"
			className="game-viewport relative h-full w-full overflow-hidden"
		/>
	)
}
