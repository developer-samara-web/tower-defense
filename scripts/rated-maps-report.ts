// Отчёт по балансу рейтинговых карт: собираем черновики, проверяем их
// движком и считаем звёзды/горизонт. Запуск:
//   node --experimental-strip-types scripts/rated-maps-report.ts
import { INITIAL_GOLD } from '../features/game/config/game.config.ts'
import { normalizeMapDraft, validateDraft } from '../features/game/engine/map/custom-map.ts'
import { difficultyFromDraft, mapStars } from '../lib/map-points.ts'
import { buildSlots } from '../lib/rated-maps/layout.ts'
import { analyzeMap, baseCurve } from '../lib/rated-maps/balance.ts'
import { ratedMapDrafts } from '../lib/rated-maps/catalog.ts'

const fix = (value: number, digits = 2) => value.toFixed(digits)
const inBand = (value: number, band: [number, number]) =>
	value >= band[0] && value <= band[1]

const rows: string[] = []
let failures = 0

// Планка силы на стартовом золоте и требовательность базовой волны —
// по этим числам подбираем состав казарм.
for (const cells of [30, 60, 120]) {
	const curve = baseCurve(cells, INITIAL_GOLD)
	const line = [1, 2, 3, 5, 10, 20, 30, 40, 50, 60, 70, 80]
		.map((wave) => {
			const stream = curve.streams[wave - 1]!
			return `w${wave}:${fix(stream.demandDps, 1)}/${fix(curve.power(curve.gold[wave - 1]!), 1)}`
		})
		.join(' ')
	console.log(`эталон route=${cells} `.padEnd(16) + line)
}
console.log('')

for (const { definition, draft: raw } of ratedMapDrafts()) {
	const draft = normalizeMapDraft(raw)
	if (!draft) throw new Error(`${definition.id}: черновик не прошёл нормализацию`)

	const error = validateDraft(draft)
	const stars = mapStars(difficultyFromDraft(draft))
	const report = analyzeMap(draft, INITIAL_GOLD)
	const slots = buildSlots(draft, 4)
	const first = report.stream(1)

	if (error || !inBand(stars, definition.targetStars) || !inBand(report.horizon, definition.targetHorizon))
		failures++

	rows.push(
		[
			definition.id.padEnd(16),
			`${fix(stars, 1)}★ / ${definition.targetStars[0]}–${definition.targetStars[1]}`.padEnd(22),
			`${String(report.horizon).padStart(2)} / ${definition.targetHorizon[0]}–${definition.targetHorizon[1]}`.padEnd(14),
			`route ${String(report.pathCells).padStart(3)}`.padEnd(11),
			`slots ${String(Math.round(slots)).padStart(3)}`.padEnd(11),
			`w1 ${String(first.units).padStart(2)}u ${String(first.hp).padStart(4)}hp d=${fix(first.demandDps, 1)} cap=${fix(report.power(INITIAL_GOLD), 1)}`.padEnd(38),
			`early ${fix(report.earlyRatio)}`.padEnd(12),
			`jump ${fix(report.maxJump)}`.padEnd(11),
			`gap ${String(report.typeGap).padStart(2)}`.padEnd(7),
			`w${String(draft.waves?.waves.length ?? 0).padStart(2)} sp${draft.spawners.length}`.padEnd(9),
			error ?? '',
		].join(' '),
	)
}

console.log(rows.join('\n'))
console.log(`\nкарт: ${rows.length}, вне коридора или невалидных: ${failures}`)
