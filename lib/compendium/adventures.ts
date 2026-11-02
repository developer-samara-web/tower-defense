import { Types } from 'mongoose'

import { mapStarsOf } from '@/lib/map-summary'
import { RATED_MAPS } from '@/lib/rated-maps/catalog'
import { GameMap } from '@/models/GameMap'
import { MapScore } from '@/models/MapScore'
import {
	ADVENTURE_PASS_WAVE,
	ADVENTURE_PRIZES,
	type AdventureBoard,
	type AdventureNode,
	type AdventurePrizeView,
	isAdventurePassed,
	isGrandPrizeUnlocked,
} from './adventure-rules'

// Узлы и призы описаны в adventure-rules.ts: те же типы читает интерфейс,
// поэтому серверный сборщик не тянет mongoose в клиентский бандл.

type StoredCatalogMap = {
	_id: Types.ObjectId
	seed: string
	name: string
	difficulty?: string
	previewColor?: string
	data?: unknown
}

type StoredScore = {
	mapId: Types.ObjectId
	wave?: number
	points?: number
	plays?: number
}

// Тропа собирается по каталогу, а не по базе: карта ищется по своему сиду
// `rated:<id>`, поэтому порядок маршрута задаёт каталог, а не то, в каком
// виде записи легли в коллекцию.
export async function adventureBoard(userId: string): Promise<AdventureBoard> {
	const id = new Types.ObjectId(userId)
	const seeds = RATED_MAPS.map((map) => `rated:${map.id}`)

	// Каталог публикует один владелец, но в базе могла оказаться вторая
	// копия той же карты: берём самую раннюю запись, чтобы тропа у всех
	// игроков вела на одну и ту же карту.
	const docs = (await GameMap.find({
		seed: { $in: seeds },
		moderation: 'approved',
		rated: true,
	})
		.sort({ createdAt: 1 })
		.select('seed name difficulty previewColor data')
		.lean()) as unknown as StoredCatalogMap[]

	const bySeed = new Map<string, StoredCatalogMap>()
	for (const doc of docs) {
		if (!bySeed.has(doc.seed)) bySeed.set(doc.seed, doc)
	}

	const scores = (await MapScore.find({ userId: id, mapId: { $in: docs.map((doc) => doc._id) } })
		.select('mapId wave points plays')
		.lean()) as unknown as StoredScore[]
	const scoreByMap = new Map<string, StoredScore>()
	for (const score of scores) {
		scoreByMap.set(String(score.mapId), score)
	}

	const nodes: AdventureNode[] = RATED_MAPS.map((definition, index) => {
		const map = bySeed.get(`rated:${definition.id}`) ?? null
		const score = map ? (scoreByMap.get(map._id.toString()) ?? null) : null
		const bestWave = Number(score?.wave) || 0

		return {
			order: index + 1,
			catalogId: definition.id,
			mapId: map ? map._id.toString() : null,
			name: map?.name ?? definition.name,
			difficulty: map?.difficulty ?? definition.difficulty,
			previewColor: map?.previewColor ?? definition.previewColor,
			idea: definition.idea,
			// Неопубликованная карта оценена только словом сложности —
			// звёзды берём из него, как это делает библиотека.
			stars: mapStarsOf({
				data: map?.data ?? null,
				difficulty: map?.difficulty ?? definition.difficulty,
			}),
			passed: isAdventurePassed(bestWave),
			bestWave,
			bestPoints: Number(score?.points) || 0,
			plays: Number(score?.plays) || 0,
		}
	})

	const passed = nodes.filter((node) => node.passed).length
	const grandUnlocked = isGrandPrizeUnlocked(passed)

	const prizes: AdventurePrizeView[] = ADVENTURE_PRIZES.map((prize) => ({
		...prize,
		// Приз карты открыт, когда её карта пройдена; главный — за всю тропу.
		unlocked: prize.grand ? grandUnlocked : Boolean(nodes[prize.slot - 1]?.passed),
	}))

	return {
		nodes,
		passed,
		total: nodes.length,
		passWave: ADVENTURE_PASS_WAVE,
		prizes,
		grandUnlocked,
	}
}
