import type { MapDraft } from '@/features/game/engine/map/custom-map'
import { readOk } from './api-error'

export type TowerProgress = {
	maxFloor: number
	coins: number
	nextReward: number
}

export type TowerFloorData = {
	floor: number
	draft: MapDraft
	reward: number
	completed: boolean
}

export type TowerCompletion = {
	maxFloor: number
	coins: number
	reward: number
	alreadyCompleted: boolean
}

// Прогресс башни: открытый этаж и валюта. Меню этажей не тянет карты,
// поэтому запрос лёгкий и его можно повторять при возврате из боя.
export async function fetchTowerProgress(token: string): Promise<TowerProgress> {
	const res = await fetch('/api/tower', {
		headers: { Authorization: 'Bearer ' + token },
	})

	return readOk<TowerProgress>(res, 'Не удалось загрузить прогресс башни')
}

// Черновик этажа приходит с сервера: он общий для всех игроков.
export async function fetchTowerFloor(
	token: string,
	floor: number,
): Promise<TowerFloorData> {
	const res = await fetch(`/api/tower/floor/${floor}`, {
		headers: { Authorization: 'Bearer ' + token },
	})

	return readOk<TowerFloorData>(res, 'Не удалось загрузить этаж')
}

// Победа на этаже: сервер открывает следующий и начисляет валюту.
export async function completeTowerFloor(
	token: string,
	floor: number,
): Promise<TowerCompletion> {
	const res = await fetch('/api/tower/complete', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: 'Bearer ' + token,
		},
		body: JSON.stringify({ floor }),
	})

	return readOk<TowerCompletion>(res, 'Не удалось засчитать прохождение этажа')
}
