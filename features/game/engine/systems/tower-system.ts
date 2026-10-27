import Phaser from 'phaser'

import {
	CELL_SIZE,
	FIRE_SPLASH_RADIUS,
	ICE_SLOW_DURATION,
	TOWER_TYPES,
	type TowerType,
} from '../../config/game.config'
import {
	canBuildTower,
	isBoardPosition,
	isInsideBoardPoint,
	towerSellValue,
	towerStats,
	towerUpgradeCost,
} from '../../domain/game-rules'
import type { Enemy, Tower } from '../../types/game.types'
import type { GameContext } from '../game-context'
import {
	createSelectionHighlight,
	createTowerGhost,
	createTowerView,
	drawBuildPreview,
	fireProjectile,
	showHitFlash,
	towerTexture,
} from '../rendering/tower-view'
import type { EnemySystem } from './enemy-system'

export type TowerSystem = {
	selectType: (type: TowerType | null) => void
	place: (worldX: number, worldY: number) => void
	select: (tower: Tower) => void
	deselect: () => void
	hover: (worldX: number, worldY: number) => void
	clearHover: () => void
	upgrade: () => void
	sell: () => void
	update: (delta: number) => void
	clear: () => void
}

// Отвечает за выбор, строительство, улучшение и атаки башен.
export function createTowerSystem(
	ctx: GameContext,
	enemies: EnemySystem,
): TowerSystem {
	// Рамка, подсвечивающая выбранную башню.
	let highlight: Phaser.GameObjects.Graphics | null = null

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
		// это дорога или не хватает золота.
		const buildCheck = canBuildTower({
			position: { x, y },
			pathCells: state.pathCells,
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

		ghost.setTexture(towerTexture(type))
		ghost.setDisplaySize(CELL_SIZE, CELL_SIZE)

		ghost
			.setPosition(x * CELL_SIZE + CELL_SIZE / 2, y * CELL_SIZE + CELL_SIZE / 2)
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

	// Снимает выбор с построенной башни.
	function deselect() {
		highlight?.destroy()
		highlight = null
		ctx.state.selectedBuiltTower = null
	}

	// Выбирает построенную башню для просмотра характеристик и улучшения.
	function select(tower: Tower) {
		const { scene, state, setStatus, publish } = ctx

		// Выбор башни отменяет режим строительства.
		state.selectedTower = null
		hideGhost()
		state.selectedBuiltTower = tower

		// Перерисовываем подсветку вокруг выбранной клетки.
		highlight?.destroy()
		highlight = createSelectionHighlight(scene, tower)

		// Показываем название башни и стоимость следующего улучшения.
		const { name } = TOWER_TYPES[tower.type]
		const cost = towerUpgradeCost(tower.type, tower.level)

		setStatus(
			cost === null
				? `«${name}», уровень ${tower.level} — максимальный.`
				: `«${name}», уровень ${tower.level}. Улучшение: ${cost} золота.`,
		)

		publish()
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

	// Пытается построить выбранную башню в точке, куда нажал игрок.
	function place(worldX: number, worldY: number) {
		const { scene, state, setStatus, publish } = ctx

		// Запрещаем строительство после поражения.
		if (state.lives <= 0) return

		// Преобразуем мировые координаты указателя в координаты клетки.
		const x = Math.floor(worldX / CELL_SIZE)
		const y = Math.floor(worldY / CELL_SIZE)

		// Формируем уникальный ключ клетки, например "3,5".
		const key = `${x},${y}`

		// Клик по уже построенной башне выбирает её для улучшения.
		const builtTower = state.towers.find((tower) => tower.id === key)

		if (builtTower) {
			select(builtTower)
			return
		}

		// Без выбранного типа строить нечего.
		const type = state.selectedTower

		if (!type) {
			deselect()
			setStatus('Сначала выбери башню в панели внизу.')
			publish()
			return
		}

		// Проверяем, можно ли строить башню: границы поля, дорогу,
		// занятые клетки, золото и тип башни.
		const buildCheck = canBuildTower({
			position: { x, y },
			pathCells: state.pathCells,
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

		// Запрещаем строительство на дороге.
		if (buildCheck.reason === 'path') {
			setStatus('На дороге строить нельзя.')
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
			// Ключ клетки служит уникальным идентификатором башни.
			id: key,
			type,
			level: 1,
			// Запоминаем полную стоимость постройки для расчёта продажи.
			invested: stats.cost,
			x: view.x,
			y: view.y,
			cooldown: 0,
			body: view.body,
			icon: view.icon,
			levelText: view.levelText,
		})

		// Снимаем выбор с ранее улучшаемой башни.
		deselect()

		// Помечаем клетку занятой и списываем стоимость башни.
		state.towerCells.add(key)
		state.gold -= stats.cost
		state.stats.buildingsBuilt++
		state.stats.moneySpent += stats.cost

		// Прячем проекцию: клетка теперь занята.
		hideGhost()

		setStatus('Башня построена.')
		publish()
	}

	// Улучшает выбранную башню, если хватает золота.
	function upgrade() {
		const { state, setStatus, publish } = ctx

		// Без выбранной башни или после поражения улучшать нечего.
		const tower = state.selectedBuiltTower
		if (!tower || state.lives <= 0) return

		// Получаем название башни и стоимость улучшения.
		const { name } = TOWER_TYPES[tower.type]
		const cost = towerUpgradeCost(tower.type, tower.level)

		// На максимальном уровне улучшение недоступно.
		if (cost === null) {
			setStatus(`«${name}» уже максимального уровня.`)
			return
		}

		// Проверяем баланс игрока.
		if (state.gold < cost) {
			setStatus(`Недостаточно золота. Улучшение стоит ${cost}.`)
			return
		}

		// Списываем стоимость и повышаем уровень.
		state.gold -= cost
		state.stats.moneySpent += cost
		tower.level += 1

		// Учитываем улучшение в полной стоимости башни.
		tower.invested += cost

		// Показываем новый уровень на карте.
		tower.levelText.setText(String(tower.level)).setVisible(true)

		setStatus(`«${name}» улучшена до уровня ${tower.level}.`)
		publish()
	}

	// Продаёт выбранную башню и возвращает часть вложенного золота.
	function sell() {
		const { state, setStatus, publish } = ctx

		const tower = state.selectedBuiltTower
		if (!tower || state.lives <= 0) return

		// Возврат считается от полной стоимости с учётом улучшений.
		const refund = towerSellValue(tower.invested)
		const { name } = TOWER_TYPES[tower.type]

		// Убираем башню со сцены и из состояния.
		tower.body.destroy()
		tower.icon.destroy()
		tower.levelText.destroy()

		const index = state.towers.indexOf(tower)
		if (index >= 0) state.towers.splice(index, 1)

		state.towerCells.delete(tower.id)
		state.gold += refund

		deselect()
		updateGhost()

		setStatus(`«${name}» продана. Возврат: ${refund} золота.`)
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

	// Обновляет башни: перезарядку, поиск целей и атаки.
	function update(delta: number) {
		const { scene, state } = ctx

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
						enemies.damage(enemy, stats.damage)
					}
				}
			} else {
				// Остальные башни наносят урон только выбранной цели.
				enemies.damage(target, stats.damage)

				// Ледяная башня дополнительно замедляет выжившую цель.
				if (tower.type === 'ice' && state.enemies.includes(target)) {
					target.slowTimer = ICE_SLOW_DURATION
				}
			}

			// Создаём визуальную вспышку в точке попадания.
			showHitFlash(
				scene,
				target.x,
				target.y,
				stats.color,
				tower.type === 'fire' ? 22 : 15,
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
		hover,
		clearHover,
		upgrade,
		sell,
		update,
		clear,
	}
}
