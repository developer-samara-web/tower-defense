import { connectDB } from '@/lib/db'
import User from '@/models/User'

export async function GET() {
	await connectDB()

	const users = await User.find({})
		.select('-password')
		.sort({ record: -1 })
		.limit(8)

	const scores = users.map((u) => ({
		id: u._id.toString(),
		login: u.login,
		wave: Math.floor(u.record / 25) || 1,
		gold: u.record,
		createdAt: u.createdAt.toISOString(),
	}))

	return Response.json({ scores })
}
