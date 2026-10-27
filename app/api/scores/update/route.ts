import { connectDB } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import User from '@/models/User'

export async function POST(req: Request) {
	await connectDB()

	const auth = req.headers.get('authorization') || ''
	const token = auth.replace('Bearer ', '')

	try {
		const payload = verifyToken(token)
		const { gold, wave } = await req.json()

		const nextGold = toCount(gold)
		const nextWave = toCount(wave)
		if (nextGold === null || nextWave === null) {
			return Response.json({ error: 'Некорректный результат' }, { status: 400 })
		}

		const user = await User.findById(payload.userId)
		if (!user) return Response.json({ error: 'Not found' }, { status: 404 })

		let changed = false

		if (nextGold > user.record) {
			user.record = nextGold
			changed = true
		}

		if (nextWave > (user.bestWave ?? 0)) {
			user.bestWave = nextWave
			changed = true
		}

		if (changed) await user.save()

		return Response.json({ record: user.record, bestWave: user.bestWave })
	} catch {
		return Response.json({ error: 'Invalid token' }, { status: 401 })
	}
}

function toCount(value: unknown) {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0
		? Math.trunc(value)
		: null
}
