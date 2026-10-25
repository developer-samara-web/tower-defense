import type Phaser from 'phaser'

import { CELL_SIZE, type TowerType } from '../../config/game.config'
import type { Enemy, Tower } from '../../types/game.types'

// Ключи для графических иконок больше не используются — иконки рисуются графикой.


const TOWER_TEXTURES: Record<TowerType, string> = {
    ice: 'tower-ice',
    fire: 'tower-fire',
    earth: 'tower-earth',
}

//* Создаёт спрайт башни в центре игровой клетки. *
export function createTowerView(
    scene: Phaser.Scene,
    type: TowerType,
    cellX: number,
    cellY: number,
) {
    //* Координаты центра клетки. *
    const x = cellX * CELL_SIZE + CELL_SIZE / 2
    const y = cellY * CELL_SIZE + CELL_SIZE / 2

    //* Создаём изображение башни. *
    const body = scene.add
        .image(x, y, TOWER_TEXTURES[type])
        .setDisplaySize(CELL_SIZE * 1, CELL_SIZE * 1)
        .setOrigin(0.5)
        .setDepth(4)

    //* Пустой контейнер сохраняет совместимость со старым полем icon. *
    const icon = scene.add.container(x, y).setDepth(6)

    //* Бейдж уровня башни. *
    const levelText = scene.add
        .text(
            x + CELL_SIZE / 2 - 5,
            y + CELL_SIZE / 2 - 5,
            '1',
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


// Создаёт рамку, подсвечивающую выбранную башню.
export function createSelectionHighlight(scene: Phaser.Scene, tower: Tower) {
	const highlight = scene.add.graphics().setDepth(8)
	highlight.lineStyle(3, 0xb89a3a, 1)
	highlight.strokeRect(
		tower.x - CELL_SIZE / 2,
		tower.y - CELL_SIZE / 2,
		CELL_SIZE,
		CELL_SIZE,
	)
	return highlight
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
