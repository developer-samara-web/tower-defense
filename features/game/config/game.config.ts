
// Большой мир 125 × 125 клеток по 32 px = ровно 4000 × 4000 px.
// Камера показывает только часть карты, поэтому игроку есть куда
// исследовать и где строить оборону вдоль длинных дорог.
export const CELL_SIZE = 32
export const COLS = 125
export const ROWS = 125

export const INITIAL_GOLD = 160
export const INITIAL_LIVES = 20

// Настройки камеры: стартовый масштаб, пределы зума и скорость
// перемещения клавишами. Скорость указана в пикселях мира в секунду.
export const CAMERA_START_ZOOM = 1
export const CAMERA_MIN_ZOOM = 0.5
export const CAMERA_MAX_ZOOM = 2
export const CAMERA_PAN_SPEED = 900

// Сколько пикселей леса вокруг поля разрешено показать камере.
export const CAMERA_BOUNDS_MARGIN = CELL_SIZE * 4

export const FIRE_SPLASH_RADIUS = 55

export const ICE_SLOW_DURATION = 1500

export const HEALTH_BAR_WIDTH = 28
export const HEALTH_BAR_HEIGHT = 4
export const HEALTH_BAR_OFFSET = 19

export const ENEMY_SPAWN_INTERVAL = 800
export const WAVE_COMPLETION_REWARD = 25

// Пауза между волнами.
export const WAVE_BREAK_DURATION = 3000

export const MAX_TOWER_LEVEL = 5
export const TOWER_UPGRADE_COST_FACTOR = 0.6

// При продаже игрок получает 30% от всей вложенной в башню суммы
// (стоимость постройки плюс все улучшения).
export const TOWER_SELL_REFUND = 0.3
export const TOWER_DAMAGE_GROWTH = 0.3
export const TOWER_RANGE_GROWTH = 0.08
export const TOWER_ATTACK_SPEED_GROWTH = 0.9

export const WAVE_HP_GROWTH = 0.25
export const WAVE_SPEED_GROWTH = 0.018
export const WAVE_SPEED_GROWTH_CAP = 20

export type TowerType = 'ice' | 'fire' | 'earth'
export type EnemyType = 'scout' | 'brute' | 'sprinter' | 'boss'

export type TowerStats = {
	name: string
	cost: number
	range: number
	damage: number
	attackSpeed: number
	color: number
	image: string
}

export const TOWER_TYPES: Record<TowerType, TowerStats> = {
	ice: {
		name: 'Лёд',
		cost: 80,
		range: 140,
		damage: 10,
		attackSpeed: 600,
		color: 0x6D76CC,
		image: '/game/towers/ice.png'
	},
	fire: {
		name: 'Огонь',
		cost: 100,
		range: 130,
		damage: 55,
		attackSpeed: 900,
		color: 0xFF5722,
		image: '/game/towers/fire.png'
	},
	earth: {
		name: 'Земля',
		cost: 40,
		range: 140,
		damage: 45,
		attackSpeed: 1100,
		color: 0x8B5A2B,
		image: '/game/towers/earth.png'
	},
}

export type EnemyStats = {
	name: string
	baseHp: number
	baseSpeed: number
	reward: number
	radius: number
	color: number
}

export const ENEMY_TYPES: Record<EnemyType, EnemyStats> = {
	scout: {
		name: 'Разведчик',
		baseHp: 55,
		baseSpeed: 58,
		reward: 10,
		radius: 10,
		color: 0xe75b67,
	},
	brute: {
		name: 'Громила',
		baseHp: 130,
		baseSpeed: 34,
		reward: 18,
		radius: 14,
		color: 0x9d5de4,
	},
	sprinter: {
		name: 'Спринтер',
		baseHp: 38,
		baseSpeed: 92,
		reward: 15,
		radius: 8,
		color: 0xf59e57,
	},
	boss: {
		name: 'Босс',
		baseHp: 460,
		baseSpeed: 27,
		reward: 75,
		radius: 18,
		color: 0x263746,
	},
}

export const COLORS = {
	grass: 0xf8fbfd,
	path: 0xF2F8FE,
	enemyBorder: 0xffffff,
	health: 0x4593f8,
	healthBackground: 0xd5e7fc,
}
