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
	let lastPointerX = 0
	let lastPointerY = 0

	// Для pinch-zoom: считаем указатели напрямую через менеджер ввода.
	let lastPinchDist = 0

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
		dragStartX = pointer.x
		dragStartY = pointer.y
	}

	const onPointerMove = (pointer: Phaser.Input.Pointer) => {
		// Pinch-zoom: считаем активные указатели через менеджер ввода.
		const managerPointers = scene.input.manager.pointers || []
		const activeCount = managerPointers.filter((p) => p.isDown).length

		if (activeCount === 2) {
			const active = managerPointers.filter((p) => p.isDown)
			const p0 = active[0]
			const p1 = active[1]
			if (!p0 || !p1) return

			const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y)

			if (lastPinchDist > 0 && Math.abs(dist - lastPinchDist) > 2) {
				const factor = Math.max(0.3, Math.min(2.5, dist / lastPinchDist))
				const newZoom = clampZoom(camera.zoom * factor)

				const cx = (p0.x + p1.x) / 2
				const cy = (p0.y + p1.y) / 2
				const originX = camera.width * camera.originX
				const originY = camera.height * camera.originY
				const worldX = (cx - originX) / camera.zoom + camera.scrollX + originX
				const worldY = (cy - originY) / camera.zoom + camera.scrollY + originY

				camera.setZoom(newZoom)
				camera.scrollX = worldX - originX - (cx - originX) / newZoom
				camera.scrollY = worldY - originY - (cy - originY) / newZoom
			}

			lastPinchDist = dist
			return
		} else {
			lastPinchDist = 0
		}

		if (!dragging && (dragStartX !== 0 || dragStartY !== 0)) {
			const dx = pointer.x - dragStartX
			const dy = pointer.y - dragStartY
			if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
				dragging = true
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

	const onPointerUp = () => {
		lastPinchDist = 0
		if (scene.input.manager.pointers.filter((p) => p.isDown).length === 0) {
			stopDragging()
		}
	}

	// Клик по миникарте переносит камеру в выбранную точку мира.
	const onFocusPoint = (event: Event) => {
		const detail = (event as CustomEvent<{ x?: number; y?: number }>).detail
		const x = detail?.x
		const y = detail?.y

		if (typeof x !== 'number' || typeof y !== 'number') return
		if (!Number.isFinite(x) || !Number.isFinite(y)) return

		camera.centerOn(x, y)
	}

	scene.input.on('pointerdown', onPointerDown)
	scene.input.on('pointermove', onPointerMove)
	scene.input.on('pointerup', onPointerUp)
	scene.input.on('pointerupoutside', onPointerUp)
	scene.input.on('wheel', onWheel)
	window.addEventListener('td:camera-focus', onFocusPoint)

	// Плавно двигает камеру, пока зажаты клавиши движения или мышь у края экрана.
	function update(delta: number) {
		let directionX = 0
		let directionY = 0

		if (cursors?.left.isDown || wasd?.A?.isDown) directionX -= 1
		if (cursors?.right.isDown || wasd?.D?.isDown) directionX += 1
		if (cursors?.up.isDown || wasd?.W?.isDown) directionY -= 1
		if (cursors?.down.isDown || wasd?.S?.isDown) directionY += 1

		// Управление камерой у краёв экрана как в Dota — мышь у границы прокручивает.
		// Отключено на мобильных (touch), где это конфликтует с перетаскиванием.
		const isTouchDevice = scene.sys?.game?.device?.input?.touch === true
		const pointer = scene.input.activePointer
		if (!isTouchDevice && pointer && pointer.x > 0 && pointer.y > 0 && pointer.x < scene.scale.width && pointer.y < scene.scale.height) {
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
		scene.input.off('pointerup', onPointerUp)
		scene.input.off('pointerupoutside', onPointerUp)
		scene.input.off('wheel', onWheel)
		window.removeEventListener('td:camera-focus', onFocusPoint)
		keyboard?.removeCapture(['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT'])
	}

	return { update, reset, destroy }
}
