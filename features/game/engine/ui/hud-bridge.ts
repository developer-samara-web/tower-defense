import type Phaser from 'phaser'

import { CELL_SIZE } from '../../config/game.config'
import { buildSnapshot, type GameState } from '../../domain/game-state'

export type HudBridge = {
	publish: () => void
	reset: () => void
}

// Размеры панели башни в React-интерфейсе (px).
const PANEL_WIDTH = 232
const PANEL_HEIGHT = 204
const PANEL_MARGIN = 8
const PANEL_GAP = 10

// Сцена зовёт publish каждый кадр, а React не нужен такой поток:
// 10 обновлений в секунду достаточно для HUD и миникарты.
const PUBLISH_INTERVAL_MS = 100

// Передаёт снимок состояния игры в React-панель через браузерное событие.
export function createHudBridge(
	state: GameState,
	scene?: Phaser.Scene,
): HudBridge {
	// Предыдущий снимок в виде строки, чтобы не отправлять одинаковые обновления.
	let lastSnapshot = ''
	let lastPublishedAt = 0

	// Переводит позицию выбранной башни в координаты полотна и
	// подбирает место для панели рядом с ней.
	function getPanelPosition() {
		const tower = state.selectedBuiltTower
		if (!tower || !scene) return null

		const camera = scene.cameras.main
		const zoom = camera.zoom
		const screenX = (tower.x - camera.worldView.x) * zoom
		const screenY = (tower.y - camera.worldView.y) * zoom
		const halfCell = (CELL_SIZE / 2) * zoom

		// Обычно панель справа от башни, но у правого края — слева.
		let x = screenX + halfCell + PANEL_GAP
		if (x + PANEL_WIDTH > camera.width - PANEL_MARGIN) {
			x = screenX - halfCell - PANEL_GAP - PANEL_WIDTH
		}

		const maxX = Math.max(
			PANEL_MARGIN,
			camera.width - PANEL_WIDTH - PANEL_MARGIN,
		)
		const maxY = Math.max(
			PANEL_MARGIN,
			camera.height - PANEL_HEIGHT - PANEL_MARGIN,
		)

		return {
			x: Math.min(Math.max(PANEL_MARGIN, x), maxX),
			y: Math.min(Math.max(PANEL_MARGIN, screenY - PANEL_HEIGHT / 2), maxY),
		}
	}

	function publish() {
		// Пропускаем обновление, если код выполняется вне браузера.
		if (typeof window === 'undefined') return

		const now = Date.now()
		if (now - lastPublishedAt < PUBLISH_INTERVAL_MS) return
		lastPublishedAt = now

		const snapshot = buildSnapshot(state, getPanelPosition())

		// Вычисляем область просмотра камеры для миникарты.
		if (scene) {
			const camera = scene.cameras.main
			;(snapshot as { viewport?: { worldX: number; worldY: number; width: number; height: number; zoom: number } }).viewport = {
				worldX: camera.worldView.x,
				worldY: camera.worldView.y,
				width: camera.worldView.width,
				height: camera.worldView.height,
				zoom: camera.zoom,
			}
		}

		// Преобразуем состояние в строку для сравнения с предыдущим.
		const serialized = JSON.stringify(snapshot)

		// Не отправляем повторное событие, если состояние не изменилось.
		if (serialized === lastSnapshot) return

		lastSnapshot = serialized

		// Отправляем событие, которое обрабатывает React-компонент.
		window.dispatchEvent(new CustomEvent('td:state', { detail: snapshot }))
	}

	// Сбрасывает кеш, чтобы после перезапуска ушло новое состояние.
	function reset() {
		lastSnapshot = ''
		lastPublishedAt = 0
	}

	return { publish, reset }
}
