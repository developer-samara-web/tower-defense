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
	// Клик отличается от перетаскивания камеры по смещению указателя.
	const CLICK_DISTANCE = 8
	let pressX = 0
	let pressY = 0
	let pressed = false

	// Строим и выбираем башню на отпускании кнопки: иначе перетаскивание
	// левой кнопкой ставило бы башню в точке начала жеста.
	scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
		const isLeftButton = pointer.button === 0
		pressed = isLeftButton
		if (!isLeftButton) return

		pressX = pointer.x
		pressY = pointer.y
	})

	scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
		if (!pressed) return
		pressed = false

		if (pointer.button !== 0) return
		if (Math.hypot(pointer.x - pressX, pointer.y - pressY) > CLICK_DISTANCE) return

		handlers.onPointerDown(pointer.worldX, pointer.worldY)
	})

	scene.input.on('pointerupoutside', () => {
		pressed = false
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
