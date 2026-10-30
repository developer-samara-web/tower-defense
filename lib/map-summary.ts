import {
	clampBoardSize,
	DEFAULT_COLS,
	DEFAULT_ROWS,
} from '@/features/game/config/game.config'
import type { MapDraft } from '@/features/game/engine/map/custom-map'
import { buildMapPreview } from '@/features/game/engine/map/map-preview'
import type { MapStatus, MapSummary } from '@/types'

export type StoredMap = {
	_id: { toString(): string }
	userId: { toString(): string }
	name: string
	seed: string
	cols?: number
	rows?: number
	difficulty?: string
	previewColor?: string
	createdAt: Date
	data?: unknown
	moderation?: string
	rated?: boolean
}

const MODERATION_STATUSES: MapStatus[] = ['draft', 'pending', 'approved', 'rejected']

export function readMapStatus(value: unknown): MapStatus {
	return MODERATION_STATUSES.includes(value as MapStatus)
		? (value as MapStatus)
		: 'draft'
}

export type MapSummaryContext = {
	// Кто смотрит список: по нему считается признак «моя карта».
	viewerId?: string | null
	authorLogin?: string | null
}

// Список карт не должен тянуть в браузер тысячи клеток леса,
// поэтому местность уезжает в уменьшенном превью 48×48.
export function toMapSummary(
	map: StoredMap,
	context: MapSummaryContext = {},
): MapSummary {
	const draft = readDraft(map.data)
	const castle = draft?.castle
	// Полная сетка клеток в список не попадает — вместо неё едет
	// уменьшенное превью, на котором видны лес, реки и дороги.
	const preview = draft ? buildMapPreview(draft) : null

	return {
		id: map._id.toString(),
		name: map.name,
		seed: map.seed,
		cols: map.cols ?? draft?.cols ?? DEFAULT_COLS,
		rows: map.rows ?? draft?.rows ?? DEFAULT_ROWS,
		difficulty: map.difficulty ?? 'Средняя',
		previewColor: map.previewColor ?? '#6b8e32',
		createdAt: map.createdAt.toISOString(),
		custom: Boolean(draft),
		castle: castle ? { x: castle.x, y: castle.y, hp: castle.hp } : null,
		spawners: (draft?.spawners ?? []).map(({ x, y }) => ({ x, y })),
		mine: Boolean(context.viewerId) && map.userId.toString() === context.viewerId,
		author: context.authorLogin ?? null,
		status: readMapStatus(map.moderation),
		rated: Boolean(map.rated),
		preview,
	}
}

export function readDraft(value: unknown): MapDraft | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null

	const draft = value as Partial<MapDraft>
	if (!Array.isArray(draft.spawners)) return null
	if (!Array.isArray(draft.waterCells) || !Array.isArray(draft.forestCells)) return null
	if (draft.roadCells !== undefined && !Array.isArray(draft.roadCells)) return null
	if (draft.castle && typeof draft.castle !== 'object') return null

	return {
		version: 1,
		cols: clampBoardSize(Number(draft.cols), DEFAULT_COLS),
		rows: clampBoardSize(Number(draft.rows), DEFAULT_ROWS),
		castle: draft.castle ?? null,
		spawners: draft.spawners,
		waterCells: draft.waterCells,
		forestCells: draft.forestCells,
		// Старые сохранения дорог не содержат — для них работает авто-маршрут.
		roadCells: draft.roadCells ?? [],
		waves: draft.waves ?? { useCommon: true, waves: [] },
	}
}
