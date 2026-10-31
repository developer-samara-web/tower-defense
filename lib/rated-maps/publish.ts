import mongoose from 'mongoose'

import { validateDraft } from '../../features/game/engine/map/custom-map.ts'
import { difficultyFromDraft, mapStars } from '../map-points.ts'
import { ratedMapDrafts } from './catalog.ts'

// Публикует каталог рейтинговых карт в библиотеку. Карта привязывается
// к владельцу и к своему id в реестре: seed = `rated:<id>`, поэтому
// повторный запуск обновляет запись, а не плодит дубликаты.
//
// По умолчанию скрипт не подключается к базе и ничего не пишет — он
// печатает план. Запись только с флагом --apply.
// Запуск: npm run rated-maps:publish -- <логин> [--apply]

const login = process.argv[2]
const apply = process.argv.includes('--apply')

if (!login) {
	console.error('Использование: npm run rated-maps:publish -- <логин> [--apply]')
	process.exit(1)
}

const plans = ratedMapDrafts().map(({ definition, draft }) => {
	const error = validateDraft(draft)
	if (error) {
		console.error(`Карта «${definition.name}» невалидна: ${error}`)
		process.exit(1)
	}

	// Сырая коллекция не пропускает валидаторы mongoose, а модель ограничивает
	// имя сорока символами.
	if (definition.name.length > 40) {
		console.error(`Имя «${definition.name}» длиннее 40 символов`)
		process.exit(1)
	}

	return {
		seed: `rated:${definition.id}`,
		name: definition.name,
		difficulty: definition.difficulty,
		previewColor: definition.previewColor,
		cols: draft.cols,
		rows: draft.rows,
		stars: mapStars(difficultyFromDraft(draft)),
		data: draft,
	}
})

console.log(`Владелец: ${login}`)
console.log(apply ? 'Режим: запись в базу' : 'Режим: предпросмотр (добавьте --apply для записи)')
console.log('')

for (const plan of plans) {
	console.log(
		`${plan.stars.toFixed(1)}★  ${plan.difficulty.padEnd(14)} ${plan.name.padEnd(24)}` +
			` ${plan.cols}×${plan.rows}  hp ${plan.data.castle?.hp ?? 0}  ${plan.seed}`,
	)
}

console.log(`\nкарт: ${plans.length}`)

if (!apply) {
	console.log('Ничего не записано. Для публикации: npm run rated-maps:publish -- <логин> --apply')
	process.exit(0)
}

const uri = process.env.MONGODB_URI

if (!uri) {
	console.error('MONGODB_URI не задан: скрипт запускается через npm run rated-maps:publish, он читает .env')
	process.exit(1)
}

await mongoose.connect(uri, { dbName: 'tower_defense' })

const db = mongoose.connection
const [owner] = await db.collection('users').find({ login }).limit(1).toArray()

if (!owner) {
	console.error(`Пользователь «${login}» не найден`)
	await mongoose.disconnect()
	process.exit(1)
}

// Модель GameMap под чистым node не импортируется: mongoose — CommonJS,
// его именованные экспорты не определить на этапе разбора. Поэтому
// коллекция берётся сырая, а имя сверяется с тем, что уже есть в базе,
// чтобы скрипт не завёл параллельную коллекцию вместо той, что читает приложение.
const names = (await db.listCollections()).map((entry) => entry.name)
const collectionName = names.find((name) => name.toLowerCase() === 'gamemaps') ?? 'gamemaps'
const maps = db.collection(collectionName)
const now = new Date()

for (const plan of plans) {
	await maps.findOneAndUpdate(
		{ userId: owner._id, seed: plan.seed },
		{
			$set: {
				userId: owner._id,
				name: plan.name,
				seed: plan.seed,
				cols: plan.cols,
				rows: plan.rows,
				difficulty: plan.difficulty,
				previewColor: plan.previewColor,
				data: plan.data,
				moderation: 'approved',
				rated: true,
				submittedAt: now,
				reviewedAt: now,
			},
			$setOnInsert: { _id: new mongoose.Types.ObjectId(), createdAt: now },
		},
		{ upsert: true },
	)
	console.log(`опубликовано: ${plan.name}`)
}

console.log(`\nколлекция «${collectionName}»`)
await mongoose.disconnect()
