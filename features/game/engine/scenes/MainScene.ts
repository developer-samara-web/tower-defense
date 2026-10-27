import Phaser from 'phaser'

import {
	CAMERA_MAX_ZOOM,
	CAMERA_MIN_ZOOM,
} from '@/features/game/config/game.config'
import {
	createGameState,
	resetGameState,
	type GameState,
} from '@/features/game/domain/game-state'
import { isBoardPosition } from '@/features/game/domain/game-rules'
import {
	isTowerType,
	readSessionEnemies,
	readSessionTower,
	restoreBuffs,
	restoreProgress,
	restoreStats,
	type SessionPayload,
} from '@/features/game/domain/session-state'
import {
	applyUpgradeCard,
	upgradeCardTitle,
} from '@/features/game/domain/upgrade-cards'

import { drawBoard } from '../board/board-renderer'
import { createTowerView } from '../rendering/tower-view'
import type { GameContext } from '../game-context'
import {
	BOARD_PIXEL_HEIGHT,
	BOARD_PIXEL_WIDTH,
	CENTER_POINT,
	createGameMap,
	mapSeedToNumber,
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

type SessionWindow = Window & { __sessionData?: SessionPayload }

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

	// Seed определяет дороги, поэтому карта восстанавливается вместе с игрой.
	private readonly mapSeed: string

	// Пауза может прийти до первого кадра, когда сцена ещё не активна.
	private pauseRequested = false

	constructor(mapSeed = 'default') {
		super('MainScene')
		this.mapSeed = mapSeed
	}

	preload() {
		this.load.image('tower-ice', '/game/towers/ice.png')
		this.load.image('tower-fire', '/game/towers/fire.png')
		this.load.image('tower-earth', '/game/towers/earth.png')
		this.load.image('castle', '/game/path/castle.png')
		this.load.image('logo', '/game/logo.png')

		this.load.image('enemy-small', '/game/enemy/small.png')
		this.load.image('enemy-average', '/game/enemy/average.png')
		this.load.image('enemy-big', '/game/enemy/big.png')
		this.load.image('enemy-boss', '/game/enemy/boss.png')

		this.load.image('gate-bottom', '/game/path/gate-bottom.png')
		this.load.image('gate-left', '/game/path/gate-left.png')
		this.load.image('gate-right', '/game/path/gate-right.png')
		this.load.image('gate-top', '/game/path/gate-top.png')

		// Квадратные пропсы для живой карты.
		;[
			'tree-1', 'tree-2', 'tree-3',
			'stone-1', 'stone-2', 'stone-3',
			'bush-1', 'bush-2', 'bush-3',
			'grass-1', 'grass-2',
			'grass_flowers-1', 'grass_flowers-2', 'grass_flowers-3', 'grass_flowers-4',
			'road-1', 'road-2', 'road-3', 'road-main',
			'shore-side-top', 'shore-side-right', 'shore-side-left', 'shore-side-bottom',
			'shore-right-top', 'shore-right-bottom', 'shore-left-top', 'shore-left-bottom',
			'bridge-1',
		].forEach((key) => this.load.image(key, `/game/grid/${key}.png`))
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

		const map = createGameMap(this.mapSeed)
		this.state.pathCells = drawBoard(
			this,
			map,
			mapSeedToNumber(this.mapSeed),
		)

		// Создаём мост состояния и общий контекст для систем.
		this.hud = createHudBridge(this.state, this)
		this.context = {
			scene: this,
			state: this.state,
			map,
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

		// Загружаем сохранённую сессию, если она была передана из React.
		this.restoreSession()

		// Подключаем управление с клавиатуры, мыши и из React-панели.
		this.bindControls()
		this.connectPanel()
		this.bindPauseControls()

		// Отправляем первоначальное состояние в интерфейс.
		this.hud.publish()

		// Убираем обработчики при завершении сцены.
		this.events.once('shutdown', () => {
			this.scale.off('resize', this.handleResize)
			this.cameraControls.destroy()
		})
	}

	// Восстанавливает сохранённую игру поверх свежей сцены.
	private restoreSession() {
		if (typeof window === 'undefined') return

		const sessionWindow = window as SessionWindow
		const payload = sessionWindow.__sessionData
		if (!payload?.gameState) return

		const saved = payload.gameState
		const { state } = this

		state.wave = nonNegativeInt(saved.wave, 0)
		state.gold = nonNegativeNumber(saved.gold, state.gold)
		state.lives = nonNegativeNumber(saved.lives, state.lives)
		state.waveActive = saved.waveActive === true
		state.waveBreakRemaining = nonNegativeNumber(
			saved.waveBreakRemaining,
			nonNegativeNumber(saved.nextWaveIn, 0) * 1000,
		)
		state.spawnRemaining = nonNegativeInt(saved.spawnRemaining, 0)
		state.spawnedInWave = nonNegativeInt(saved.spawnedInWave, 0)
		state.spawnCooldown = nonNegativeNumber(saved.spawnCooldown, 0)
		state.selectedTower = isTowerType(saved.selectedTower)
			? saved.selectedTower
			: null
		// DTO выбранной башни из снимка не содержит Phaser-объектов,
		// поэтому выбор восстанавливается только кликом по башне.
		state.selectedBuiltTower = null
		state.status = typeof saved.status === 'string' ? saved.status : ''
		state.buffs = restoreBuffs(saved.buffs)
		state.stats = restoreStats(saved.stats ?? payload.stats)
		state.resultReported = saved.resultReported === true

		const progress = restoreProgress(saved)
		state.level = progress.level
		state.xp = progress.xp
		state.pendingUpgrades = progress.pendingUpgrades

		// Башни восстанавливаем вручную, чтобы не списывать золото повторно.
		for (const entry of saved.towers ?? []) {
			const tower = readSessionTower(entry)
			if (!tower) continue

			const [cellX, cellY] = tower.id.split(',').map(Number)
			const position = { x: cellX, y: cellY }
			if (!isBoardPosition(position)) continue
			if (state.towerCells.has(tower.id)) continue

			const view = createTowerView(this, tower.type, cellX, cellY)
			state.towers.push({
				id: tower.id,
				type: tower.type,
				level: tower.level,
				invested: tower.invested,
				x: view.x,
				y: view.y,
				cooldown: 0,
				body: view.body,
				icon: view.icon,
				levelText: view.levelText,
			})
			state.towerCells.add(tower.id)

			if (tower.level > 1) {
				view.levelText.setText(String(tower.level)).setVisible(true)
			}
		}

		// Врагов возвращаем на те же места, чтобы волна не завершилась мгновенно.
		this.enemies.restore(readSessionEnemies(saved.enemies))

		delete sessionWindow.__sessionData
	}

	// Готовит камеру к путешествию по большому миру.
	private setupCamera() {
		const camera = this.cameras.main

		camera.setBackgroundColor('rgba(74,127,42,1)')

		// Границы строго по игровому полю.
		camera.setBounds(
			0,
			0,
			BOARD_PIXEL_WIDTH,
			BOARD_PIXEL_HEIGHT,
		)

		const fitZoom = Math.min(
			this.scale.width / BOARD_PIXEL_WIDTH,
			this.scale.height / BOARD_PIXEL_HEIGHT,
		)
		const startZoom = Math.min(Math.max(fitZoom, CAMERA_MIN_ZOOM), CAMERA_MAX_ZOOM)

		camera.setZoom(startZoom)
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
		if (this.pauseRequested) {
			this.pauseRequested = false
			this.scene.pause()
			return
		}

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
			onPointerMove: (worldX, worldY) => this.towers.hover(worldX, worldY),
			onPointerLeave: () => this.towers.clearHover(),
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
			onSell: () => this.towers.sell(),
			onDeselect: () => {
				this.towers.deselect()
				this.hud.publish()
			},
			onRestart: () => this.restartGame(),
			onPickUpgrade: (card) => {
				// Постоянно усиливаем выбранный тип башни.
				this.state.buffs = applyUpgradeCard(this.state.buffs, card)
				this.state.pendingUpgrades = Math.max(
					0,
					this.state.pendingUpgrades - 1,
				)
				this.context.setStatus(`${upgradeCardTitle(card)} — ${card.description}.`)
				// Форсируем отправку: сцена на паузе, а React ждёт снимок сразу.
				this.hud.publish(true)
			},
		})
	}

	// React ставит игру на паузу, пока открыто меню, профиль или выбор улучшения.
	private bindPauseControls() {
		const pauseScene = () => {
			this.pauseRequested = true
			if (this.scene.isActive()) this.scene.pause()
		}
		const resumeScene = () => {
			this.pauseRequested = false
			if (this.scene.isPaused()) this.scene.resume()
		}

		window.addEventListener('td:pause', pauseScene)
		window.addEventListener('td:resume', resumeScene)

		this.events.once('shutdown', () => {
			window.removeEventListener('td:pause', pauseScene)
			window.removeEventListener('td:resume', resumeScene)
		})
	}

	// Возвращает игру в начальное состояние, не пересоздавая сцену.
	private restartGame() {
		this.enemies.clear()
		this.towers.clear()
		resetGameState(this.state)
		this.cameraControls.reset()
		this.hud.reset()
		this.hud.publish(true)
		// Новая игра всегда начинается с активной сцены.
		window.dispatchEvent(new Event('td:resume'))
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

function nonNegativeNumber(value: unknown, fallback: number) {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0
		? value
		: fallback
}

function nonNegativeInt(value: unknown, fallback: number) {
	return Math.trunc(nonNegativeNumber(value, fallback))
}
