import { useCallback, useEffect, useState } from 'react'

import {
	fetchTowerProgress,
	type TowerProgress,
} from '@/lib/services/tower-service'
import { useAuth } from './useAuth'

// Прогресс башни: открытый этаж и валюта. Экран этажей обновляет его
// после возвращения из боя, поэтому загрузка вынесена в отдельный хук.
export function useTower() {
	const { token, checked } = useAuth()
	const [progress, setProgress] = useState<TowerProgress | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')

	const load = useCallback(async () => {
		if (!token) {
			setLoading(false)
			return
		}

		setLoading(true)
		setError('')

		try {
			setProgress(await fetchTowerProgress(token))
		} catch (loadError) {
			setError(
				loadError instanceof Error
					? loadError.message
					: 'Не удалось загрузить башню',
			)
		} finally {
			setLoading(false)
		}
	}, [token])

	useEffect(() => {
		if (!checked) return
		// eslint-disable-next-line react-hooks/set-state-in-effect
		void load()
	}, [checked, load])

	return { progress, loading, error, refresh: load }
}
