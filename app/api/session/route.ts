import { connectDB } from '@/lib/db'
import { Session } from '@/models/Session'
import { verifyToken } from '@/lib/auth'
import { Types } from 'mongoose'

export async function POST(req: Request) {
	await connectDB()
	const auth = req.headers.get('authorization') || ''
	const token = auth.replace('Bearer ', '')

	try {
		const payload = verifyToken(token)
		const { mapSeed, gameState, stats } = await req.json()

		const session = await Session.findOneAndUpdate(
			{ userId: payload.userId },
			{
				mapSeed,
				gameState: JSON.stringify(gameState),
				stats: JSON.stringify(stats),
				lastSaved: new Date(),
			},
			{ upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
		)

		return Response.json({ sessionId: session._id.toString() })
	} catch {
		return Response.json({ error: 'Authentication failed' }, { status: 401 })
	}
}

export async function DELETE(req: Request) {
	await connectDB()
	const auth = req.headers.get('authorization') || ''
	const token = auth.replace('Bearer ', '')
	try {
		const payload = verifyToken(token)
		await Session.deleteOne({ userId: payload.userId })
		return Response.json({ deleted: true })
	} catch {
		return Response.json({ error: 'Authentication failed' }, { status: 401 })
	}
}

export async function GET(req: Request) {
	await connectDB()
	const auth = req.headers.get('authorization') || ''
	const token = auth.replace('Bearer ', '')
	const { searchParams } = new URL(req.url)
	const sessionId = searchParams.get('sessionId')

	try {
		const payload = verifyToken(token)

		if (sessionId === 'latest') {
			const session = await Session.findOne({ userId: payload.userId }).sort({ lastSaved: -1 })
			if (!session) return Response.json({ error: 'No session' }, { status: 404 })
			return Response.json({
				sessionId: session._id.toString(),
				mapSeed: session.mapSeed,
				gameState: JSON.parse(session.gameState),
				stats: JSON.parse(session.stats),
			})
		}

		if (!sessionId) return Response.json({ error: 'SessionId is required' }, { status: 400 })
		if (!Types.ObjectId.isValid(sessionId)) {
			return Response.json({ error: 'Session not found' }, { status: 404 })
		}

		// Чужую сессию по id читать нельзя.
		const session = await Session.findOne({
			_id: sessionId,
			userId: payload.userId,
		})
		if (!session) return Response.json({ error: 'Session not found' }, { status: 404 })

		return Response.json({
			sessionId: session._id.toString(),
			mapSeed: session.mapSeed,
			gameState: JSON.parse(session.gameState),
			stats: JSON.parse(session.stats),
		})
	} catch {
		return Response.json({ error: 'Authentication failed' }, { status: 401 })
	}
}
