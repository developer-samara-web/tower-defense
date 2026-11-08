import { normalizeMapDraft, type MapDraft } from '@/features/game/engine/map/custom-map'
import { buildTowerFloorDraft } from '@/features/game/tower/tower-floor'
import { connectDB } from '@/lib/db'
import { TowerFloor } from '@/models/TowerFloor'

type FloorDocument = {
	data?: unknown
}

// Этаж создаётся при первом обращении и дальше отдаётся из базы.
// Черновик детерминирован, поэтому даже гонка двух первых запросов
// не даст разных карт: оба сгенерируют одинаковый этаж.
export async function ensureTowerFloor(floor: number): Promise<MapDraft> {
	await connectDB()

	const existing = (await TowerFloor.findOne({ floor }).lean()) as FloorDocument | null
	if (existing) {
		const draft = normalizeMapDraft(existing.data)
		if (draft) return draft

		// Повреждённую запись чиним один раз, чтобы этаж снова стал общим.
		const rebuilt =
			normalizeMapDraft(buildTowerFloorDraft(floor)) ?? buildTowerFloorDraft(floor)
		await TowerFloor.updateOne({ floor }, { $set: { data: rebuilt } })
		return rebuilt
	}

	// Новый этаж нормализуем до записи: тогда первый ответ и все
	// последующие отдают ровно одну и ту же карту.
	const draft = normalizeMapDraft(buildTowerFloorDraft(floor)) ?? buildTowerFloorDraft(floor)

	// $setOnInsert не перезаписывает уже сохранённый этаж: карта не должна
	// меняться у игроков, которые уже видели этот этаж.
	await TowerFloor.updateOne(
		{ floor },
		{ $setOnInsert: { floor, data: draft } },
		{ upsert: true },
	)

	return draft
}
