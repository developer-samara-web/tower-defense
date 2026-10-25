
import Phaser from 'phaser'

import { CELL_SIZE, COLS, ROWS } from '@/features/game/config/game.config'
import { createGameState, resetGameState, type GameState } from '@/features/game/domain/game-state'
import { applyUpgradeCard, upgradeCardTitle } from '@/features/game/domain/upgrade-cards'

import { drawBoard } from '../board/board-renderer'
import type { GameContext } from '../game-context'
import { createEnemySystem, type EnemySystem } from '../systems/enemy-system'
import { createTowerSystem, type TowerSystem } from '../systems/tower-system'
import { createWaveSystem, type WaveSystem } from '../systems/wave-system'
import { connectBrowserControls } from '../ui/browser-controls'
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

	constructor() {
		super('MainScene')
	}

	preload() {
		this.load.image('tower-ice', '/game/towers/ice.png')
		this.load.image('tower-fire', '/game/towers/fire.png')
		this.load.image('tower-earth', '/game/towers/earth.png')
		this.load.image('castle', '/game/path/castle.png')
	}

	// Вызывается Phaser при создании сцены.
	create() {
		// Готовим состояние и рисуем поле. Карта возвращает занятые дорогой клетки.
		this.state = createGameState()

		// Фон за пределами поля рисует CSS-слой с картинкой леса,
		// поэтому камера остаётся прозрачной.
		this.cameras.main.setBackgroundColor('rgba(0,0,0,0)')
		this.fitCameraToBoard()
		this.scale.on('resize', this.fitCameraToBoard)

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

		// Убираем обработчик изменения размера при завершении сцены.
		this.events.once('shutdown', () => {
			this.scale.off('resize', this.fitCameraToBoard)
		})
	}

	// Подбирает масштаб камеры и центрирует игровое поле.
	private fitCameraToBoard = () => {
		// Вычисляем полные размеры игрового поля.
		const boardWidth = COLS * CELL_SIZE
		const boardHeight = ROWS * CELL_SIZE

		// Выбираем наименьший масштаб по ширине и высоте,
		// чтобы всё поле помещалось в доступную область.
		// Ограничиваем максимальный масштаб, чтобы на больших экранах
		// поле не растягивалось, а вокруг оставался зелёный фон.
		const fitZoom = Math.min(
			this.scale.width / boardWidth,
			this.scale.height / boardHeight,
		)
		const zoom = Math.min(fitZoom, 1.5)

		// Устанавливаем масштаб камеры и центрируем поле.
		this.cameras.main.setZoom(zoom)
		this.cameras.main.centerOn(boardWidth / 2, boardHeight / 2)
	}

	// Основной игровой цикл Phaser. Вызывается каждый кадр.
	update(_time: number, delta: number) {
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
