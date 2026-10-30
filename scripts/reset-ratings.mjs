import mongoose from 'mongoose'

// Обнуляет рейтинг (record) всех игроков: старые значения набраны до правила
// «рейтинг только за рейтинговые карты».
// Запуск: npm run reset-ratings -- --yes
// Флаг --also-waves дополнительно обнуляет «пройдено волн» (bestWave).

const uri = process.env.MONGODB_URI

if (!uri) {
	console.error('MONGODB_URI не задан: скрипт запускается через npm run reset-ratings, он читает .env')
	process.exit(1)
}

const args = process.argv.slice(2)

if (!args.includes('--yes')) {
	console.error('Это изменит данные всех игроков. Подтвердите: npm run reset-ratings -- --yes')
	process.exit(1)
}

const alsoWaves = args.includes('--also-waves')
const update = alsoWaves ? { record: 0, bestWave: 0 } : { record: 0 }

await mongoose.connect(uri, { dbName: 'tower_defense' })

const result = await mongoose.connection.collection('users').updateMany({}, { $set: update })

console.log(
	`Рейтинг обнулён у ${result.modifiedCount} из ${result.matchedCount} игроков` +
		(alsoWaves ? ' вместе с пройденными волнами' : ''),
)

await mongoose.disconnect()
