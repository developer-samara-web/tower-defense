import type Phaser from 'phaser'

import { TOWER_TYPES, type TowerType } from '../../config/game.config'
import type { UpgradeCard } from '../../domain/upgrade-cards'

// Действия, которые HTML-интерфейс может запросить у игры.
export type BrowserHandlers = {
	onSelectType: (type: TowerType) => void
	onStartWave: () => void
	onUpgrade: () => void
	onToggleAutoUpgrade: () => void
	onSetSpeed: (scale: number) => void
	onSell: () => void
	onDeselect: () => void
	onRestart: () => void
	onPickUpgrade: (card: UpgradeCard) => void
}

// Связывает события HTML-интерфейса с действиями игры.
export function connectBrowserControls(
	scene: Phaser.Scene,
	handlers: BrowserHandlers,
) {
	// Выбор типа башни приходит вместе с идентификатором в detail.
	const onSelectTower = (event: Event) => {
		const towerId = (event as CustomEvent<{ towerId?: TowerType }>).detail
			?.towerId

		// Проверяем, что идентификатор существует в справочнике башен.
		if (towerId && towerId in TOWER_TYPES) {
			handlers.onSelectType(towerId)
		}
	}

	// Карточка улучшения приходит вместе с её описанием в detail.
	const onPickUpgrade = (event: Event) => {
		const card = (event as CustomEvent<{ card?: UpgradeCard }>).detail?.card

		if (card) {
			handlers.onPickUpgrade(card)
		}
	}

	// Множитель игрового времени приходит числом в detail.
	const onSetSpeed = (event: Event) => {
		const scale = (event as CustomEvent<{ scale?: number }>).detail?.scale

		if (typeof scale === 'number' && Number.isFinite(scale) && scale > 0) {
			handlers.onSetSpeed(scale)
		}
	}

	window.addEventListener('td:select-tower', onSelectTower)
	window.addEventListener('td:start-wave', handlers.onStartWave)
	window.addEventListener('td:restart', handlers.onRestart)
	window.addEventListener('td:upgrade-tower', handlers.onUpgrade)
	window.addEventListener('td:auto-upgrade-tower', handlers.onToggleAutoUpgrade)
	window.addEventListener('td:game-speed', onSetSpeed)
	window.addEventListener('td:sell-tower', handlers.onSell)
	window.addEventListener('td:deselect-tower', handlers.onDeselect)
	window.addEventListener('td:pick-upgrade', onPickUpgrade)

	// Удаляем браузерные обработчики при завершении сцены,
	// чтобы избежать повторных вызовов после её перезапуска.
	scene.events.once('shutdown', () => {
		window.removeEventListener('td:select-tower', onSelectTower)
		window.removeEventListener('td:start-wave', handlers.onStartWave)
		window.removeEventListener('td:restart', handlers.onRestart)
		window.removeEventListener('td:upgrade-tower', handlers.onUpgrade)
		window.removeEventListener('td:auto-upgrade-tower', handlers.onToggleAutoUpgrade)
		window.removeEventListener('td:game-speed', onSetSpeed)
		window.removeEventListener('td:sell-tower', handlers.onSell)
		window.removeEventListener('td:deselect-tower', handlers.onDeselect)
		window.removeEventListener('td:pick-upgrade', onPickUpgrade)
	})
}
