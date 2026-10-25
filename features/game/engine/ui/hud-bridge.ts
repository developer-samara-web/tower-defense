import { buildSnapshot, type GameState } from '../../domain/game-state'

export type HudBridge = {
	publish: () => void
	reset: () => void
}

// Передаёт снимок состояния игры в React-панель через браузерное событие.
export function createHudBridge(state: GameState): HudBridge {
	// Предыдущий снимок в виде строки, чтобы не отправлять одинаковые обновления.
	let lastSnapshot = ''

	function publish() {
		// Пропускаем обновление, если код выполняется вне браузера.
		if (typeof window === 'undefined') return

		const snapshot = buildSnapshot(state)

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
	}

	return { publish, reset }
}
