// Правила бесконечной башни без движка карт: их читает и сервер, и меню.
// Отдельный файл не тянет в клиентский бандл генератор поля и поиск пути.
export const TOWER_FLOOR_COLS = 40
export const TOWER_FLOOR_ROWS = 40
export const TOWER_FLOOR_WAVES = 15

// Боссы стоят только на этих волнах: десятая и финальная пятнадцатая.
export const TOWER_BOSS_WAVES: readonly number[] = [10, 15]

// Сид этажа: по нему восстанавливается черновик, если запись потерялась.
export function towerFloorSeed(floor: number) {
	return `tower:${Math.max(1, Math.trunc(floor))}`
}

// Валюта за первое прохождение этажа. Растёт линейно: каждый следующий
// этаж дороже, но и награда выше.
export function towerFloorReward(floor: number) {
	const safeFloor = Math.max(1, Math.trunc(floor))
	return 50 + (safeFloor - 1) * 25
}

// Награда за повторное прохождение не начисляется: этаж уже открыт,
// а бесконечно фармить одну и ту же карту нельзя.
export function isTowerFloorCompleted(floor: number, maxFloor: number) {
	return Math.trunc(floor) < Math.max(1, Math.trunc(maxFloor))
}
