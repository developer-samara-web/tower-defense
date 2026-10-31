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
	canBuildTower,
	cellKey,
	isBoardPosition,
	isInsideBoardPoint,
	spawnerBuildCells,
	summarizeTowerSelection,
	towerFootprintCells,
	towerFootprintKeys,
	towerSellValue,
	towerStats,
	towerUpgradeCost,
	TOWER_FOOTPRINT,
} from '../../domain/game-rules'
import type { Enemy, SelectionBox, Tower } from '../../types/game.types'
import type { GameContext } from '../game-context'
import { castleBuildCells } from '../map/custom-map'
import {
	createTowerGhost,
	createTowerView,
	drawBuildPreview,
	drawSelectionBox,
	drawSelectionHighlight,
	fireProjectile,
	resizeTowerView,
	showHitFlash,
	towerTexture,
} from '../rendering/tower-view'
import type { EnemySystem } from './enemy-system'

export type TowerSystem = {
	selectType: (type: TowerType | null) => void
	place: (worldX: number, worldY: number, additive: boolean) => void
	select: (tower: Tower) => void
	deselect: () => void
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
	// Замок тоже зона запрета: три клетки вокруг площадки остаются свободными.
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

	// Прячет проекцию башни, когда она не нужна.
	function hideGhost() {
		ghost?.setVisible(false)
		ghostCell?.clear()
	}

	// Показывает проекцию выбранной башни в клетке под курсором.
	function updateGhost() {
		const { scene, state } = ctx
		const type = state.selectedTower

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
		// это дорога, вода или не хватает золота.
		const buildCheck = canBuildTower({
			position: { x, y },
			pathCells: state.pathCells,
			waterCells: state.waterCells,
			forestCells,
			spawnerCells,
			castleCells,
			towerCells: state.towerCells,
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

		drawBuildPreview(ghostCell, x, y, buildCheck.allowed)
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
	function redrawSelection() {
		if (!selectionFrame) selectionFrame = ctx.scene.add.graphics().setDepth(8)
		drawSelectionHighlight(selectionFrame, ctx.state.selectedTowers)
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
		const { scene, state, setStatus, publish } = ctx

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
			gold: state.gold,
			towerType: type,
		})

		// Клик за пределами поля просто снимает выбор с башни.
		if (buildCheck.reason === 'outside') {
			deselect()
			publish()
			return
		}

		// Площадку замка и три клетки вокруг неё держим свободными.
		if (buildCheck.reason === 'castle') {
			setStatus('Вокруг замка строить нельзя.')
			publish()
			return
		}

		// Запрещаем строительство на дороге.
		if (buildCheck.reason === 'path') {
			setStatus('На дороге строить нельзя.')
			publish()
			return
		}

		if (buildCheck.reason === 'water') {
			setStatus('На воде строить нельзя.')
			publish()
			return
		}

		if (buildCheck.reason === 'forest') {
			setStatus('В лесу строить нельзя — расчистите место у дороги.')
			publish()
			return
		}

		// Вокруг казармы башни не ставят: слишком близко к выходу монстров.
		if (buildCheck.reason === 'spawner') {
			setStatus('Вокруг казармы строить нельзя.')
			publish()
			return
		}

		// Башни не ставим вплотную: между площадками остаётся одна клетка.
		if (buildCheck.reason === 'crowded') {
			setStatus('Башни ставят с отступом в одну клетку.')
			publish()
			return
		}

		// Получаем характеристики выбранной башни.
		const stats = TOWER_TYPES[type]

		// Проверяем, хватает ли золота на строительство.
		if (buildCheck.reason === 'gold') {
			setStatus(`Недостаточно золота. Нужно: ${stats.cost}.`)
			publish()
			return
		}

		// Создаём графическое представление башни.
		const view = createTowerView(scene, type, x, y)

		// Добавляем башню в массив объектов, которые будут атаковать врагов.
		state.towers.push({
			id: key,
			type,
			level: 1,
			// Запоминаем полную стоимость постройки для расчёта продажи.
			invested: stats.cost,
			autoUpgrade: false,
			x: view.x,
			y: view.y,
			cooldown: 0,
			body: view.body,
			icon: view.icon,
			levelText: view.levelText,
		})

		// Снимаем выбор с ранее улучшаемой башни.
		deselect()

		// Занимаем все четыре клетки площадки и списываем стоимость башни.
		for (const cell of towerFootprintCells({ x, y })) state.towerCells.add(cell)
		state.gold -= stats.cost
		state.stats.buildingsBuilt++
		state.stats.moneySpent += stats.cost

		// Прячем проекцию: клетка теперь занята.
		hideGhost()

		setStatus('Башня построена.')
		publish()
	}

	// Списывает стоимость улучшения и поднимает уровень башни.
	function applyUpgrade(tower: Tower, cost: number) {
		const { state } = ctx

		state.gold -= cost
		state.stats.moneySpent += cost
		tower.level += 1

		// Учитываем улучшение в полной стоимости башни.
		tower.invested += cost

		// Улучшение меняет облик башни: новый спрайт уровня и крупнее размер.
		resizeTowerView(tower.body, tower.type, tower.level)
		tower.levelText.setText(String(tower.level)).setVisible(true)
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

		redrawSelection()

		setStatus(
			last && upgraded === 1
				? `«${TOWER_TYPES[last.type].name}» улучшена до уровня ${last.level}.`
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
			tower.icon.destroy()
			tower.levelText.destroy()

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

	// Ищет ближайшего врага в пределах радиуса атаки башни.
	function findTarget(tower: Tower) {
		const { state } = ctx

		// Пока цель не найдена.
		let closest: Enemy | null = null

		// Максимальное допустимое расстояние — радиус атаки башни.
		let closestDistance = towerStats(tower.type, tower.level, state.buffs).range

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

			// Если враг в радиусе и ближе предыдущей цели, запоминаем его.
			if (distance <= closestDistance) {
				closest = enemy
				closestDistance = distance
			}
		}

		return closest
	}

	// Наносит урон с учётом модификаторов: поджог и добивание.
	function hitEnemy(enemy: Enemy, damage: number, stats: TowerCombatStats) {
		enemies.damage(enemy, damage)

		// Враг мог погибнуть от основного удара.
		if (!ctx.state.enemies.includes(enemy)) return

		if (stats.burn > 0) {
			enemies.applyBurn(enemy, stats.burn, stats.burnDuration)
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
		if (state.lives > 0) tickAutoUpgrade()

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

			// Ищем подходящего врага в радиусе атаки.
			const target = findTarget(tower)

			// Если цель не найдена, башня не атакует.
			if (!target) continue

			// Запускаем перезарядку башни и создаём снаряд.
			tower.cooldown = stats.attackSpeed
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

				// Ледяная башня дополнительно замедляет выжившую цель.
				if (tower.type === 'ice' && state.enemies.includes(target)) {
					target.slowTimer = ICE_SLOW_DURATION
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

	// Удаляет все башни со сцены.
	function clear() {
		const { state } = ctx

		for (const tower of state.towers) {
			tower.body.destroy()
			tower.icon.destroy()
			tower.levelText.destroy()
		}

		state.towers.length = 0
		state.towerCells.clear()
		deselect()
		showSelectionBox(null)

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
		select,
		deselect,
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
