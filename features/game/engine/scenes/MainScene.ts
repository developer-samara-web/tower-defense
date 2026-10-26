
import Phaser from 'phaser'

import {
	CAMERA_BOUNDS_MARGIN,
	CAMERA_MAX_ZOOM,
	CAMERA_MIN_ZOOM,
	CAMERA_START_ZOOM,
} from '@/features/game/config/game.config'
import { createGameState, resetGameState, type GameState } from '@/features/game/domain/game-state'
import { applyUpgradeCard, upgradeCardTitle } from '@/features/game/domain/upgrade-cards'

import { drawBoard } from '../board/board-renderer'
import type { GameContext } from '../game-context'
import {
	BOARD_PIXEL_HEIGHT,
	BOARD_PIXEL_WIDTH,
	CENTER_POINT,
} from '../map/game-map'
import { createEnemySystem, type EnemySystem } from '../systems/enemy-system'
import { createTowerSystem, type TowerSystem } from '../systems/tower-system'
import { createWaveSystem, type WaveSystem } from '../systems/wave-system'
import { connectBrowserControls } from '../ui/browser-controls'
import {
	bindCameraControls,
	type CameraController,
} from '../ui/camera-controls'
import { createHudBridge, type HudBridge } from '../ui/hud-bridge'
import { bindSceneControls } from '../ui/scene-controls'

// Сцена только собирает системы вместе и связывает их с вводом игрока.
export class MainScene extends Phaser.Scene {
	// Единое изменяемое состояние игры.
	private state!: GameState

	// Мост, который отправляет состояние в React-панель.
	private hud!: HudBridge

	// Контекст, который получают все системы.
	private context!: GameContext

	private enemies!: EnemySystem
	private towers!: TowerSystem
	private waves!: WaveSystem
	private cameraControls!: CameraController

	constructor() {
		super('MainScene')
	}

	preload() {
		this.load.image('tower-ice', '/game/towers/ice.png')
		this.load.image('tower-fire', '/game/towers/fire.png')
		this.load.image('tower-earth', '/game/towers/earth.png')
		this.load.image('castle', '/game/path/castle.png')
		this.load.image('logo', '/game/logo.png')

		this.load.image('gate-bottom', '/game/path/gate-bottom.png')
		this.load.image('gate-left', '/game/path/gate-left.png')
		this.load.image('gate-right', '/game/path/gate-right.png')
		this.load.image('gate-top', '/game/path/gate-top.png')
	}

	// Вызывается Phaser при создании сцены.
	create() {
		// Готовим состояние и рисуем поле. Карта возвращает занятые дорогой клетки.
		this.state = createGameState()

		// Фон за пределами поля рисует CSS-слой с картинкой леса,
		// поэтому камера остаётся прозрачной.
		this.setupCamera()
		this.cameraControls = bindCameraControls(this, CENTER_POINT)
		this.scale.on('resize', this.handleResize)

		this.state.pathCells = drawBoard(this)

		// Создаём мост состояния и общий контекст для систем.
		this.hud = createHudBridge(this.state)
		this.context = {
			scene: this,
			state: this.state,
			setStatus: (status) => {
				this.state.status = status
			},
			publish: () => this.hud.publish(),
		}

		// Создаём системы в порядке зависимостей.
		this.enemies = createEnemySystem(this.context, {
			onGameOver: () => this.handleGameOver(),
		})
		this.towers = createTowerSystem(this.context, this.enemies)
		this.waves = createWaveSystem(this.context)

		// Подключаем управление с клавиатуры, мыши и из React-панели.
		this.bindControls()
		this.connectPanel()

		// Отправляем первоначальное состояние в интерфейс.
		this.hud.publish()

		// Убираем обработчики при завершении сцены.
		this.events.once('shutdown', () => {
			this.scale.off('resize', this.handleResize)
			this.cameraControls.destroy()
		})
	}

	// Готовит камеру к путешествию по большому миру.
	private setupCamera() {
		const camera = this.cameras.main

		camera.setBackgroundColor('rgba(10,15,8,1)')

		// Границы строго по игровому полю — без лесного фона с краёв.
		camera.setBounds(
			0,
			0,
			BOARD_PIXEL_WIDTH,
			BOARD_PIXEL_HEIGHT,
		)

		camera.setZoom(CAMERA_START_ZOOM)
		camera.centerOn(CENTER_POINT.x, CENTER_POINT.y)
	}

	// При изменении размера окна не сбрасываем позицию игрока,
	// а только не даём отдалить камеру сильнее границ мира.
	private handleResize = () => {
		const camera = this.cameras.main
		const bounds = camera.getBounds()
		const fitZoom = Math.max(
			camera.width / bounds.width,
			camera.height / bounds.height,
		)
		const minZoom = Math.max(
			CAMERA_MIN_ZOOM,
			Math.min(fitZoom, CAMERA_MAX_ZOOM),
		)

		if (camera.zoom < minZoom) {
			camera.setZoom(minZoom)
		}
	}

	// Основной игровой цикл Phaser. Вызывается каждый кадр.
	update(_time: number, delta: number) {
		this.cameraControls.update(delta)
		this.waves.update(delta)
		this.enemies.updateSpawning(delta)
		this.enemies.update(delta)
		this.towers.update(delta)
		this.waves.checkComplete()
		this.hud.publish()
	}

	// Подключает мышь и клавиатуру Phaser.
	private bindControls() {
		bindSceneControls(this, {
			onPointerDown: (worldX, worldY) => this.towers.place(worldX, worldY),
			onStartWave: () => this.waves.requestStart(),
			onSelectType: (type) => this.towers.selectType(type),
			onUpgrade: () => this.towers.upgrade(),
			onRestart: () => {
				if (this.state.lives <= 0) this.restartGame()
			},
		})
	}

	// Подключает кнопки React-панели.
	private connectPanel() {
		connectBrowserControls(this, {
			onSelectType: (type) => this.towers.selectType(type),
			onStartWave: () => this.waves.requestStart(),
			onUpgrade: () => this.towers.upgrade(),
			onDeselect: () => {
				this.towers.deselect()
				this.hud.publish()
			},
			onRestart: () => this.restartGame(),
			onPickUpgrade: (card) => {
				// Постоянно усиливаем выбранный тип башни.
				this.state.buffs = applyUpgradeCard(this.state.buffs, card)
				this.context.setStatus(`${upgradeCardTitle(card)} — ${card.description}.`)
				this.hud.publish()
			},
		})
	}

	// Возвращает игру в начальное состояние, не пересоздавая сцену.
	private restartGame() {
		this.enemies.clear()
		this.towers.clear()
		resetGameState(this.state)
		this.cameraControls.reset()
		this.hud.reset()
		this.hud.publish()
	}

	// Завершает игру, когда у игрока закончились жизни.
	private handleGameOver() {
		const { state } = this

		// Прекращаем появление врагов и останавливаем волну.
		state.spawnRemaining = 0
		state.waveActive = false
		state.waveBreakRemaining = 0

		this.context.setStatus(
			`Игра окончена. Ты продержался до волны ${state.wave}.`,
		)

		// Отправляем событие завершения игры только один раз.
		if (state.resultReported) return
		state.resultReported = true

		window.dispatchEvent(
			new CustomEvent('td:game-over', {
				detail: { wave: state.wave, gold: state.gold },
			}),
		)

		this.hud.publish()
	}
}
