import type Phaser from 'phaser'

import { CELL_SIZE } from '../../config/game.config'
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

	// Ставит панель напротив башни в координатах полотна. Границы камеры не
	// трогаем: панель привязана к башне, поэтому при прокрутке уходит следом
	// и может оказаться за краем экрана.
	function getPanelPosition() {
		const tower = state.selectedBuiltTower
		if (!tower || !scene) return null

		const camera = scene.cameras.main
		const zoom = camera.zoom
		const screenX = (tower.x - camera.worldView.x) * zoom
		const screenY = (tower.y - camera.worldView.y) * zoom
		const halfCell = (CELL_SIZE / 2) * zoom

		return {
			x: screenX + halfCell + PANEL_GAP,
			y: screenY - PANEL_HEIGHT / 2,
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
