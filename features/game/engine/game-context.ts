import type Phaser from 'phaser'

import type { GameState } from '../domain/game-state'

// Всё, что нужно системам для работы со сценой и общим состоянием.
export type GameContext = {
	scene: Phaser.Scene
	state: GameState
	setStatus: (status: string) => void
	publish: () => void
}
