import type Phaser from 'phaser'

import {
	CELL_SIZE,
	MAX_TOWER_LEVEL,
	TOWER_TYPES,
	type TowerType,
} from '../../config/game.config'
import {
	TOWER_FOOTPRINT,
	towerStats,
	type TowerBuffs,
	towerSpriteSize,
} from '../../domain/game-rules'
import type { Enemy, Tower } from '../../types/game.types'

// Все типы башен — по ним сцена загружает покадровые спрайты уровней.
export const TOWER_TYPES_LIST = Object.keys(TOWER_TYPES) as TowerType[]

// Сколько ступеней прокачки нарисовано в /game/towers. Если баланс поднимет
// потолок выше, башня остаётся в самом взрослом виде.
export const TOWER_SPRITE_LEVELS = 5

// Ключ текстуры башни: свой спрайт на каждый уровень прокачки.
export function towerTexture(type: TowerType, level: number) {
	return `tower-${type}-${Math.min(Math.max(level, 1), TOWER_SPRITE_LEVELS)}`
}

// Сторона площадки башни в пикселях: 2×2 клетки.
const FOOTPRINT_SIZE = CELL_SIZE * TOWER_FOOTPRINT

// Пластина ранга: ромбы по числу уровней на тёмном основании у подножия
// башни. Размер подобран так, чтобы пять ромбов влезали в площадку 2×2.
const RANK_PIP_WIDTH = 5
const RANK_PIP_GAP = 2
const RANK_PLATE_PAD = 4
const RANK_PLATE_HEIGHT = 9
// На сколько пикселей от нижнего края площадки приподнять пластину,
// чтобы она не утонула в траве и не залезла на саму башню.
const RANK_LIFT = 7

// Осветляет цвет элемента: тёмная глина «Земли» на тёмной пластине
// читалась бы как пятно, поэтому грани ромбов заметно светлее спрайта.
function lighten(color: number, amount: number) {
	const r = Math.min(255, ((color >> 16) & 0xff) + amount)
	const g = Math.min(255, ((color >> 8) & 0xff) + amount)
	const b = Math.min(255, (color & 0xff) + amount)

	return (r << 16) | (g << 8) | b
}

// Оправа пластины растёт вместе с рангом: бронза, затем сталь,
// и золото на последнем уровне.
function rankFrameColor(level: number) {
	if (level >= MAX_TOWER_LEVEL) return 0xf5c542
	if (level >= 3) return 0x9aa7b8

	return 0x6b4c1f
}

// Рисует пластину ранга у подножия башни: (x, y) — центр её площадки.
// Свечение под пластиной появляется с третьего уровня, золотая черта
// над ней — на последнем, поэтому рост виден одним взглядом.
export function drawTowerRank(
	g: Phaser.GameObjects.Graphics,
	x: number,
	y: number,
	type: TowerType,
	level: number,
) {
	const safeLevel = Math.min(Math.max(Math.trunc(level) || 1, 1), MAX_TOWER_LEVEL)
	const accent = TOWER_TYPES[type].color
	const pipsWidth = safeLevel * RANK_PIP_WIDTH + (safeLevel - 1) * RANK_PIP_GAP
	const width = pipsWidth + RANK_PLATE_PAD * 2
	const left = x - width / 2
	const top = y + FOOTPRINT_SIZE / 2 - RANK_LIFT - RANK_PLATE_HEIGHT / 2

	g.clear()

	if (safeLevel >= 3) {
		g.fillStyle(accent, safeLevel >= MAX_TOWER_LEVEL ? 0.34 : 0.2)
		g.fillRoundedRect(left - 3, top - 3, width + 6, RANK_PLATE_HEIGHT + 6, 6)
	}

	g.fillStyle(0x150e07, 0.92)
	g.fillRoundedRect(left, top, width, RANK_PLATE_HEIGHT, 3)
	g.lineStyle(1, rankFrameColor(safeLevel), 1)
	g.strokeRoundedRect(left, top, width, RANK_PLATE_HEIGHT, 3)

	if (safeLevel >= MAX_TOWER_LEVEL) {
		g.fillStyle(0xf5c542, 1)
		g.fillRect(left + 2, top - 3, width - 4, 1)
	}

	const centerY = top + RANK_PLATE_HEIGHT / 2
	const half = RANK_PIP_WIDTH / 2

	for (let index = 0; index < safeLevel; index += 1) {
		const pipX = x - pipsWidth / 2 + half + index * (RANK_PIP_WIDTH + RANK_PIP_GAP)

		// Ромб из двух треугольников: верхняя грань светлее нижней,
		// как у огранённого камня.
		g.fillStyle(lighten(accent, 40), 1)
		g.fillTriangle(pipX - half, centerY, pipX, centerY - half, pipX + half, centerY)
		g.fillStyle(lighten(accent, 8), 1)
		g.fillTriangle(pipX - half, centerY, pipX, centerY + half, pipX + half, centerY)

		// Внутренний блик: на последнем уровне он белый, ромб светится.
		const core = safeLevel >= MAX_TOWER_LEVEL ? 0xffffff : lighten(accent, 120)
		g.fillStyle(core, 0.85)
		g.fillTriangle(pipX - 1, centerY, pipX, centerY - 1, pipX + 1, centerY)
		g.fillRect(pipX - 1, centerY, 2, 1)
	}
}

//* Создаёт спрайт башни и её пластину ранга в центре площадки 2×2. *
export function createTowerView(
    scene: Phaser.Scene,
    type: TowerType,
    cellX: number,
    cellY: number,
    level = 1,
) {
    //* Координаты центра площадки. *
    const x = cellX * CELL_SIZE + FOOTPRINT_SIZE / 2
    const y = cellY * CELL_SIZE + FOOTPRINT_SIZE / 2
    const size = towerSpriteSize(level)

    //* Создаём изображение башни текущего уровня прокачки. *
    const body = scene.add
        .image(x, y, towerTexture(type, level))
        .setDisplaySize(size, size)
        .setOrigin(0.5)
        .setDepth(4)

    //* Пластина ранга: рисуется в мировых координатах у подножия башни. *
    const rank = scene.add.graphics().setDepth(6)
    drawTowerRank(rank, x, y, type, level)

    return { x, y, body, rank }
}

// Меняет облик башни по её уровню: спрайт прокачки становится крупнее и
// показывает более взрослую постройку, а пластина ранга получает новый ромб.
export function resizeTowerView(
    body: Phaser.GameObjects.Image,
    type: TowerType,
    level: number,
) {
    const size = towerSpriteSize(level)
    body.setTexture(towerTexture(type, level)).setDisplaySize(size, size)
}

// Перерисовывает пластину ранга и показывает вспышку роста.
export function showTowerLevelUp(
	scene: Phaser.Scene,
	tower: Tower,
) {
	drawTowerRank(tower.rank, tower.x, tower.y, tower.type, tower.level)

	// Кольцо расходится от башни: уровень поднялся даже там, где игрок
	// в этот момент не смотрит.
	const color = TOWER_TYPES[tower.type].color
	const ring = scene.add
		.circle(tower.x, tower.y, FOOTPRINT_SIZE / 2, color, 0.45)
		.setDepth(5)

	scene.tweens.add({
		targets: ring,
		scale: { from: 0.5, to: 1.7 },
		alpha: { from: 0.45, to: 0 },
		duration: 420,
		ease: 'Quad.Out',
		onComplete: () => ring.destroy(),
	})

	// Пластина на мгновение гаснет и вспыхивает обратно — ромб «встаёт».
	scene.tweens.add({
		targets: tower.rank,
		alpha: { from: 0.2, to: 1 },
		duration: 260,
		ease: 'Quad.InOut',
	})
}

// Зона поражения — окружность, дальше которой снаряд башни не летит.
// Радиус берём из тех же характеристик, по которым башня ищет цель,
// поэтому круг на поле честнее любой цифры в панели.
// muted приглушает зону проекции: башня ещё не построена, и её радиус
// не должен спорить с радиусом уже стоящих оборон.
function drawRangeZone(
	g: Phaser.GameObjects.Graphics,
	x: number,
	y: number,
	radius: number,
	color: number,
	muted: boolean,
) {
	g.fillStyle(color, muted ? 0.09 : 0.13)
	g.fillCircle(x, y, radius)
	g.lineStyle(2, color, muted ? 0.75 : 0.95)
	g.strokeCircle(x, y, radius)
}

// Рисует золотые рамки вокруг всех выбранных башен — по всей площадке 2×2,
// а под ними зону поражения каждой башни в её элементном цвете.
export function drawSelectionHighlight(
	highlight: Phaser.GameObjects.Graphics,
	towers: readonly Tower[],
	buffs?: TowerBuffs,
) {
	highlight.clear()
	if (towers.length === 0) return

	// Зоны рисуем первыми: рамки выделения должны оставаться читаемыми
	// поверх них, а пересвет от перекрывающихся кругов сам показывает,
	// где оборона прикрывает участок плотнее.
	for (const tower of towers) {
		const { range } = towerStats(tower.type, tower.level, buffs)
		drawRangeZone(
			highlight,
			tower.x,
			tower.y,
			range,
			TOWER_TYPES[tower.type].color,
			false,
		)
	}

	highlight.lineStyle(3, 0xb89a3a, 1)

	const half = FOOTPRINT_SIZE / 2

	for (const tower of towers) {
		highlight.strokeRect(
			tower.x - half,
			tower.y - half,
			FOOTPRINT_SIZE,
			FOOTPRINT_SIZE,
		)
	}
}

// Рисует рамку выделения, которую игрок тянет мышью.
export function drawSelectionBox(
	frame: Phaser.GameObjects.Graphics,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
) {
	const left = Math.min(x1, x2)
	const top = Math.min(y1, y2)
	const width = Math.abs(x2 - x1)
	const height = Math.abs(y2 - y1)

	frame.clear()
	frame.fillStyle(0xb89a3a, 0.15)
	frame.fillRect(left, top, width, height)
	frame.lineStyle(2, 0xf5e6c8, 0.95)
	frame.strokeRect(left, top, width, height)
}

// Полупрозрачная проекция башни, которая следует за курсором.
export function createTowerGhost(scene: Phaser.Scene, type: TowerType) {
	const size = towerSpriteSize(1)

	const body = scene.add
		.image(0, 0, towerTexture(type, 1))
		.setDisplaySize(size, size)
		.setOrigin(0.5)
		.setDepth(9)
		.setAlpha(0.55)
		.setVisible(false)

	const cell = scene.add.graphics().setDepth(8)

	return { body, cell }
}

// Башня из очереди стройки: полупрозрачный спрайт на своей площадке,
// пока золото не придёт. Янтарная рамка отличается от зелёной и красной
// подсветки под курсором, поэтому заявка не выглядит построенной.
export function createQueuedTowerView(
	scene: Phaser.Scene,
	type: TowerType,
	cellX: number,
	cellY: number,
) {
	const size = towerSpriteSize(1)
	const left = cellX * CELL_SIZE
	const top = cellY * CELL_SIZE

	const body = scene.add
		.image(left + FOOTPRINT_SIZE / 2, top + FOOTPRINT_SIZE / 2, towerTexture(type, 1))
		.setDisplaySize(size, size)
		.setOrigin(0.5)
		.setDepth(9)
		.setAlpha(0.35)

	const cell = scene.add.graphics().setDepth(8)
	cell.fillStyle(0xb89a3a, 0.12)
	cell.fillRect(left, top, FOOTPRINT_SIZE, FOOTPRINT_SIZE)
	cell.lineStyle(2, 0xb89a3a, 0.8)
	cell.strokeRect(left + 1, top + 1, FOOTPRINT_SIZE - 2, FOOTPRINT_SIZE - 2)

	return { body, cell }
}

// Перерисовывает подсветку площадки и зону поражения под проекцией башни.
// range передаёт вызывающий код: уровень у проекции всегда первый, но
// карточки улучшений двигают радиус даже у башни первого уровня.
export function drawBuildPreview(
	cell: Phaser.GameObjects.Graphics,
	cellX: number,
	cellY: number,
	allowed: boolean,
	range: number,
) {
	const color = allowed ? 0x65c943 : 0xe53935
	const left = cellX * CELL_SIZE
	const top = cellY * CELL_SIZE

	cell.clear()
	drawRangeZone(
		cell,
		left + FOOTPRINT_SIZE / 2,
		top + FOOTPRINT_SIZE / 2,
		range,
		color,
		true,
	)
	cell.fillStyle(color, 0.18)
	cell.fillRect(left, top, FOOTPRINT_SIZE, FOOTPRINT_SIZE)
	cell.lineStyle(2, color, 0.95)
	cell.strokeRect(left + 1, top + 1, FOOTPRINT_SIZE - 2, FOOTPRINT_SIZE - 2)
}

// Создаёт круглый снаряд цвета башни и запускает его к цели.
export function fireProjectile(
	scene: Phaser.Scene,
	tower: Tower,
	target: Enemy,
	color: number,
) {
	// Создаём графический объект снаряда в позиции башни.
	const projectile = scene.add
		.graphics()
		.setPosition(tower.x, tower.y)
		.setDepth(7)

	// Пиксельный квадратный снаряд цвета башни.
	projectile.fillStyle(color, 1)
	projectile.fillRect(-3, -3, 6, 6)

	// Анимируем перемещение снаряда к текущей позиции цели.
	scene.tweens.add({
		targets: projectile,
		x: target.x,
		y: target.y,

		// Для пушки оставляем более медленный полёт.
		duration: tower.type === 'earth' ? 240 : 160,

		// Перемещаем снаряд с постоянной скоростью.
		ease: 'Linear',

		// Удаляем снаряд после завершения анимации.
		onComplete: () => projectile.destroy(),
	})
}

// Показывает вспышку в точке попадания и плавно её растворяет.
export function showHitFlash(
	scene: Phaser.Scene,
	x: number,
	y: number,
	color: number,
	radius: number,
) {
	const flash = scene.add.circle(x, y, radius, color, 0.7).setDepth(5)

	scene.tweens.add({
		targets: flash,
		alpha: 0,
		scale: 1.5,
		duration: 150,
		onComplete: () => flash.destroy(),
	})
}
