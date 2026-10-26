import Phaser from 'phaser'

import {
	CAMERA_MAX_ZOOM,
	CAMERA_MIN_ZOOM,
	CAMERA_PAN_SPEED,
	CAMERA_START_ZOOM,
} from '../../config/game.config'

export type CameraController = {
	// Вызывается каждый кадр, чтобы двигать камеру с клавиатуры.
	update: (delta: number) => void
	// Возвращает камеру к замку после перезапуска игры.
	reset: () => void
	// Снимает обработчики при завершении сцены.
	destroy: () => void
}

type CameraTarget = { x: number; y: number }

// Подключает перемещение камеры: WASD/стрелки, перетаскивание
// средней или правой кнопкой мыши и зум колесом.
export function bindCameraControls(
	scene: Phaser.Scene,
	target: CameraTarget,
): CameraController {
	const camera = scene.cameras.main
	const keyboard = scene.input.keyboard

	// Курсоры и WASD опрашиваем каждый кадр, а не по событиям клавиш:
	// так движение остаётся плавным, пока клавиша зажата.
	const cursors = keyboard?.createCursorKeys()
	const wasd = keyboard?.addKeys('W,A,S,D') as
		| Record<string, Phaser.Input.Keyboard.Key>
		| undefined

	// Стрелки не должны прокручивать страницу под игрой.
	keyboard?.addCapture(['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT'])

	let dragging = false
	let dragStartX = 0
	let dragStartY = 0
	let dragMoved = false
	let lastPointerX = 0
	let lastPointerY = 0

	// Минимальный зум зависит от размера окна: нельзя отдалить карту
	// сильнее, чем позволяют её границы, иначе камера начнёт «дрожать».
	const minZoom = () => {
		const bounds = camera.getBounds()
		const fitZoom = Math.max(
			camera.width / bounds.width,
			camera.height / bounds.height,
		)

		return Math.max(
			CAMERA_MIN_ZOOM,
			Math.min(fitZoom, CAMERA_MAX_ZOOM),
		)
	}

	const clampZoom = (zoom: number) =>
		Phaser.Math.Clamp(zoom, minZoom(), CAMERA_MAX_ZOOM)

	// Начинаем перетаскивание при любом касании, но только если
	// произошло заметное перемещение (чтобы не блокировать постройку башен на мобильном).
	const DRAG_THRESHOLD = 6

	const onPointerDown = (pointer: Phaser.Input.Pointer) => {
		dragging = false
		dragMoved = false
		dragStartX = pointer.x
		dragStartY = pointer.y
	}

	const onPointerMove = (pointer: Phaser.Input.Pointer) => {
		if (!dragging && (dragStartX !== 0 || dragStartY !== 0)) {
			const dx = pointer.x - dragStartX
			const dy = pointer.y - dragStartY
			if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
				dragging = true
				dragMoved = true
				lastPointerX = pointer.x
				lastPointerY = pointer.y
			}
		}

		if (!dragging) return

		const deltaX = (pointer.x - lastPointerX) / camera.zoom
		const deltaY = (pointer.y - lastPointerY) / camera.zoom

		lastPointerX = pointer.x
		lastPointerY = pointer.y

		camera.scrollX -= deltaX
		camera.scrollY -= deltaY
	}

	const stopDragging = () => {
		dragging = false
		dragMoved = false
		dragStartX = 0
		dragStartY = 0
	}

	// Зум колесом вокруг курсора: точка под мышью остаётся на месте.
	const onWheel = (
		pointer: Phaser.Input.Pointer,
		_over: unknown,
		_deltaX: number,
		deltaY: number,
	) => {
		const originX = camera.width * camera.originX
		const originY = camera.height * camera.originY

		const worldX =
			(pointer.x - originX) / camera.zoom + camera.scrollX + originX
		const worldY =
			(pointer.y - originY) / camera.zoom + camera.scrollY + originY

		const factor = Math.exp(-deltaY * 0.0015)
		const zoom = clampZoom(camera.zoom * factor)

		camera.setZoom(zoom)
		camera.scrollX = worldX - originX - (pointer.x - originX) / zoom
		camera.scrollY = worldY - originY - (pointer.y - originY) / zoom
	}

	scene.input.on('pointerdown', onPointerDown)
	scene.input.on('pointermove', onPointerMove)
	scene.input.on('pointerup', stopDragging)
	scene.input.on('pointerupoutside', stopDragging)
	scene.input.on('wheel', onWheel)

	// Плавно двигает камеру, пока зажаты клавиши движения или мышь у края экрана.
	function update(delta: number) {
		let directionX = 0
		let directionY = 0

		if (cursors?.left.isDown || wasd?.A?.isDown) directionX -= 1
		if (cursors?.right.isDown || wasd?.D?.isDown) directionX += 1
		if (cursors?.up.isDown || wasd?.W?.isDown) directionY -= 1
		if (cursors?.down.isDown || wasd?.S?.isDown) directionY += 1

		// Управление камерой у краёв экрана как в Dota — мышь у границы прокручивает.
		const pointer = scene.input.activePointer
		if (pointer && pointer.x > 0 && pointer.y > 0 && pointer.x < scene.scale.width && pointer.y < scene.scale.height) {
			const edgeMargin = 40
			if (pointer.x < edgeMargin) directionX -= 1
			if (pointer.x > scene.scale.width - edgeMargin) directionX += 1
			if (pointer.y < edgeMargin) directionY -= 1
			if (pointer.y > scene.scale.height - edgeMargin) directionY += 1
		}

		if (directionX === 0 && directionY === 0) return

		// Диагональ не должна быть быстрее прямого движения.
		const length = Math.hypot(directionX, directionY)
		const step =
			(CAMERA_PAN_SPEED * delta) / 1000 / camera.zoom / length

		camera.scrollX += directionX * step
		camera.scrollY += directionY * step
	}

	function reset() {
		camera.setZoom(CAMERA_START_ZOOM)
		camera.centerOn(target.x, target.y)
	}

	function destroy() {
		scene.input.off('pointerdown', onPointerDown)
		scene.input.off('pointermove', onPointerMove)
		scene.input.off('pointerup', stopDragging)
		scene.input.off('pointerupoutside', stopDragging)
		scene.input.off('wheel', onWheel)
		keyboard?.removeCapture(['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT'])
	}

	return { update, reset, destroy }
}
