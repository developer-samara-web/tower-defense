import type Phaser from 'phaser'

import { TOWER_ORDER, type TowerType } from '../../config/game.config'
import type { SelectionBox } from '../../types/game.types'

// Действия, которые сцена предоставляет управлению Phaser.
export type SceneHandlers = {
	// additive — зажата клавиша множительного выделения (Ctrl/Cmd/Shift).
	onPointerDown: (worldX: number, worldY: number, additive: boolean) => void
	onPointerMove: (worldX: number, worldY: number) => void
	onPointerLeave: () => void
	// Рамка выделения: показываем во время протяжки, null — спрятать.
	onSelectionBox: (box: SelectionBox | null) => void
	onSelectionCommit: (box: SelectionBox, additive: boolean) => void
	onStartWave: () => void
	onSelectType: (type: TowerType | null) => void
	onUpgrade: () => void
	onRestart: () => void
}

// Подключает мышь и клавиатуру Phaser к действиям игры.
export function bindSceneControls(scene: Phaser.Scene, handlers: SceneHandlers) {
	// Клик отличается от перетаскивания по смещению указателя.
	const CLICK_DISTANCE = 8
	let pressX = 0
	let pressY = 0
	// Стартовые мировые координаты жеста: от них считаем рамку выделения.
	let pressWorldX = 0
	let pressWorldY = 0
	let pressed = false
	// Мышь уже ушла за порог клика — жест стал рамкой выделения.
	let boxing = false
	// Второй палец превращает жест в pinch-зум: строить башню по нему нельзя.
	let multiTouch = false

	// Клавиша множительного выделения, как в Warcraft 3.
	function isAdditive(pointer: Phaser.Input.Pointer) {
		const event = pointer.event as MouseEvent | undefined
		return Boolean(event?.ctrlKey || event?.metaKey || event?.shiftKey)
	}

	function boxOf(pointer: Phaser.Input.Pointer): SelectionBox {
		return {
			x1: pressWorldX,
			y1: pressWorldY,
			x2: pointer.worldX,
			y2: pointer.worldY,
		}
	}

	// Строим и выбираем башню на отпускании кнопки: иначе перетаскивание
	// левой кнопкой ставило бы башню в точке начала жеста.
	scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
		const isLeftButton = pointer.button === 0
		if (pressed && isLeftButton) multiTouch = true
		pressed = isLeftButton
		boxing = false
		if (!isLeftButton) return

		pressX = pointer.x
		pressY = pointer.y
		pressWorldX = pointer.worldX
		pressWorldY = pointer.worldY
	})

	scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
		const gesture = multiTouch
		const pointersDown = scene.input.manager.pointers.filter((p) => p.isDown).length
		if (pointersDown === 0) multiTouch = false

		if (!pressed) return
		pressed = false

		const wasBoxing = boxing
		boxing = false

		if (gesture) {
			handlers.onSelectionBox(null)
			return
		}

		// Отпустили рамку — выделяем башни под ней.
		if (wasBoxing) {
			handlers.onSelectionCommit(boxOf(pointer), isAdditive(pointer))
			return
		}

		if (pointer.button !== 0) return
		if (Math.hypot(pointer.x - pressX, pointer.y - pressY) > CLICK_DISTANCE) return

		handlers.onPointerDown(pointer.worldX, pointer.worldY, isAdditive(pointer))
	})

	// Кнопку отпустили над интерфейсом: рамка всё равно считается собранной.
	// Движения мыши над панелью к игре не доходят, поэтому жест узнаём по
	// смещению указателя, а не по флагу рамки.
	scene.input.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => {
		const wasBoxing = boxing
		const dragged =
			pressed &&
			pointer.button === 0 &&
			Math.hypot(pointer.x - pressX, pointer.y - pressY) > CLICK_DISTANCE

		pressed = false
		multiTouch = false
		boxing = false

		if (wasBoxing || dragged) handlers.onSelectionCommit(boxOf(pointer), isAdditive(pointer))
		else handlers.onSelectionBox(null)
	})

	// Движение курсора показывает проекцию выбранной башни и рамку выделения.
	scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
		handlers.onPointerMove(pointer.worldX, pointer.worldY)

		if (!pressed || multiTouch || pointer.wasTouch) return
		if (Math.hypot(pointer.x - pressX, pointer.y - pressY) <= CLICK_DISTANCE) return

		boxing = true
		handlers.onSelectionBox(boxOf(pointer))
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

	// R перезапускает игру после поражения, U улучшает выбранные башни.
	keyboard?.on('keydown-R', handlers.onRestart)
	keyboard?.on('keydown-U', handlers.onUpgrade)

	// Очищаем обработчики, когда сцена завершается или выгружается.
	scene.events.once('shutdown', () => {
		scene.input.removeAllListeners()
		scene.input.keyboard?.removeAllListeners()
	})
}
