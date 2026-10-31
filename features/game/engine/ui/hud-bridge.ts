import type Phaser from 'phaser'

import { CELL_SIZE } from '../../config/game.config'
import { TOWER_FOOTPRINT } from '../../domain/game-rules'
import { buildSnapshot, type GameState } from '../../domain/game-state'

export type HudBridge = {
	publish: (force?: boolean) => void
	reset: () => void
}

// Высота панели башни в React-интерфейсе (px) и зазор от неё до башни.
// Строки характеристик зависят от карточек улучшения, поэтому высота
// усреднённая — она только центрирует панель относительно башни.
const PANEL_HEIGHT = 172
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

	// Ставит панель справа от границ выделения и по центру по вертикали.
	// Границы камеры не трогаем: панель привязана к башням, поэтому при
	// прокрутке уходит следом и может оказаться за краем экрана.
	function getPanelPosition() {
		const towers = state.selectedTowers
		if (towers.length === 0 || !scene) return null

		const camera = scene.cameras.main
		const zoom = camera.zoom
		// Панель привязана к площадке башни 2×2, а не к одной клетке.
		const half = CELL_SIZE * TOWER_FOOTPRINT / 2

		let right = Number.NEGATIVE_INFINITY
		let top = Number.POSITIVE_INFINITY
		let bottom = Number.NEGATIVE_INFINITY

		for (const tower of towers) {
			right = Math.max(right, tower.x + half)
			top = Math.min(top, tower.y - half)
			bottom = Math.max(bottom, tower.y + half)
		}

		return {
			x: (right - camera.worldView.x) * zoom + PANEL_GAP,
			y: ((top + bottom) / 2 - camera.worldView.y) * zoom - PANEL_HEIGHT / 2,
		}
	}

	function publish(force = false) {
		// Пропускаем обновление, если код выполняется вне браузера.
		if (typeof window === 'undefined') return

		const now = Date.now()
		if (!force && now - lastPublishedAt < PUBLISH_INTERVAL_MS) return
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
