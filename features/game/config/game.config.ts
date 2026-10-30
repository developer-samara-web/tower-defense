// Баланс игры настраивается в `.env.game` в корне проекта. Файл не входит
// в стандартный список Next.js, поэтому его читает `next.config.ts` и
// подмешивает значения в `env` сборки. Next заменяет обращ вида
// `process.env.ИМЯ` литералом во время сборки: деструктуризация и динамические
// ключи не работают, поэтому каждый параметр читается отдельной строкой.
// После правки `.env.game` нужен перезапуск дев-сервера.
// Значение по умолчанию оставляем прямо здесь: без файла или с опечаткой
// в числе игра собирается на базовом балансе.
function balance(value: string | undefined, fallback: number): number {
	if (value === undefined) return fallback
	const parsed = Number(String(value).trim().replace(',', '.'))
	return Number.isFinite(parsed) ? parsed : fallback
}

// Мир 60 × 60 клеток по 32 px = 1920 × 1920 px.
// Камера показывает только часть карты, поэтому игроку есть куда
// исследовать и где строить оборону вдоль дорог.
export const CELL_SIZE = 32

// Пользовательские карты бывают меньше или крупнее, поэтому COLS/ROWS —
// живой размер текущего поля, а не константа.
export const BOARD_SIZE_MIN = 40
export const BOARD_SIZE_MAX = 150
export const BOARD_SIZE_STEP = 5

// Базовый размер поля: новые случайные и пользовательские карты.
export const DEFAULT_COLS = clampBoardSize(
	balance(process.env.NEXT_PUBLIC_TD_DEFAULT_COLS, 60),
	60,
)
export const DEFAULT_ROWS = clampBoardSize(
	balance(process.env.NEXT_PUBLIC_TD_DEFAULT_ROWS, 60),
	60,
)

export let COLS = DEFAULT_COLS
export let ROWS = DEFAULT_ROWS

// Движок читает COLS/ROWS напрямую, поэтому сцену нужно перевести на
// размер карты до первого рисования. Вне сцены (сервер, превью) размер
// берут из самих данных карты.
export function setBoardSize(cols: number, rows: number) {
	COLS = clampBoardSize(cols, DEFAULT_COLS)
	ROWS = clampBoardSize(rows, DEFAULT_ROWS)
}

export function resetBoardSize() {
	setBoardSize(DEFAULT_COLS, DEFAULT_ROWS)
}

export function clampBoardSize(value: number, fallback: number) {
	if (!Number.isFinite(value)) return fallback
	return Math.min(BOARD_SIZE_MAX, Math.max(BOARD_SIZE_MIN, Math.round(value)))
}

export const INITIAL_GOLD = balance(process.env.NEXT_PUBLIC_TD_INITIAL_GOLD, 200)
export const INITIAL_LIVES = balance(process.env.NEXT_PUBLIC_TD_INITIAL_LIVES, 20)

// Настройки камеры: стартовый масштаб, пределы зума и скорость
// перемещения клавишами. Скорость указана в пикселях мира в секунду.
export const CAMERA_START_ZOOM = 1
export const CAMERA_MIN_ZOOM = 0.5
export const CAMERA_MAX_ZOOM = 2
export const CAMERA_PAN_SPEED = 900

// Сколько пикселей леса вокруг поля разрешено показать камере.
export const CAMERA_BOUNDS_MARGIN = CELL_SIZE * 4

// Ступени ускорения боя: кнопка в HUD проходит по ним по кругу.
// Множитель применяется к игровому времени, камера остаётся в реальном.
export const GAME_SPEED_STEPS = [1, 2, 3]

export const FIRE_SPLASH_RADIUS = 55

export const ICE_SLOW_DURATION = 1500

// Модификаторы атаки из карточек улучшений.
export const BURN_DURATION = 3000
export const CHAIN_RADIUS = 100
export const CHAIN_DAMAGE_FACTOR = 0.6
export const CRIT_MULTIPLIER = 2

export const HEALTH_BAR_WIDTH = 28
export const HEALTH_BAR_HEIGHT = 4
export const HEALTH_BAR_OFFSET = 19

// Волна начинается с 10 врагов, и с каждой волной их становится больше.
export const ENEMY_COUNT_BASE = balance(
	process.env.NEXT_PUBLIC_TD_ENEMY_COUNT_BASE,
	10,
)
export const ENEMY_COUNT_PER_WAVE = balance(
	process.env.NEXT_PUBLIC_TD_ENEMY_COUNT_PER_WAVE,
	2,
)

// Враги идут группами: внутри группы они появляются почти одновременно,
// а между группами выдерживается пауза, чтобы игрок успевал реагировать.
export const ENEMY_GROUP_SIZE_BASE = balance(
	process.env.NEXT_PUBLIC_TD_ENEMY_GROUP_SIZE_BASE,
	3,
)
export const ENEMY_GROUP_SIZE_MAX = balance(
	process.env.NEXT_PUBLIC_TD_ENEMY_GROUP_SIZE_MAX,
	6,
)
export const ENEMY_GROUP_SIZE_WAVES_PER_STEP = balance(
	process.env.NEXT_PUBLIC_TD_ENEMY_GROUP_SIZE_WAVES_PER_STEP,
	4,
)
export const ENEMY_GROUP_SPAWN_INTERVAL = balance(
	process.env.NEXT_PUBLIC_TD_ENEMY_GROUP_SPAWN_INTERVAL,
	140,
)

// Пауза перед новой группой сокращается, но не сильнее нижнего предела.
export const ENEMY_SPAWN_INTERVAL = balance(
	process.env.NEXT_PUBLIC_TD_ENEMY_SPAWN_INTERVAL,
	950,
)
export const ENEMY_SPAWN_INTERVAL_STEP = balance(
	process.env.NEXT_PUBLIC_TD_ENEMY_SPAWN_INTERVAL_STEP,
	20,
)
export const ENEMY_SPAWN_INTERVAL_MIN = balance(
	process.env.NEXT_PUBLIC_TD_ENEMY_SPAWN_INTERVAL_MIN,
	380,
)

// Награда за пройденную волну растёт вместе с номером волны.
export const WAVE_COMPLETION_BASE_REWARD = balance(
	process.env.NEXT_PUBLIC_TD_WAVE_COMPLETION_BASE_REWARD,
	15,
)
export const WAVE_COMPLETION_REWARD_PER_WAVE = balance(
	process.env.NEXT_PUBLIC_TD_WAVE_COMPLETION_REWARD_PER_WAVE,
	4,
)

// Пауза между врагами в пользовательской карте: казармы выпускают
// монстров ровным потоком, без деления на группы.
export const CUSTOM_ENEMY_SPAWN_INTERVAL = balance(
	process.env.NEXT_PUBLIC_TD_CUSTOM_ENEMY_SPAWN_INTERVAL,
	700,
)

// Пауза между волнами.
export const WAVE_BREAK_DURATION = balance(
	process.env.NEXT_PUBLIC_TD_WAVE_BREAK_DURATION,
	3000,
)

export const MAX_TOWER_LEVEL = balance(
	process.env.NEXT_PUBLIC_TD_MAX_TOWER_LEVEL,
	5,
)
export const TOWER_UPGRADE_COST_FACTOR = balance(
	process.env.NEXT_PUBLIC_TD_TOWER_UPGRADE_COST_FACTOR,
	0.6,
)

// При продаже игрок получает 30% от всей вложенной в башню суммы
// (стоимость постройки плюс все улучшения).
export const TOWER_SELL_REFUND = balance(
	process.env.NEXT_PUBLIC_TD_TOWER_SELL_REFUND,
	0.3,
)
export const TOWER_DAMAGE_GROWTH = balance(
	process.env.NEXT_PUBLIC_TD_TOWER_DAMAGE_GROWTH,
	0.3,
)
export const TOWER_RANGE_GROWTH = balance(
	process.env.NEXT_PUBLIC_TD_TOWER_RANGE_GROWTH,
	0.08,
)
export const TOWER_ATTACK_SPEED_GROWTH = balance(
	process.env.NEXT_PUBLIC_TD_TOWER_ATTACK_SPEED_GROWTH,
	0.9,
)

// Здоровье растёт линейно, скорость — медленнее и с потолком,
// чтобы поздние волны не превращались в гонку за пикселями.
export const WAVE_HP_GROWTH = balance(process.env.NEXT_PUBLIC_TD_WAVE_HP_GROWTH, 0.18)
export const WAVE_SPEED_GROWTH = balance(
	process.env.NEXT_PUBLIC_TD_WAVE_SPEED_GROWTH,
	0.012,
)
export const WAVE_SPEED_GROWTH_CAP = balance(
	process.env.NEXT_PUBLIC_TD_WAVE_SPEED_GROWTH_CAP,
	50,
)
export const WAVE_REWARD_GROWTH = balance(
	process.env.NEXT_PUBLIC_TD_WAVE_REWARD_GROWTH,
	0.04,
)

// Опыт за убийство тоже растёт с номером волны.
export const XP_WAVE_GROWTH = balance(process.env.NEXT_PUBLIC_TD_XP_WAVE_GROWTH, 0.12)

// Сколько опыта нужно для перехода с уровня N на N+1.
// Квадратичная добавка замедляет уровни в середине игры.
export const LEVEL_XP_BASE = balance(process.env.NEXT_PUBLIC_TD_LEVEL_XP_BASE, 80)
export const LEVEL_XP_STEP = balance(process.env.NEXT_PUBLIC_TD_LEVEL_XP_STEP, 80)
export const LEVEL_XP_SQUARE = balance(process.env.NEXT_PUBLIC_TD_LEVEL_XP_SQUARE, 20)
export const MAX_PENDING_UPGRADES = balance(
	process.env.NEXT_PUBLIC_TD_MAX_PENDING_UPGRADES,
	5,
)

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
		cost: balance(process.env.NEXT_PUBLIC_TD_ICE_COST, 80),
		range: balance(process.env.NEXT_PUBLIC_TD_ICE_RANGE, 140),
		damage: balance(process.env.NEXT_PUBLIC_TD_ICE_DAMAGE, 10),
		attackSpeed: balance(process.env.NEXT_PUBLIC_TD_ICE_ATTACK_SPEED, 600),
		color: 0x6D76CC,
		image: '/game/towers/ice.png'
	},
	fire: {
		name: 'Огонь',
		cost: balance(process.env.NEXT_PUBLIC_TD_FIRE_COST, 100),
		range: balance(process.env.NEXT_PUBLIC_TD_FIRE_RANGE, 130),
		damage: balance(process.env.NEXT_PUBLIC_TD_FIRE_DAMAGE, 55),
		attackSpeed: balance(process.env.NEXT_PUBLIC_TD_FIRE_ATTACK_SPEED, 900),
		color: 0xFF5722,
		image: '/game/towers/fire.png'
	},
	earth: {
		name: 'Земля',
		cost: balance(process.env.NEXT_PUBLIC_TD_EARTH_COST, 40),
		range: balance(process.env.NEXT_PUBLIC_TD_EARTH_RANGE, 140),
		damage: balance(process.env.NEXT_PUBLIC_TD_EARTH_DAMAGE, 45),
		attackSpeed: balance(process.env.NEXT_PUBLIC_TD_EARTH_ATTACK_SPEED, 1100),
		color: 0x8B5A2B,
		image: '/game/towers/earth.png'
	},
}

// Панель стройки и клавиши 1–3 идут от дешёвой башни к дорогой,
// поэтому самый доступный «Земля» всегда первый.
export const TOWER_ORDER: TowerType[] = (
	Object.entries(TOWER_TYPES) as [TowerType, TowerStats][]
).sort(([, a], [, b]) => a.cost - b.cost).map(([id]) => id)

export type EnemyStats = {
	name: string
	baseHp: number
	baseSpeed: number
	reward: number
	xp: number
	radius: number
	color: number
}

// Награды за монстра специально держатся ниже: золото и опыт капает
// медленнее, чем раньше, чтобы оборона дороже стоила на длинной волне.
export const ENEMY_TYPES: Record<EnemyType, EnemyStats> = {
	scout: {
		name: 'Разведчик',
		baseHp: balance(process.env.NEXT_PUBLIC_TD_SCOUT_HP, 55),
		baseSpeed: balance(process.env.NEXT_PUBLIC_TD_SCOUT_SPEED, 77),
		reward: balance(process.env.NEXT_PUBLIC_TD_SCOUT_REWARD, 6),
		xp: balance(process.env.NEXT_PUBLIC_TD_SCOUT_XP, 5),
		radius: 10,
		color: 0xe75b67,
	},
	brute: {
		name: 'Громила',
		baseHp: balance(process.env.NEXT_PUBLIC_TD_BRUTE_HP, 130),
		baseSpeed: balance(process.env.NEXT_PUBLIC_TD_BRUTE_SPEED, 48),
		reward: balance(process.env.NEXT_PUBLIC_TD_BRUTE_REWARD, 11),
		xp: balance(process.env.NEXT_PUBLIC_TD_BRUTE_XP, 9),
		radius: 14,
		color: 0x9d5de4,
	},
	sprinter: {
		name: 'Спринтер',
		baseHp: balance(process.env.NEXT_PUBLIC_TD_SPRINTER_HP, 38),
		baseSpeed: balance(process.env.NEXT_PUBLIC_TD_SPRINTER_SPEED, 121),
		reward: balance(process.env.NEXT_PUBLIC_TD_SPRINTER_REWARD, 9),
		xp: balance(process.env.NEXT_PUBLIC_TD_SPRINTER_XP, 7),
		radius: 8,
		color: 0xf59e57,
	},
	boss: {
		name: 'Босс',
		baseHp: balance(process.env.NEXT_PUBLIC_TD_BOSS_HP, 460),
		baseSpeed: balance(process.env.NEXT_PUBLIC_TD_BOSS_SPEED, 37),
		reward: balance(process.env.NEXT_PUBLIC_TD_BOSS_REWARD, 45),
		xp: balance(process.env.NEXT_PUBLIC_TD_BOSS_XP, 32),
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
