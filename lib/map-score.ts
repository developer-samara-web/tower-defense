import { Types } from 'mongoose'

import { GameMap } from '@/models/GameMap'
import { MapScore } from '@/models/MapScore'
import User from '@/models/User'
import { playerRating, runPoints } from './map-points'
import { hasMapBoard, mapStarsOf } from './map-summary'
import type { MapBoardRow, MapLeaderboard, MapRunScore, PlayerBestMap } from '@/types'

// Рейтинг по конкретным картам — как топы битмапов в osu!. У карты есть
// звёзды сложности, каждый забег приносит очки, в топ карты попадает лишь
// лучший результат игрока, а общий рейтинг складывается из очков
// рейтинговых карт. Нерейтинговые одобренные карты тоже ведут свой топ,
// но в общий рейтинг игрока не входят.

export type MapScoreInput = {
	userId: string
	mapId: string
	wave: number
	gold: number
	lives: number
	maxLives: number
}

// Топ-100 карт, дальше очки в рейтинг не входят.
const RATING_AGGREGATE_LIMIT = 100
const BOARD_PAGE_MAX = 100
const BOARD_USER_FIELDS = 'login avatar avatarFrame title'

// Записать забег на карту: обновить рекорд игрока, пересчитать его общий
// рейтинг и вернуть место в топе. Возвращает null, если карты нет.
export async function recordMapScore(
	input: MapScoreInput,
): Promise<MapRunScore | null> {
	const mapId = new Types.ObjectId(input.mapId)
	const userId = new Types.ObjectId(input.userId)
	const map = await GameMap.findById(mapId).select('data difficulty moderation rated userId')
	if (!map) return null

	const stars = mapStarsOf(map)
	const points = runPoints({
		stars,
		wave: input.wave,
		lives: input.lives,
		maxLives: input.maxLives,
	})
	const board = hasMapBoard(map)

	// Карта без публикации доски не имеет: писать нечего, рейтинг не меняется.
	if (!board) {
		return {
			mapId: mapId.toString(),
			stars,
			points,
			best: 0,
			isBest: false,
			plays: 0,
			rank: 0,
			ratingPoints: await currentRating(userId),
			board: false,
		}
	}

	const rated = Boolean(map.rated)
	const achievedAt = new Date()
	let score = await MapScore.findOne({ mapId, userId })
	const isBest = points > (score?.points ?? 0)

	if (score) {
		score.plays += 1
		if (isBest) {
			score.points = points
			score.wave = input.wave
			score.gold = input.gold
			score.stars = stars
			score.rated = rated
			score.updatedAt = achievedAt
		}
		await score.save()
	} else {
		score = await MapScore.create({
			mapId,
			userId,
			points,
			wave: input.wave,
			gold: input.gold,
			stars,
			rated,
			plays: 1,
			updatedAt: achievedAt,
		})
	}

	const ratingPoints = await refreshUserRating(userId)
	// Место считается по строке рекорда: слабый повторный забег не должен
	// показывать место, которого игрок на самом деле не занимает.
	const rank = await scoreRank(mapId, score._id, score.points, score.updatedAt ?? achievedAt)

	return {
		mapId: mapId.toString(),
		stars,
		points,
		best: score.points,
		isBest,
		plays: score.plays,
		rank,
		ratingPoints,
		board,
	}
}

// Общий рейтинг игрока: сумма его лучших результатов по рейтинговым картам с
// затуханием по месту. Пишем в User, чтобы общий топ сортировался без
// агрегации на каждый запрос.
export async function refreshUserRating(userId: Types.ObjectId): Promise<number> {
	const rows = await MapScore.find({ userId, rated: true })
		.sort({ points: -1 })
		.limit(RATING_AGGREGATE_LIMIT)
		.select('points')
		.lean()

	const rating = playerRating(rows.map((row) => Number(row.points) || 0))
	await User.updateOne({ _id: userId }, { $set: { ratingPoints: rating } })

	return rating
}

export async function currentRating(userId: Types.ObjectId): Promise<number> {
	const found = await User.findById(userId).select('ratingPoints').lean()
	return Number(found?.ratingPoints) || 0
}

// Паспорт игрока для профиля: очки, место в общем топе и сколько рейтинговых
// карт закрыто. Место — сколько игроков набрало больше; при равенстве очков
// вперёд тот, кто раньше зафиксировал результат, поэтому считаем строго «больше».
export async function ratingSummary(userId: Types.ObjectId): Promise<RatingSummary> {
	const ratingPoints = await currentRating(userId)
	const [ahead, ratedMaps] = await Promise.all([
		User.countDocuments({ ratingPoints: { $gt: ratingPoints } }),
		MapScore.countDocuments({ userId, rated: true, points: { $gt: 0 } }),
	])

	return { ratingPoints, rank: ahead + 1, ratedMaps }
}

export type RatingSummary = {
	ratingPoints: number
	rank: number
	ratedMaps: number
}

// Топ карты: первые `limit` строк по очкам, плюс строка самого зрителя,
// даже если он далеко от подиума. Возвращает null, если карты нет или она
// ещё не опубликована и смотрит её не автор.
export async function getMapBoard(
	mapId: string,
	viewerId: string | null,
	limit = 50,
): Promise<MapLeaderboard | null> {
	const map = await GameMap.findById(mapId).select('name userId data difficulty moderation rated')
	if (!map) return null

	const board = hasMapBoard(map)
	if (!board && map.userId.toString() !== (viewerId ?? '')) return null

	const id = map._id as Types.ObjectId
	const filter = { mapId: id }
	const top = Math.min(Math.max(Math.trunc(limit) || 1, 1), BOARD_PAGE_MAX)

	const [docs, myDoc, total] = await Promise.all([
		board
			? MapScore.find(filter).sort({ points: -1, updatedAt: 1 }).limit(top).populate('userId', BOARD_USER_FIELDS).lean()
			: [],
		board && viewerId
			? MapScore.findOne({ ...filter, userId: new Types.ObjectId(viewerId) }).populate('userId', BOARD_USER_FIELDS).lean()
			: null,
		board ? MapScore.countDocuments(filter) : Promise.resolve(0),
	])

	const my = myDoc ? toBoardRow(myDoc as unknown as LeanScore) : null
	let rank = 0
	if (my) {
		rank = await scoreRank(id, (myDoc as unknown as { _id: Types.ObjectId })._id, my.points, new Date(my.achievedAt))
	}

	return {
		mapId: id.toString(),
		name: map.name,
		stars: mapStarsOf(map),
		rated: Boolean(map.rated),
		board,
		total,
		entries: docs.map((doc) => toBoardRow(doc as unknown as LeanScore)),
		my: my ? { ...my, rank } : null,
	}
}

// Лучшие карты игрока: по одному рекорду с карты, упорядочены по очкам.
// Так же osu! показывает top plays в профиле.
export async function getBestMaps(userId: string, limit = 8): Promise<PlayerBestMap[]> {
	const id = new Types.ObjectId(userId)
	const top = Math.min(Math.max(Math.trunc(limit) || 1, 1), BOARD_PAGE_MAX)

	const docs = await MapScore.find({ userId: id })
		.sort({ points: -1, updatedAt: 1 })
		.limit(top)
		.select('mapId points wave stars plays updatedAt createdAt')
		.lean()

	// Название и текущий флаг карты берём одним запросом: populate в lean-
	// выборке типы не выводит, а без имени карту в профиле показать нечем.
	const refs = docs.map((doc) => doc.mapId)
	const maps = await GameMap.find({ _id: { $in: refs } }).select('name rated').lean()
	const byId = new Map(maps.map((map) => [map._id.toString(), map]))

	return docs.flatMap((doc) => {
		const map = byId.get(String(doc.mapId))
		if (!map) return []
		const raw = doc.updatedAt ?? doc.createdAt
		const achievedAt = raw instanceof Date ? raw : new Date(String(raw))
		return [{
			mapId: map._id.toString(),
			name: map.name,
			stars: Number(doc.stars) || 0,
			points: Number(doc.points) || 0,
			wave: Number(doc.wave) || 0,
			plays: Number(doc.plays) || 1,
			rated: Boolean(map.rated),
			achievedAt: achievedAt.toISOString(),
		}]
	})
}

// Удалять доску вместе с картой: иначе очки мёртвой карты навсегда останутся
// в общем рейтинге игроков, а рекорды висеть в коллекции без владельца.
export async function dropMapBoard(mapId: string): Promise<void> {
	const id = new Types.ObjectId(mapId)
	const owners = await MapScore.find({ mapId: id }).select('userId').lean()
	await MapScore.deleteMany({ mapId: id })

	const users = Array.from(new Set(owners.map((row) => String(row.userId))))
	await Promise.all(users.map((userId) => refreshUserRating(new Types.ObjectId(userId))))
}

// Документы из `.lean()` приходят безымянным объектом, поэтому поля читаем
// через приведение к словарю.
type LeanScore = Record<string, unknown>

function toBoardRow(doc: LeanScore): MapBoardRow {
	const user = doc.userId as
		| { _id: Types.ObjectId; login?: string; avatar?: string; avatarFrame?: string; title?: string }
		| null
	const raw = doc.updatedAt ?? doc.createdAt
	const achievedAt = raw instanceof Date ? raw : new Date(String(raw))

	return {
		userId: user?._id?.toString() ?? String(doc.userId ?? ''),
		login: user?.login ?? '—',
		avatar: user?.avatar ?? '',
		avatarFrame: user?.avatarFrame ?? '',
		title: user?.title ?? 'none',
		points: Number(doc.points) || 0,
		wave: Number(doc.wave) || 0,
		gold: Number(doc.gold) || 0,
		stars: Number(doc.stars) || 0,
		plays: Number(doc.plays) || 1,
		rated: Boolean(doc.rated),
		achievedAt: achievedAt.toISOString(),
	}
}

// Место в топе: столько же очков, но результат зафиксирован раньше, стоит
// выше — как в osu!, где повторный рекорд не обгоняет первого достигшего.
async function scoreRank(
	mapId: Types.ObjectId,
	scoreId: unknown,
	points: number,
	achievedAt: Date,
): Promise<number> {
	if (points <= 0) return 0

	const ahead = await MapScore.countDocuments({
		_id: { $ne: scoreId },
		mapId,
		$or: [
			{ points: { $gt: points } },
			{ points, updatedAt: { $lt: achievedAt } },
		],
	})

	return ahead + 1
}
