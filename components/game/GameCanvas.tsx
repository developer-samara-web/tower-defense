
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
			className="relative h-full w-full overflow-hidden"
		/>
	)
}
