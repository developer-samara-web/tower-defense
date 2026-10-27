import type Phaser from 'phaser'

import type { GameState } from '../domain/game-state'
import type { GameMap } from './map/game-map'

// Всё, что нужно системам для работы со сценой и общим состоянием.
export type GameContext = {
	scene: Phaser.Scene
	state: GameState
	map: GameMap
	setStatus: (status: string) => void
	publish: () => void
}
