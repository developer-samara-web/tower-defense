import jwt from 'jsonwebtoken'
import { connectDB } from '@/lib/db'
import User from '@/models/User'

const JWT_SECRET = 'tower-defense-secret-key-2026'

export async function POST(req: Request) {
	await connectDB()

	const auth = req.headers.get('authorization') || ''
	const token = auth.replace('Bearer ', '')

	try {
		const payload = jwt.verify(token, JWT_SECRET) as { userId: string }
		const { gold } = await req.json()

		const user = await User.findById(payload.userId)
		if (!user) return Response.json({ error: 'Not found' }, { status: 404 })

		if (gold > user.record) {
			user.record = gold
			await user.save()
		}

		return Response.json({ record: user.record })
	} catch {
		return Response.json({ error: 'Invalid token' }, { status: 401 })
	}
}
