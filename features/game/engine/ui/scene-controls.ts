import type Phaser from 'phaser'

import type { TowerType } from '../../config/game.config'

// Действия, которые сцена предоставляет управлению Phaser.
export type SceneHandlers = {
	onPointerDown: (worldX: number, worldY: number) => void
	onStartWave: () => void
	onSelectType: (type: TowerType) => void
	onUpgrade: () => void
	onRestart: () => void
}

// Подключает мышь и клавиатуру Phaser к действиям игры.
export function bindSceneControls(scene: Phaser.Scene, handlers: SceneHandlers) {
	// Клик по полю строит башню или выбирает уже построенную.
	scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
		handlers.onPointerDown(pointer.worldX, pointer.worldY)
	})

	const keyboard = scene.input.keyboard

	// Пробел запускает первую волну, дальше волны идут сами.
	keyboard?.on('keydown-SPACE', handlers.onStartWave)

	// Клавиши 1–4 выбирают тип башни.
	keyboard?.on('keydown-ONE', () => handlers.onSelectType('ice'))
	keyboard?.on('keydown-TWO', () => handlers.onSelectType('fire'))
	keyboard?.on('keydown-THREE', () => handlers.onSelectType('earth'))
	keyboard?.on('keydown-FOUR', () => handlers.onSelectType('ice'))

	// R перезапускает игру после поражения, U улучшает выбранную башню.
	keyboard?.on('keydown-R', handlers.onRestart)
	keyboard?.on('keydown-U', handlers.onUpgrade)

	// Очищаем обработчики, когда сцена завершается или выгружается.
	scene.events.once('shutdown', () => {
		scene.input.removeAllListeners()
		scene.input.keyboard?.removeAllListeners()
	})
}
