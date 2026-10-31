import type Phaser from 'phaser'

import {
	CELL_SIZE,
	TOWER_TYPES,
	type TowerType,
} from '../../config/game.config'
import { TOWER_FOOTPRINT, towerSpriteSize } from '../../domain/game-rules'
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

//* Создаёт спрайт башни в центре её площадки 2×2. *
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

    //* Пустой контейнер сохраняет совместимость со старым полем icon. *
    const icon = scene.add.container(x, y).setDepth(6)

    //* Бейдж уровня башни. *
    const levelText = scene.add
        .text(
            x + FOOTPRINT_SIZE / 2 - 5,
            y + FOOTPRINT_SIZE / 2 - 5,
            String(level),
            {
                fontFamily: 'monospace',
                fontSize: '10px',
                color: '#f5e6c8',
                backgroundColor: '#2a1d0a',
                padding: {
                    left: 2,
                    right: 2,
                    top: 1,
                    bottom: 1,
                },
            },
        )
        .setOrigin(1, 1)
        .setDepth(7)
        .setVisible(false)

    return { x, y, body, icon, levelText }
}

// Меняет облик башни по её уровню: спрайт прокачки становится крупнее и
// показывает более взрослую постройку.
export function resizeTowerView(
    body: Phaser.GameObjects.Image,
    type: TowerType,
    level: number,
) {
    const size = towerSpriteSize(level)
    body.setTexture(towerTexture(type, level)).setDisplaySize(size, size)
}

// Рисует золотые рамки вокруг всех выбранных башен — по всей площадке 2×2.
export function drawSelectionHighlight(
	highlight: Phaser.GameObjects.Graphics,
	towers: readonly Tower[],
) {
	highlight.clear()
	if (towers.length === 0) return

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

// Перерисовывает подсветку площадки под проекцией башни.
export function drawBuildPreview(
	cell: Phaser.GameObjects.Graphics,
	cellX: number,
	cellY: number,
	allowed: boolean,
) {
	const color = allowed ? 0x65c943 : 0xe53935
	const left = cellX * CELL_SIZE
	const top = cellY * CELL_SIZE

	cell.clear()
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
