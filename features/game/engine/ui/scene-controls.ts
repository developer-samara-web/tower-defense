import type Phaser from 'phaser'

import type { TowerType } from '../../config/game.config'

// Действия, которые сцена предоставляет управлению Phaser.
export type SceneHandlers = {
	onPointerDown: (worldX: number, worldY: number) => void
	onPointerMove: (worldX: number, worldY: number) => void
	onPointerLeave: () => void
	onStartWave: () => void
	onSelectType: (type: TowerType | null) => void
	onUpgrade: () => void
	onRestart: () => void
}

// Подключает мышь и клавиатуру Phaser к действиям игры.
export function bindSceneControls(scene: Phaser.Scene, handlers: SceneHandlers) {
	// Клик левой кнопкой по полю строит башню или выбирает уже построенную.
	// Средняя и правая кнопки заняты камерой, поэтому их не обрабатываем.
	scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
		if (pointer.button !== 0) return

		handlers.onPointerDown(pointer.worldX, pointer.worldY)
	})

	// Движение курсора показывает проекцию выбранной башни.
	scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
		handlers.onPointerMove(pointer.worldX, pointer.worldY)
	})

	// Курсор ушёл за пределы полотна — прячем проекцию.
	scene.input.on('gameout', handlers.onPointerLeave)

	const keyboard = scene.input.keyboard

	// Пробел запускает первую волну, дальше волны идут сами.
	keyboard?.on('keydown-SPACE', handlers.onStartWave)

	// Клавиши 1–3 выбирают тип башни, 4 снимает выбор.
	keyboard?.on('keydown-ONE', () => handlers.onSelectType('ice'))
	keyboard?.on('keydown-TWO', () => handlers.onSelectType('fire'))
	keyboard?.on('keydown-THREE', () => handlers.onSelectType('earth'))
	keyboard?.on('keydown-FOUR', () => handlers.onSelectType(null))
	keyboard?.on('keydown-ESC', () => handlers.onSelectType(null))

	// R перезапускает игру после поражения, U улучшает выбранную башню.
	keyboard?.on('keydown-R', handlers.onRestart)
	keyboard?.on('keydown-U', handlers.onUpgrade)

	// Очищаем обработчики, когда сцена завершается или выгружается.
	scene.events.once('shutdown', () => {
		scene.input.removeAllListeners()
		scene.input.keyboard?.removeAllListeners()
	})
}
