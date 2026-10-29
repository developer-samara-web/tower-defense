'use client'

import { useEffect, useRef } from 'react'

import type { EditorTool } from '@/features/game/editor/types'
import type { MapDraft, SpawnerRoad } from '@/features/game/engine/map/custom-map'

type Props = {
	draft: MapDraft
	roads: SpawnerRoad[]
	tool: EditorTool
	seed: number
	onClick: (tool: EditorTool, cell: { x: number; y: number }) => void
	onStroke: (tool: EditorTool, cells: string[]) => void
}

export default function MapEditorCanvas({
	draft,
	roads,
	tool,
	seed,
	onClick,
	onStroke,
}: Props) {
	const containerRef = useRef<HTMLDivElement>(null)
	const bridgeRef = useRef({
		state: { draft, roads, tool, seed },
		onClick,
		onStroke,
		sync: () => {},
	})

	// Мост обновляем после рендера: сцена читает его из ref.
	useEffect(() => {
		bridgeRef.current.onClick = onClick
		bridgeRef.current.onStroke = onStroke
	}, [onClick, onStroke])

	useEffect(() => {
		bridgeRef.current.state = { draft, roads, tool, seed }
		bridgeRef.current.sync()
	}, [draft, roads, tool, seed])

	useEffect(() => {
		const parent = containerRef.current
		if (!parent) return

		let game: import('phaser').Game | undefined
		let disposed = false

		const initialize = async () => {
			const PhaserModule = await import('phaser')
			const { MapEditorScene } = await import(
				'@/features/game/editor/map-editor-scene'
			)

			if (disposed) return

			game = new PhaserModule.default.Game({
				type: PhaserModule.default.AUTO,
				width: parent.clientWidth,
				height: parent.clientHeight,
				parent,
				scene: [new MapEditorScene(bridgeRef.current)],
				disableContextMenu: true,
				input: {
					activePointers: 3,
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
	}, [])

	return (
		<div
			ref={containerRef}
			role="application"
			aria-label="Редактор карты"
			className="relative h-full w-full overflow-hidden"
		/>
	)
}
