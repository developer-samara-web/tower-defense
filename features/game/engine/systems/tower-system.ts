import Phaser from 'phaser'

import {
	CELL_SIZE,
	CHAIN_DAMAGE_FACTOR,
	CHAIN_RADIUS,
	FIRE_SPLASH_RADIUS,
	ICE_SLOW_DURATION,
	TOWER_TYPES,
	type TowerType,
} from '../../config/game.config'
import {
	buildQueueCells,
	canBuildTower,
	canQueueTower,
	cellKey,
	isBoardPosition,
	isInsideBoardPoint,
	spawnerBuildCells,
	summarizeTowerSelection,
	towerFootprintCells,
	towerFootprintKeys,
	towerLevelPerk,
	towerSellValue,
	towerStats,
	towerUpgradeCost,
	TOWER_FOOTPRINT,
	type QueuedBuild,
} from '../../domain/game-rules'
import type { Enemy, SelectionBox, Tower } from '../../types/game.types'
import type { GameContext } from '../game-context'
import { castleBuildCells } from '../map/custom-map'
import {
	createQueuedTowerView,
	createTowerGhost,
	createTowerView,
	drawBuildPreview,
	drawSelectionBox,
	drawSelectionHighlight,
	fireProjectile,
	resizeTowerView,
	showHitFlash,
	showTowerLevelUp,
	towerTexture,
} from '../rendering/tower-view'
import type { EnemySystem } from './enemy-system'

export type TowerSystem = {
	selectType: (type: TowerType | null) => void
	place: (worldX: number, worldY: number, additive: boolean) => void
	// Правый клик: заявка башни в очередь стройки или снятие заявки.
	queueAt: (worldX: number, worldY: number) => void
	// Перерисовывает призраков очереди — после восстановления сохранения.
	refreshQueue: () => void
	select: (tower: Tower) => void
	deselect: () => void
	// Перерисовывает рамки и зоны поражения выделения: карточка улучшения
	// меняет радиус уже выбранной башни, а клик по ней не повторяется.
	refreshSelectionVisuals: () => void
	// Рамка выделения: рисуем во время протяжки, применяем по её отпусканию.
	showSelectionBox: (box: SelectionBox | null) => void
	selectInBox: (box: SelectionBox, additive: boolean) => void
	// true, пока игрок держит рамку: в этот момент камера не должна ехать.
	isSelecting: () => boolean
	hover: (worldX: number, worldY: number) => void
	clearHover: () => void
	upgrade: () => void
	toggleAutoUpgrade: () => void
	sell: () => void
	update: (delta: number) => void
	clear: () => void
}

type TowerCombatStats = ReturnType<typeof towerStats>

// Отвечает за выбор, строительство, улучшение и атаки башен.
export function createTowerSystem(
	ctx: GameContext,
	enemies: EnemySystem,
): TowerSystem {
	// Лес лежит в карте, а не в снимке состояния: тысячи клеток не нужно
	// гонять через HUD и автосохранение.
	const forestCells = new Set(ctx.map.forestCells)
	// Застройка вокруг казарм запрещена, чтобы монстров не расстреливали
	// у самого выхода. У сид-карт казарм нет, поэтому зона пустая.
	const spawnerCells = spawnerBuildCells(ctx.map.spawners)
	// Замок тоже зона запрета: одна клетка вокруг площадки остаётся свободной.
	const castleCells = castleBuildCells(ctx.map.castle)
	// Рамки, подсвечивающие выбранные башни, и прямоугольник протяжки.
	let selectionFrame: Phaser.GameObjects.Graphics | null = null
	let dragFrame: Phaser.GameObjects.Graphics | null = null
	let boxing = false

	// Полупрозрачная проекция башни и подсветка клетки под курсором.
	let ghost: Phaser.GameObjects.Image | null = null
	let ghostCell: Phaser.GameObjects.Graphics | null = null

	// Последняя позиция курсора в мировых координатах.
	let hoverX: number | null = null
	let hoverY: number | null = null

	// Полупрозрачные башни очереди: ключ площадки → спрайт и рамка.
	// Множество пересоздаём при каждой заявке, поэтому вид всегда
	// соответствует содержимому state.buildQueue.
	let queueViews: {
		body: Phaser.GameObjects.Image
		cell: Phaser.GameObjects.Graphics
	}[] = []

	// Причина отказа, кроме нехватки золота: она одна и для постройки,
	// и для заявки в очередь.
	type BlockedReason = Exclude<
		| NonNullable<ReturnType<typeof canBuildTower>['reason']>
		| NonNullable<ReturnType<typeof canQueueTower>['reason']>,
		'gold'
	>

	// Одна формулировка отказа для левой кнопки (стройка) и правой
	// (заявка в очередь): игрок получает тот же текст, где бы ни кликнул.
	function blockedMessage(reason: BlockedReason) {
		switch (reason) {
			case 'outside':
				return 'За пределами поля строить нельзя.'
			case 'castle':
				return 'Вокруг замка строить нельзя.'
			case 'path':
				return 'На дороге строить нельзя.'
			case 'water':
				return 'На воде строить нельзя.'
			case 'forest':
				return 'В лесу строить нельзя — расчистите место у дороги.'
			case 'spawner':
				return 'Вокруг казармы строить нельзя.'
			case 'occupied':
				return 'Здесь уже стоит башня — её площадка занята.'
			case 'queued':
				return 'Эта площадка уже заявлена в очередь стройки.'
			case 'full':
				return 'Очередь стройки полная — расчисти её правым кликом.'
		}
	}

	// Клетки очереди для проверки площадки: построенная башня не должна
	// встать поверх чужой заявки, а заявка — поверх башни.
	function queuedCells() {
		return buildQueueCells(ctx.state.buildQueue)
	}

	// Прячет проекцию башни, когда она не нужна.
	function hideGhost() {
		ghost?.setVisible(false)
		ghostCell?.clear()
	}

	// Точка-заполнитель для перевода курсора в мировые координаты.
	const cursorWorld = new Phaser.Math.Vector2()

	// Пересчитывает клетку под курсором по текущей камере. Указатель мог
	// остаться на месте, пока колесо зума или инерция сдвигали карту:
	// без пересчёта проекция горела на одной клетке, а башня строилась
	// на другой — клик Phaser считает уже по новой камере.
	function syncHoverWithCamera() {
		if (hoverX === null || hoverY === null) return

		const pointer = ctx.scene.input.activePointer
		// Пока жест не отпущен, мировые координаты ведёт его обработчик.
		if (pointer.isDown) return

		ctx.scene.cameras.main.getWorldPoint(pointer.x, pointer.y, cursorWorld)
		hoverX = cursorWorld.x
		hoverY = cursorWorld.y
	}

	// Показывает проекцию выбранной башни в клетке под курсором.
	function updateGhost() {
		const { scene, state } = ctx
		const type = state.selectedTower

		syncHoverWithCamera()

		if (!type || state.lives <= 0 || hoverX === null || hoverY === null) {
			hideGhost()
			return
		}

		// Переводим мировые координаты курсора в координаты клетки.
		const x = Math.floor(hoverX / CELL_SIZE)
		const y = Math.floor(hoverY / CELL_SIZE)

		// За пределами поля проекцию не показываем.
		if (!isBoardPosition({ x, y })) {
			hideGhost()
			return
		}

		// Зелёная подсветка — строить можно, красная — клетка занята,
		// это дорога, вода, чужая очередь или не хватает золота.
		const buildCheck = canBuildTower({
			position: { x, y },
			pathCells: state.pathCells,
			waterCells: state.waterCells,
			forestCells,
			spawnerCells,
			castleCells,
			towerCells: state.towerCells,
			queuedCells: queuedCells(),
			gold: state.gold,
			towerType: type,
		})

		// Создаём проекцию при первом наведении.
		if (!ghost || !ghostCell) {
			const created = createTowerGhost(scene, type)
			ghost = created.body
			ghostCell = created.cell
		}

		ghost.setTexture(towerTexture(type, 1))

		// Проекция стоит по центру площадки 2×2, якорь — клетка под курсором.
		ghost
			.setPosition(
				x * CELL_SIZE + (CELL_SIZE * TOWER_FOOTPRINT) / 2,
				y * CELL_SIZE + (CELL_SIZE * TOWER_FOOTPRINT) / 2,
			)
			.setVisible(true)
			.setAlpha(buildCheck.allowed ? 0.6 : 0.35)

		drawBuildPreview(
			ghostCell,
			x,
			y,
			buildCheck.allowed,
			towerStats(type, 1, state.buffs).range,
		)
	}

	// Запоминает позицию курсора и обновляет проекцию.
	function hover(worldX: number, worldY: number) {
		hoverX = worldX
		hoverY = worldY
		updateGhost()
	}

	// Убирает проекцию, когда курсор уходит с поля.
	function clearHover() {
		hoverX = null
		hoverY = null
		hideGhost()
	}

	// Перерисовывает рамки выделения: слой создаём один и переиспользуем.
	// Зоны поражения входят в ту же перерисовку — радиус зависит от уровня
	// башни и карточек, поэтому круг живёт ровно столько, сколько рамка.
	function redrawSelection() {
		if (!selectionFrame) selectionFrame = ctx.scene.add.graphics().setDepth(8)
		drawSelectionHighlight(selectionFrame, ctx.state.selectedTowers, ctx.state.buffs)
	}

	// Подпись под выделением: одна башня — её уровень и цена улучшения,
	// группа — сколько башен вырастет и за сколько золота.
	function announceSelection() {
		redrawSelection()

		const { state, setStatus } = ctx
		const summary = summarizeTowerSelection(
			state.selectedTowers,
			state.gold,
			state.buffs,
		)

		if (!summary) {
			setStatus('Выделение снято.')
			return
		}

		if (summary.count === 1) {
			const name = summary.type ? TOWER_TYPES[summary.type].name : 'Башня'
			const cost = summary.upgradeable > 0 ? summary.upgradeCost : null

			setStatus(
				cost === null
					? `«${name}», уровень ${summary.levelMin} — максимальный.`
					: `«${name}», уровень ${summary.levelMin}. Улучшение: ${cost} золота.`,
			)
			return
		}

		if (summary.upgradeable === 0) {
			setStatus(`Выбрано башен: ${summary.count} — все максимального уровня.`)
			return
		}

		setStatus(
			`Выбрано башен: ${summary.count}. Улучшение ${summary.upgradeable} из ${summary.count}: ${summary.upgradeCost} золота.`,
		)
	}

	// Снимает выделение со всех башен.
	function deselect() {
		ctx.state.selectedTowers.length = 0
		redrawSelection()
	}

	// Выделяет одну башню — как обычный клик в Warcraft 3.
	function select(tower: Tower) {
		const { state } = ctx

		// Выбор башни отменяет режим строительства.
		state.selectedTower = null
		hideGhost()
		state.selectedTowers.length = 0
		state.selectedTowers.push(tower)

		announceSelection()
		ctx.publish()
	}

	// Ctrl+клик: добавляет башню в выделение или убирает её из него.
	function toggleSelected(tower: Tower) {
		const { state } = ctx

		state.selectedTower = null
		hideGhost()

		const index = state.selectedTowers.indexOf(tower)
		if (index >= 0) state.selectedTowers.splice(index, 1)
		else state.selectedTowers.push(tower)

		announceSelection()
		ctx.publish()
	}

	// Показывает (или прячет при null) рамку, которую игрок тянет мышью.
	function showSelectionBox(box: SelectionBox | null) {
		if (!box) {
			boxing = false
			dragFrame?.clear()
			return
		}

		if (!dragFrame) dragFrame = ctx.scene.add.graphics().setDepth(9)
		boxing = true
		drawSelectionBox(dragFrame, box.x1, box.y1, box.x2, box.y2)
	}

	// Выделяет всё, что попало в рамку. Порядок — сверху вниз и слева
	// направо: так же группа читается на поле и улучшается по очереди.
	function selectInBox(box: SelectionBox, additive: boolean) {
		const { state } = ctx
		const left = Math.min(box.x1, box.x2)
		const right = Math.max(box.x1, box.x2)
		const top = Math.min(box.y1, box.y2)
		const bottom = Math.max(box.y1, box.y2)
		// Под рамку попадает башня, чья площадка 2×2 с ней пересекается.
		const half = (CELL_SIZE * TOWER_FOOTPRINT) / 2

		const inside = state.towers
			.filter(
				(tower) =>
					tower.x + half >= left &&
					tower.x - half <= right &&
					tower.y + half >= top &&
					tower.y - half <= bottom,
			)
			.sort((a, b) => a.y - b.y || a.x - b.x)

		state.selectedTower = null
		hideGhost()

		if (additive) {
			for (const tower of inside) {
				if (!state.selectedTowers.includes(tower)) state.selectedTowers.push(tower)
			}
		} else {
			state.selectedTowers.length = 0
			state.selectedTowers.push(...inside)
		}

		showSelectionBox(null)
		announceSelection()
		ctx.publish()
	}

	// Выбирает тип башни для строительства. Повторный клик снимает выбор.
	function selectType(type: TowerType | null) {
		const { state, setStatus, publish } = ctx

		state.selectedTower =
			type !== null && state.selectedTower === type ? null : type
		deselect()
		updateGhost()

		if (state.selectedTower === null) {
			setStatus('Башня не выбрана. Нажми на карточку внизу, чтобы строить.')
		} else {
			const tower = TOWER_TYPES[state.selectedTower]
			setStatus(
				`Выбрана башня «${tower.name}». Стоимость: ${tower.cost} золота.`,
			)
		}

		publish()
	}

	// Кликает по полю: выделяет башню, строит новую или снимает выделение.
	// additive (Ctrl/Cmd/Shift) правит выделение, а не заменяет его.
	function place(worldX: number, worldY: number, additive: boolean) {
		const { state, setStatus, publish } = ctx

		// Запрещаем строительство после поражения.
		if (state.lives <= 0) return

		// Преобразуем мировые координаты указателя в координаты клетки.
		const x = Math.floor(worldX / CELL_SIZE)
		const y = Math.floor(worldY / CELL_SIZE)

		// Ключ якорной клетки служит идентификатором башни.
		const key = cellKey({ x, y })

		// Клик по любой клетке площадки построенной башни меняет выделение.
		const builtTower = state.towers.find(
			(tower) => towerFootprintKeys(tower.id).includes(key),
		)

		if (builtTower) {
			if (additive) toggleSelected(builtTower)
			else select(builtTower)
			return
		}

		// Клик мимо башни с зажатой клавишей выделение не трогает.
		if (additive) return

		// Без выбранного типа строить нечего.
		const type = state.selectedTower

		if (!type) {
			deselect()
			setStatus('Сначала выбери башню в панели внизу.')
			publish()
			return
		}

		// Проверяем, можно ли строить башню: границы поля, дорогу,
		// воду, занятые клетки, золото и тип башни.
		const buildCheck = canBuildTower({
			position: { x, y },
			pathCells: state.pathCells,
			waterCells: state.waterCells,
			forestCells,
			spawnerCells,
			castleCells,
			towerCells: state.towerCells,
			queuedCells: queuedCells(),
			gold: state.gold,
			towerType: type,
		})

		const stats = TOWER_TYPES[type]

		// Клик за пределами поля просто снимает выбор с башни.
		if (buildCheck.reason === 'outside') {
			deselect()
			publish()
			return
		}

		// Любая площадка недоступна по местности — сообщаем причину. Нехватка
		// золота больше не тупик: правая кнопка ставит башню в очередь.
		if (buildCheck.reason) {
			setStatus(
				buildCheck.reason === 'gold'
					? `Недостаточно золота. Нужно: ${stats.cost}. Правый клик поставит башню в очередь.`
					: blockedMessage(buildCheck.reason),
			)
			publish()
			return
		}

		buildTowerAt(type, x, y)

		// Снимаем выбор с ранее улучшаемой башни.
		deselect()

		// Прячем проекцию: клетка теперь занята.
		hideGhost()

		setStatus('Башня построена.')
		publish()
	}

	// Ставит башню на проверенную площадку: создание спрайта, захват
	// клеток 2×2 и списание золота. Этим же строит очередь.
	function buildTowerAt(type: TowerType, x: number, y: number) {
		const { scene, state } = ctx
		const stats = TOWER_TYPES[type]

		const view = createTowerView(scene, type, x, y)

		// Добавляем башню в массив объектов, которые будут атаковать врагов.
		state.towers.push({
			id: cellKey({ x, y }),
			type,
			level: 1,
			// Запоминаем полную стоимость постройки для расчёта продажи.
			invested: stats.cost,
			autoUpgrade: false,
			x: view.x,
			y: view.y,
			cooldown: 0,
			body: view.body,
			rank: view.rank,
		})

		// Занимаем все четыре клетки площадки и списываем стоимость башни.
		for (const cell of towerFootprintCells({ x, y })) state.towerCells.add(cell)
		state.gold -= stats.cost
		state.stats.buildingsBuilt++
		state.stats.moneySpent += stats.cost
	}

	// Заявка башни в очередь стройки или снятие уже поставленной заявки.
	// Площадка резервируется сразу, поэтому второй правый клик возвращает
	// её в свободное состояние, а не плодит дубликат.
	function queueAt(worldX: number, worldY: number) {
		const { state, setStatus, publish } = ctx

		if (state.lives <= 0) return

		const x = Math.floor(worldX / CELL_SIZE)
		const y = Math.floor(worldY / CELL_SIZE)
		const key = cellKey({ x, y })

		const existing = state.buildQueue.findIndex((item) =>
			towerFootprintCells({ x: item.x, y: item.y }).includes(key),
		)

		if (existing >= 0) {
			state.buildQueue.splice(existing, 1)
			syncQueueViews()
			setStatus('Заявка убрана из очереди стройки.')
			publish()
			return
		}

		const type = state.selectedTower

		if (!type) {
			setStatus('Сначала выбери башню в панели внизу, потом ставь её в очередь.')
			publish()
			return
		}

		const queueCheck = canQueueTower({
			position: { x, y },
			pathCells: state.pathCells,
			waterCells: state.waterCells,
			forestCells,
			spawnerCells,
			castleCells,
			towerCells: state.towerCells,
			queue: state.buildQueue,
		})

		if (queueCheck.reason === 'outside') return

		if (queueCheck.reason) {
			setStatus(blockedMessage(queueCheck.reason))
			publish()
			return
		}

		state.buildQueue.push({ id: key, type, x, y })
		syncQueueViews()

		const cost = TOWER_TYPES[type].cost
		setStatus(
			state.gold >= cost
				? `«${TOWER_TYPES[type].name}» в очереди — построится сразу.`
				: `«${TOWER_TYPES[type].name}» в очереди: ждёт ${cost} золота.`,
		)
		publish()
	}

	// Перерисовывает призраков очереди: их всегда ровно столько, сколько
	// заявок, поэтому достаточно пересобрать список целиком.
	function syncQueueViews() {
		const { scene, state } = ctx

		for (const view of queueViews) {
			view.body.destroy()
			view.cell.destroy()
		}
		queueViews = []

		for (const item of state.buildQueue) {
			queueViews.push(createQueuedTowerView(scene, item.type, item.x, item.y))
		}
	}

	// Очередь строится сама, как только золота хватает на очередную башню.
	// Порядок заявок сохраняется, поэтому игрок размечает оборону заранее.
	function tickBuildQueue() {
		const { state } = ctx

		if (state.buildQueue.length === 0) return

		let built: QueuedBuild | null = null

		for (let index = 0; index < state.buildQueue.length; ) {
			const item = state.buildQueue[index]!

			// Проверка площадки на каждом шаге: за время ожидания клетку
			// могла занять построенная башня — заявка тогда не нужна.
			const check = canBuildTower({
				position: { x: item.x, y: item.y },
				pathCells: state.pathCells,
				waterCells: state.waterCells,
				forestCells,
				spawnerCells,
				castleCells,
				towerCells: state.towerCells,
				gold: state.gold,
				towerType: item.type,
			})

			if (check.reason === 'gold') {
				index += 1
				continue
			}

			state.buildQueue.splice(index, 1)
			if (check.reason) continue

			buildTowerAt(item.type, item.x, item.y)
			built = item
		}

		if (!built) return

		syncQueueViews()
		ctx.setStatus(`Очередь построила «${TOWER_TYPES[built.type].name}».`)
		ctx.publish()
	}

	// Списывает стоимость улучшения и поднимает уровень башни.
	function applyUpgrade(tower: Tower, cost: number) {
		const { scene, state } = ctx

		state.gold -= cost
		state.stats.moneySpent += cost
		tower.level += 1

		// Учитываем улучшение в полной стоимости башни.
		tower.invested += cost

		// Улучшение меняет облик башни: новый спрайт уровня и крупнее размер.
		resizeTowerView(tower.body, tower.type, tower.level)
		showTowerLevelUp(scene, tower)

		// Уровень поднимает и радиус, поэтому зона выделенной башни
		// перерисовывается сразу — автоулучшение растит её без клика.
		if (state.selectedTowers.includes(tower)) redrawSelection()
	}

	// Самое дешёвое улучшение в выделении — для сообщения о нехватке золота.
	function cheapestUpgradeCost(towers: readonly Tower[]) {
		let cheapest: number | null = null

		for (const tower of towers) {
			const cost = towerUpgradeCost(tower.type, tower.level)
			if (cost !== null && (cheapest === null || cost < cheapest)) cheapest = cost
		}

		return cheapest
	}

	// Улучшает все выбранные башни в порядке выделения: на ту, где не
	// хватает золота, деньги может найти следующая — дешевле.
	function upgrade() {
		const { state, setStatus, publish } = ctx

		// После поражения и без выделения улучшать нечего.
		if (state.lives <= 0 || state.selectedTowers.length === 0) return

		let upgraded = 0
		let spent = 0
		let last: Tower | null = null

		for (const tower of state.selectedTowers) {
			const cost = towerUpgradeCost(tower.type, tower.level)
			if (cost === null || state.gold < cost) continue

			applyUpgrade(tower, cost)
			upgraded += 1
			spent += cost
			last = tower
		}

		if (upgraded === 0) {
			const cheapest = cheapestUpgradeCost(state.selectedTowers)

			setStatus(
				cheapest === null
					? 'Выбранные башни уже максимального уровня.'
					: `Недостаточно золота. Улучшение стоит ${cheapest}.`,
			)
			publish()
			return
		}

		// Выделение перерисовывает applyUpgrade — оно обновляет и зону.
		// Ручное улучшение всегда одно, поэтому объявляем и новый перк уровня:
		// автоулучшение молчит, иначе оно затирало бы статус каждый кадр.
		const perk = last ? towerLevelPerk(last.type, last.level) : null

		setStatus(
			last && upgraded === 1
				? `«${TOWER_TYPES[last.type].name}» улучшена до уровня ${last.level}${
						perk ? `: ${perk.toLowerCase()}.` : '.'
					}`
				: `Улучшено башен: ${upgraded} за ${spent} золота.`,
		)
		publish()
	}

	// Включает автоулучшение всего выделения: если хоть одна башня его не
	// имела — включаем всем, иначе всем выключаем.
	function toggleAutoUpgrade() {
		const { state, setStatus, publish } = ctx

		const selected = state.selectedTowers
		if (selected.length === 0) return

		const turnOn = selected.some((tower) => !tower.autoUpgrade)
		for (const tower of selected) tower.autoUpgrade = turnOn

		const single = selected.length === 1 ? selected[0] : null

		if (single) {
			const { name } = TOWER_TYPES[single.type]
			const cost = towerUpgradeCost(single.type, single.level)

			if (!single.autoUpgrade) {
				setStatus(`Автоулучшение «${name}» выключено.`)
			} else if (cost === null) {
				setStatus(`«${name}» и так максимального уровня.`)
			} else {
				setStatus(`«${name}» улучшается сама, как только хватит золота (${cost}).`)
			}
		} else {
			setStatus(
				turnOn
					? `Автоулучшение включено для ${selected.length} башен.`
					: `Автоулучшение выключено для ${selected.length} башен.`,
			)
		}

		publish()
	}

	// Продаёт всё выделение и возвращает часть вложенного золота.
	function sell() {
		const { state, setStatus, publish } = ctx

		if (state.lives <= 0 || state.selectedTowers.length === 0) return

		const sold = [...state.selectedTowers]
		const single = sold.length === 1 ? sold[0] : null
		let refund = 0

		for (const tower of sold) {
			// Возврат считается от полной стоимости с учётом улучшений.
			refund += towerSellValue(tower.invested)

			// Убираем башню со сцены и из состояния.
			tower.body.destroy()
			tower.rank.destroy()

			const index = state.towers.indexOf(tower)
			if (index >= 0) state.towers.splice(index, 1)

			// Продали башню — освобождаем всю её площадку 2×2.
			for (const cell of towerFootprintKeys(tower.id)) state.towerCells.delete(cell)
		}

		state.gold += refund

		deselect()
		updateGhost()

		setStatus(
			single
				? `«${TOWER_TYPES[single.type].name}» продана. Возврат: ${refund} золота.`
				: `Продано башен: ${sold.length}. Возврат: ${refund} золота.`,
		)
		publish()
	}

	// Ищет цели для залпа: ближайшие враги в радиусе атаки, ровно столько,
	// сколько даёт текущий уровень башни.
	function findTargets(tower: Tower, stats: TowerCombatStats) {
		const { state } = ctx

		const found: Enemy[] = []
		const distances: number[] = []

		// Проверяем всех врагов, которые уже вошли на игровое поле.
		for (const enemy of state.enemies) {
			// Пропускаем монстров, ещё не вошедших на поле.
			if (!isInsideBoardPoint(enemy.x, enemy.y)) continue

			const distance = Phaser.Math.Distance.Between(
				tower.x,
				tower.y,
				enemy.x,
				enemy.y,
			)

			// Вне радиуса атаки цель не берём.
			if (distance > stats.range) continue

			// Держим короткий список по возрастанию расстояния вставкой:
			// целей максимум три, поэтому сортировать всю толпу незачем.
			let index = distances.findIndex((held) => distance < held)
			if (index === -1) index = found.length
			if (index >= stats.targets) continue

			found.splice(index, 0, enemy)
			distances.splice(index, 0, distance)

			if (found.length > stats.targets) {
				found.pop()
				distances.pop()
			}
		}

		return found
	}

	// Наносит урон с учётом модификаторов: поджог и добивание.
	function hitEnemy(enemy: Enemy, damage: number, stats: TowerCombatStats) {
		enemies.damage(enemy, damage)

		// Враг мог погибнуть от основного удара.
		if (!ctx.state.enemies.includes(enemy)) return

		if (stats.burn > 0) {
			enemies.applyBurn(enemy, stats.burn, stats.burnDuration)
		}

		// Поджог от уровня огненной башни: доля максимального здоровья в
		// секунду, поэтому одинаково больно бьёт и разведчика, и босса.
		// applyBurn оставляет сильнейший из двух, так что карточки он не перебивает.
		if (stats.burnPercent > 0) {
			enemies.applyBurn(enemy, enemy.maxHp * stats.burnPercent, stats.burnDuration)
		}

		if (stats.execute > 0 && enemy.hp / enemy.maxHp <= stats.execute) {
			enemies.damage(enemy, enemy.hp)
		}
	}

	// Перекидывает часть урона на ближайших врагов рядом с целью.
	function chainHit(source: Enemy, stats: TowerCombatStats, damage: number) {
		const jumps = Math.floor(stats.chain)
		if (jumps <= 0) return

		const { scene, state } = ctx
		const hit = new Set<Enemy>([source])
		let current = source

		for (let jump = 0; jump < jumps; jump++) {
			let next: Enemy | null = null
			let closestDistance = CHAIN_RADIUS

			for (const enemy of state.enemies) {
				if (hit.has(enemy)) continue
				if (!isInsideBoardPoint(enemy.x, enemy.y)) continue

				const distance = Phaser.Math.Distance.Between(
					current.x,
					current.y,
					enemy.x,
					enemy.y,
				)

				if (distance <= closestDistance) {
					next = enemy
					closestDistance = distance
				}
			}

			if (!next) return

			hit.add(next)
			hitEnemy(next, Math.round(damage * CHAIN_DAMAGE_FACTOR), stats)
			showHitFlash(scene, next.x, next.y, stats.color, 12)
			current = next
		}
	}

	// Башни с включённым автоулучшением растут сами, стоит золоту
	// покрыть следующий уровень.
	function tickAutoUpgrade() {
		const { state } = ctx

		for (const tower of state.towers) {
			if (!tower.autoUpgrade) continue

			const cost = towerUpgradeCost(tower.type, tower.level)
			if (cost === null || state.gold < cost) continue

			applyUpgrade(tower, cost)
		}
	}

	// Обновляет башни: перезарядку, поиск целей и атаки.
	function update(delta: number) {
		const { scene, state } = ctx

		// После поражения золото не тратим.
		if (state.lives > 0) {
			tickBuildQueue()
			tickAutoUpgrade()
		}

		// После поражения проекцию башни больше не показываем.
		if (state.lives <= 0) {
			hideGhost()
		} else if (state.selectedTower) {
			// Обновляем цвет подсветки, если изменился баланс игрока.
			updateGhost()
		}

		for (const tower of state.towers) {
			// Уменьшаем время до следующей атаки.
			tower.cooldown -= delta

			// Если башня ещё перезаряжается, пропускаем её.
			if (tower.cooldown > 0) continue

			// Получаем характеристики башни с учётом уровня и бонусов от карточек.
			const stats = towerStats(tower.type, tower.level, state.buffs)

			// Ищем цели в радиусе атаки: сколько их берёт башня — решает уровень.
			const targets = findTargets(tower, stats)

			// Если врагов рядом нет, башня не атакует.
			if (targets.length === 0) continue

			// Залп стоит башне одну перезарядку, сколько бы целей в него ни вошло.
			tower.cooldown = stats.attackSpeed

			for (const target of targets) {
				// Цель могла погибнуть от предыдущего снаряда этого же залпа.
				if (!state.enemies.includes(target)) continue

				// Создаём снаряд в сторону цели.
				fireProjectile(scene, tower, target, stats.color)

				// Критический удар наносит повышенный урон.
				const crit = stats.crit > 0 && Math.random() < stats.crit
				const damage = Math.round(stats.damage * (crit ? stats.critPower : 1))

				// Огненная башня наносит урон всем врагам в радиусе взрыва вокруг цели.
				if (tower.type === 'fire') {
					for (const enemy of [...state.enemies]) {
						const distance = Phaser.Math.Distance.Between(
							target.x,
							target.y,
							enemy.x,
							enemy.y,
						)

						if (distance <= FIRE_SPLASH_RADIUS) {
							hitEnemy(enemy, damage, stats)
						}
					}
				} else {
					// Остальные башни наносят урон только выбранной цели.
					hitEnemy(target, damage, stats)

					// Ледяная башня дополнительно замедляет выжившую цель
					// с силой своего уровня.
					if (tower.type === 'ice' && state.enemies.includes(target)) {
						enemies.applySlow(target, stats.slowFactor, ICE_SLOW_DURATION)
					}
				}

				// Карточки цепной атаки задевают врагов рядом с целью.
				chainHit(target, stats, damage)

				// Создаём визуальную вспышку в точке попадания.
				showHitFlash(
					scene,
					target.x,
					target.y,
					stats.color,
					crit ? 24 : tower.type === 'fire' ? 22 : 15,
				)
			}
		}
	}

	// Удаляет все башни со сцены.
	function clear() {
		const { state } = ctx

		for (const tower of state.towers) {
			tower.body.destroy()
			tower.rank.destroy()
		}

		state.towers.length = 0
		state.towerCells.clear()
		deselect()
		showSelectionBox(null)

		// Очередь живёт вместе с полем: после рестарта заявок нет.
		state.buildQueue.length = 0
		syncQueueViews()

		// Убираем проекцию и сбрасываем выбранный тип башни.
		ghost?.destroy()
		ghost = null
		ghostCell?.destroy()
		ghostCell = null
		hoverX = null
		hoverY = null
		state.selectedTower = null
	}

	return {
		selectType,
		place,
		queueAt,
		// Перерисовка призраков очереди нужна сцене после восстановления
		// сохранения: заявки приходят не из клика.
		refreshQueue: syncQueueViews,
		select,
		deselect,
		refreshSelectionVisuals: redrawSelection,
		showSelectionBox,
		selectInBox,
		isSelecting: () => boxing,
		hover,
		clearHover,
		upgrade,
		toggleAutoUpgrade,
		sell,
		update,
		clear,
	}
}
