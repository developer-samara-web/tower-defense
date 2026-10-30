import type Phaser from 'phaser'

import { TOWER_ORDER, type TowerType } from '../../config/game.config'

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
	// Второй палец превращает жест в pinch-зум: строить башню по нему нельзя.
	let multiTouch = false

	// Строим и выбираем башню на отпускании кнопки: иначе перетаскивание
	// левой кнопкой ставило бы башню в точке начала жеста.
	scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
		const isLeftButton = pointer.button === 0
		if (pressed && isLeftButton) multiTouch = true
		pressed = isLeftButton
		if (!isLeftButton) return

		pressX = pointer.x
		pressY = pointer.y
	})

	scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
		const gesture = multiTouch
		const pointersDown = scene.input.manager.pointers.filter((p) => p.isDown).length
		if (pointersDown === 0) multiTouch = false

		if (!pressed) return
		pressed = false
		if (gesture) return

		if (pointer.button !== 0) return
		if (Math.hypot(pointer.x - pressX, pointer.y - pressY) > CLICK_DISTANCE) return

		handlers.onPointerDown(pointer.worldX, pointer.worldY)
	})

	scene.input.on('pointerupoutside', () => {
		pressed = false
		multiTouch = false
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

	// Клавиши 1–3 выбирают башню в том же порядке, что и панель
	// стройки (от дешёвой к дорогой), клавиша 4 снимает выбор.
	const TYPE_KEYS = ['keydown-ONE', 'keydown-TWO', 'keydown-THREE', 'keydown-FOUR']
	TYPE_KEYS.forEach((key, index) => {
		keyboard?.on(key, () => handlers.onSelectType(TOWER_ORDER[index] ?? null))
	})
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
