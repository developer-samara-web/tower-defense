import type { MapDraft, SpawnerRoad } from '../engine/map/custom-map'

export type EditorTool =
	| 'castle'
	| 'spawner'
	| 'road'
	| 'river'
	| 'forest'
	| 'erase'

export type EditorCell = { x: number; y: number }

export type EditorState = {
	draft: MapDraft
	roads: SpawnerRoad[]
	tool: EditorTool
	// Тот же сид, что у карты в игре: лес выглядит одинаково.
	seed: number
}

// Мост между React-панелью и Phaser-сценой редактора.
export type EditorBridge = {
	state: EditorState
	onClick: (tool: EditorTool, cell: EditorCell) => void
	onStroke: (tool: EditorTool, cells: string[]) => void
	// Сцена подписывается сюда при создании.
	sync: () => void
}
