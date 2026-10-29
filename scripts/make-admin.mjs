import mongoose from 'mongoose'

// Выдаёт аккаунту роль администратора: очередь модерации карт
// и назначение рейтинга видны только таким пользователям.
// Запуск: npm run make-admin -- <логин>

const login = process.argv[2]

if (!login) {
	console.error('Использование: npm run make-admin -- <логин>')
	process.exit(1)
}

const uri = process.env.MONGODB_URI

if (!uri) {
	console.error('MONGODB_URI не задан: скрипт запускается через npm run make-admin, он читает .env')
	process.exit(1)
}

await mongoose.connect(uri, { dbName: 'tower_defense' })

const result = await mongoose.connection
	.collection('users')
	.updateOne({ login }, { $set: { role: 'admin' } })

if (result.matchedCount === 0) {
	console.error(`Пользователь «${login}» не найден`)
	await mongoose.disconnect()
	process.exit(1)
}

console.log(`Пользователь «${login}» теперь администратор`)
await mongoose.disconnect()
