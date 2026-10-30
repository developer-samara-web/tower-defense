import Phaser from 'phaser'

import { CELL_SIZE, setBoardSize } from '../config/game.config'
import {
	drawCastleAt,
	drawForestLayer,
	drawRiverLayer,
	drawSpawnerAt,
	drawStaticBoard,
} from '../engine/board/board-renderer'
import {
	canPlaceSpawner,
	castleCenterPoint,
	cellKey,
	clampCastleCell,
	draftRoadSegments,
	draftSize,
	parseCellKey,
	type BoardSize,
} from '../engine/map/custom-map'
import { boardPixelHeight, boardPixelWidth } from '../engine/map/game-map'
import {
	bindCameraControls,
	minCameraZoom,
	type CameraController,
} from '../engine/ui/camera-controls'
import type { EditorBridge, EditorCell, EditorTool } from './types'

// Клик отличается от перетаскивания камеры правой кнопкой.
const CLICK_DISTANCE = 8

const BRUSH_COLORS: Partial<Record<EditorTool, number>> = {
	road: 0xc9ad74,
	river: 0x58b7d8,
	forest: 0x3f7f2d,
	erase: 0xd9534f,
}

// Редактор рисует пустое поле и все пропсы поверх него. Дороги
// от казарм к замку показываем реальным маршрутом, чтобы игрок
// сразу видел, дойдут ли монстры.
export class MapEditorScene extends Phaser.Scene {
	private readonly bridge: EditorBridge

	private cameraControls: CameraController | null = null
	private dynamicObjects: Phaser.GameObjects.GameObject[] = []
	private overlay!: Phaser.GameObjects.Graphics
	private ghost!: Phaser.GameObjects.Graphics

	private painting = false
	private paintTool: EditorTool = 'river'
	private strokeCells = new Set<string>()
	private lastCell: EditorCell | null = null
	private pressed = false
	private pressX = 0
	private pressY = 0
	private hoverCell: EditorCell | null = null
	// Курсор над полем: край экрана двигает камеру только в этом случае,
	// иначе прокрутка начинается, когда мышь ушла на панель инструментов.
	private pointerOverBoard = false
	private canvasHover: {
		canvas: HTMLCanvasElement
		enter: () => void
		leave: () => void
	} | null = null

	constructor(bridge: EditorBridge) {
		super('MapEditorScene')
		this.bridge = bridge
	}

	preload() {
		this.load.image('grass', '/game/grid/grass.png')
		this.load.image('river', '/game/grid/river.png')
		this.load.image('castle', '/game/path/castle.png')
		this.load.image('gate-bottom', '/game/path/gate-bottom.png')
		this.load.image('barracks', '/game/monsters/barracks.png')
		this.load.image('river-bank', '/game/rivers/river-bank.png')
		this.load.image('river-bank-wet', '/game/rivers/river-bank-wet.png')

		// Тот же декор кромки, что и в игре: берег водоёма усыпан
		// пучками травы и камешками из этих текстур.
		for (let index = 1; index <= 4; index++) {
			this.load.image(
				`road-grass-fringe-${index}`,
				`/game/path/road-grass-fringe-${index}.png`,
			)
		}
		for (let index = 1; index <= 3; index++) {
			this.load.image(
				`road-pebbles-${index}`,
				`/game/path/road-pebbles-${index}.png`,
			)
		}
		this.load.image('forest-atlas', '/game/forest/atlas.png')
		this.load.json('forest-frames', '/game/forest/atlas.json')
	}

	create() {
		// Движок рисует поле по глобальному размеру карты.
		this.applyBoardSize()
		drawStaticBoard(this)
		this.setupCamera()

		this.overlay = this.add.graphics().setDepth(5)
		this.ghost = this.add.graphics().setDepth(6)

		this.cameraControls = bindCameraControls(this, this.cameraTarget(), {
			shouldDrag: (pointer) =>
				pointer.rightButtonDown() || pointer.middleButtonDown(),
			edgePan: () => this.pointerOverBoard,
		})

		this.bindEditorInput()
		this.bindBoardHover()

		this.bridge.sync = () => this.sync()
		this.sync()

		this.events.once('shutdown', () => {
			this.cameraControls?.destroy()
			this.cameraControls = null
			this.unbindBoardHover()
			this.input.removeAllListeners()
			this.input.keyboard?.removeAllListeners()
			this.bridge.sync = () => {}
		})
	}

	// Phaser передаёт в update сначала время таймера, затем delta:
	// если принять первый аргумент за delta, прокрутка у края прыгает.
	update(_time: number, delta: number) {
		this.cameraControls?.update(delta)
	}

	private boardSize(): BoardSize {
		return draftSize(this.bridge.state.draft)
	}

	private applyBoardSize() {
		const size = this.boardSize()
		setBoardSize(size.cols, size.rows)
	}

	private cameraTarget() {
		const castle = this.bridge.state.draft.castle
		if (castle) return castleCenterPoint(castle)
		return { x: boardPixelWidth() / 2, y: boardPixelHeight() / 2 }
	}

	private setupCamera() {
		const camera = this.cameras.main
		camera.setBackgroundColor('rgba(74,127,42,1)')
		camera.setBounds(0, 0, boardPixelWidth(), boardPixelHeight())
		camera.setZoom(minCameraZoom(camera))

		const target = this.cameraTarget()
		camera.centerOn(target.x, target.y)
	}

	// Полотном управляет React: при смене размера он пересоздаёт сцену,
	// поэтому здесь поле всегда рисуется один раз актуальным размером.
	private sync() {
		const { draft, roads, seed } = this.bridge.state

		this.applyBoardSize()

		for (const object of this.dynamicObjects) object.destroy()
		this.dynamicObjects = []

		const before = new Set(this.children.list)

		drawRiverLayer(this, draft.waterCells, seed)
		drawForestLayer(this, draft.forestCells, seed)
		this.drawRoads(draft.roadCells, roads)
		this.drawInvalidSpawners(draft.spawners, roads)
		if (draft.castle) drawCastleAt(this, draft.castle.x, draft.castle.y)
		for (const spawner of draft.spawners) {
			drawSpawnerAt(this, spawner.x, spawner.y)
		}

		this.dynamicObjects = this.children.list.filter((object) => !before.has(object))
		this.drawGhost(this.hoverCell)
	}

	private drawRoads(
		roadCells: string[],
		roads: EditorBridge['state']['roads'],
	) {
		const graphics = this.add.graphics().setDepth(0.97)

		// Нарисованную сеть показываем как есть, иначе — превью реальных
		// маршрутов от казарм, чтобы игрок видел, куда пойдут монстры.
		const lines =
			roadCells.length > 0
				? draftRoadSegments(this.bridge.state.draft)
				: roads.map((entry) => entry.road)

		for (const line of lines) {
			if (!line || line.length < 2) continue

			const points = line.map(([x, y]) => ({
				x: x * CELL_SIZE + CELL_SIZE / 2,
				y: y * CELL_SIZE + CELL_SIZE / 2,
			}))

			this.strokeRoad(graphics, points, CELL_SIZE * 0.9, 0x5a4426)
			this.strokeRoad(graphics, points, CELL_SIZE * 0.68, 0xc9ad74)
		}
	}

	private strokeRoad(
		graphics: Phaser.GameObjects.Graphics,
		points: Array<{ x: number; y: number }>,
		width: number,
		color: number,
	) {
		const first = points[0]
		if (!first) return

		graphics.lineStyle(width, color, 1)
		graphics.beginPath()
		graphics.moveTo(first.x, first.y)
		for (let i = 1; i < points.length; i++) {
			const point = points[i]
			if (point) graphics.lineTo(point.x, point.y)
		}
		graphics.strokePath()

		// Круглые стыки: Graphics не умеет скруглять углы ломаной.
		graphics.fillStyle(color, 1)
		for (const point of points) {
			graphics.fillCircle(point.x, point.y, width / 2)
		}
	}

	private drawInvalidSpawners(
		spawners: EditorBridge['state']['draft']['spawners'],
		roads: EditorBridge['state']['roads'],
	) {
		const broken = new Set(
			roads.filter((entry) => !entry.road).map((entry) => entry.spawnerId),
		)
		if (broken.size === 0) return

		const graphics = this.add.graphics().setDepth(0.98)
		graphics.lineStyle(3, 0xff5b4d, 0.95)

		for (const spawner of spawners) {
			if (!broken.has(spawner.id)) continue
			graphics.strokeCircle(
				spawner.x * CELL_SIZE + CELL_SIZE / 2,
				spawner.y * CELL_SIZE + CELL_SIZE / 2,
				CELL_SIZE * 0.9,
			)
		}
	}

	private bindBoardHover() {
		const canvas = this.sys.game?.canvas
		if (!canvas) return

		const enter = () => {
			this.pointerOverBoard = true
		}
		const leave = () => {
			this.pointerOverBoard = false
		}

		canvas.addEventListener('mouseenter', enter)
		canvas.addEventListener('mouseleave', leave)
		this.canvasHover = { canvas, enter, leave }
	}

	private unbindBoardHover() {
		if (!this.canvasHover) return
		const { canvas, enter, leave } = this.canvasHover
		canvas.removeEventListener('mouseenter', enter)
		canvas.removeEventListener('mouseleave', leave)
		this.canvasHover = null
	}

	private bindEditorInput() {
		this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
			if (pointer.button !== 0) return

			this.pressed = true
			this.pressX = pointer.x
			this.pressY = pointer.y

			const cell = this.toCell(pointer.worldX, pointer.worldY)
			if (!cell) return

			const tool = this.bridge.state.tool
			if (
				tool === 'road' ||
				tool === 'river' ||
				tool === 'forest' ||
				tool === 'erase'
			) {
				this.painting = true
				this.paintTool = tool
				this.strokeCells.clear()
				this.lastCell = cell
				this.addStrokeCell(cell)
				this.drawGhost(null)
				this.drawStrokeOverlay(cell)
			}
		})

		this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
			const cell = this.toCell(pointer.worldX, pointer.worldY)
			this.hoverCell = cell

			if (this.painting) {
				if (cell) {
					this.addStrokeLine(this.lastCell, cell)
					this.lastCell = cell
				}
				this.drawStrokeOverlay(this.hoverCell)
				return
			}

			this.drawGhost(cell)
		})

		this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
			if (pointer.button !== 0) return

			const wasPressed = this.pressed
			this.pressed = false
			if (!wasPressed) return

			if (this.painting) {
				const cells = Array.from(this.strokeCells)
				this.painting = false
				this.strokeCells.clear()
				this.lastCell = null
				this.overlay.clear()
				if (cells.length > 0) this.bridge.onStroke(this.paintTool, cells)
				return
			}

			const distance = Math.hypot(pointer.x - this.pressX, pointer.y - this.pressY)
			if (distance > CLICK_DISTANCE) return

			const cell = this.toCell(pointer.worldX, pointer.worldY)
			if (!cell) return

			this.bridge.onClick(this.bridge.state.tool, cell)
		})

		this.input.on('pointerupoutside', () => {
			this.pressed = false
			this.painting = false
			this.strokeCells.clear()
			this.lastCell = null
			this.overlay.clear()
		})
	}

	private toCell(worldX: number, worldY: number): EditorCell | null {
		const size = this.boardSize()
		const x = Math.floor(worldX / CELL_SIZE)
		const y = Math.floor(worldY / CELL_SIZE)
		if (!Number.isFinite(x) || !Number.isFinite(y)) return null
		if (x < 0 || y < 0 || x >= size.cols || y >= size.rows) return null
		return { x, y }
	}

	private addStrokeCell(cell: EditorCell) {
		this.strokeCells.add(cellKey(cell.x, cell.y))
	}

	// Между кадрами мышь может проскочить несколько клеток:
	// дорисовываем прямую, чтобы кисть не оставляла дыр.
	private addStrokeLine(from: EditorCell | null, to: EditorCell) {
		if (!from) {
			this.addStrokeCell(to)
			return
		}

		const size = this.boardSize()
		const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y))
		for (let step = 0; step <= steps; step++) {
			const t = steps === 0 ? 1 : step / steps
			const x = Math.round(from.x + (to.x - from.x) * t)
			const y = Math.round(from.y + (to.y - from.y) * t)
			if (x < 0 || y < 0 || x >= size.cols || y >= size.rows) continue
			this.strokeCells.add(cellKey(x, y))
		}
	}

	private drawStrokeOverlay(current: EditorCell | null) {
		const color = BRUSH_COLORS[this.paintTool] ?? 0xffffff

		this.overlay.clear()
		this.overlay.fillStyle(color, 0.4)

		for (const key of this.strokeCells) {
			const [x = 0, y = 0] = parseCellKey(key)
			this.overlay.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE)
		}

		if (current) {
			this.overlay.lineStyle(2, color, 1)
			this.overlay.strokeRect(
				current.x * CELL_SIZE,
				current.y * CELL_SIZE,
				CELL_SIZE,
				CELL_SIZE,
			)
		}
	}

	private drawGhost(cell: EditorCell | null) {
		this.ghost.clear()
		if (!cell || this.painting) return

		const { draft, tool } = this.bridge.state
		const size = this.boardSize()

		if (tool === 'castle') {
			const [x, y] = clampCastleCell(cell.x, cell.y, size)
			this.ghost.lineStyle(2, 0xf0d38a, 0.9)
			this.ghost.strokeRect(
				(x - 1) * CELL_SIZE,
				(y - 1) * CELL_SIZE,
				CELL_SIZE * 3,
				CELL_SIZE * 3,
			)
			return
		}

		if (tool === 'spawner') {
			const allowed = canPlaceSpawner(draft.castle, cell.x, cell.y, size)
			this.ghost.lineStyle(2, allowed ? 0x9be36d : 0xff5b4d, 0.95)
			this.ghost.strokeRect(
				cell.x * CELL_SIZE,
				cell.y * CELL_SIZE,
				CELL_SIZE,
				CELL_SIZE,
			)
			return
		}

		const color = BRUSH_COLORS[tool] ?? 0xffffff
		this.ghost.lineStyle(2, color, 0.95)
		this.ghost.strokeRect(
			cell.x * CELL_SIZE,
			cell.y * CELL_SIZE,
			CELL_SIZE,
			CELL_SIZE,
		)
	}
}
