import { Types } from 'mongoose'

import { GameMap } from '@/models/GameMap'

// Рейтинг начисляется только за забеги на карте, которую администратор
// отметил рейтинговой и опубликовал. Клиенту не верим: карту проверяем в БД.
export async function isRatedMap(mapId: unknown): Promise<boolean> {
	if (typeof mapId !== 'string' || !Types.ObjectId.isValid(mapId)) return false

	const found = await GameMap.exists({
		_id: new Types.ObjectId(mapId),
		moderation: 'approved',
		rated: true,
	})

	return Boolean(found)
}
