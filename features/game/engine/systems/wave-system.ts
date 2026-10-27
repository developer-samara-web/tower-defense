import { WAVE_BREAK_DURATION } from '../../config/game.config'
import {
	enemySpawnInterval,
	waveCompletionReward,
	waveEnemyCount,
} from '../../domain/game-rules'
import type { GameContext } from '../game-context'
import { showWaveNotification } from '../ui/wave-notification'

// Отвечает за старт волн, паузу между ними и награду за прохождение.
export type WaveSystem = {
	requestStart: () => void
	update: (delta: number) => void
	checkComplete: () => void
}

export function createWaveSystem(ctx: GameContext): WaveSystem {
	// Запускает первую волну по команде игрока.
	// Последующие волны стартуют автоматически после короткой паузы.
	function requestStart() {
		if (ctx.state.wave > 0) return
		start()
	}

	// Отсчитывает паузу между волнами и запускает следующую волну.
	function update(delta: number) {
		const { state, setStatus } = ctx

		// Если пауза не запущена, ничего не делаем.
		if (state.waveBreakRemaining <= 0) return

		// Уменьшаем оставшееся время паузы.
		state.waveBreakRemaining -= delta

		// Время вышло — начинаем следующую волну.
		if (state.waveBreakRemaining <= 0) {
			state.waveBreakRemaining = 0
			start()
			return
		}

		// Показываем игроку, сколько осталось до следующей волны.
		const seconds = Math.ceil(state.waveBreakRemaining / 1000)
		const reward = waveCompletionReward(state.wave)

		setStatus(
			`Волна ${state.wave} пройдена! Бонус: ${reward} золота. ` +
				`Волна ${state.wave + 1} через ${seconds}…`,
		)
	}

	// Запускает новую волну врагов.
	function start() {
		const { scene, state, setStatus } = ctx

		// Запрещаем запуск волны одновременно с другой
		// и не разрешаем продолжать игру после поражения.
		if (state.waveActive || state.lives <= 0) return

		// Увеличиваем номер волны и отмечаем, что она началась.
		state.wave++
		state.waveActive = true

		// Сбрасываем паузу между волнами.
		state.waveBreakRemaining = 0

		showWaveNotification(scene, state.wave)

		// Рассчитываем количество врагов в зависимости от номера волны.
		state.spawnRemaining = waveEnemyCount(state.wave)

		// Сбрасываем счётчик созданных врагов для новой волны.
		state.spawnedInWave = 0

		// Первый враг появляется без дополнительной задержки.
		state.spawnCooldown = enemySpawnInterval(state.wave)

		setStatus(`Волна ${state.wave}: враги идут!`)
	}

	// Проверяет, уничтожены ли все враги текущей волны.
	function checkComplete() {
		const { state, setStatus } = ctx

		// Волна завершена, если она была запущена, все запланированные
		// враги уже появились и на карте не осталось активных врагов.
		if (
			state.waveActive &&
			state.spawnRemaining === 0 &&
			state.enemies.length === 0
		) {
			state.waveActive = false

			// Начисляем награду за успешное завершение волны.
			const reward = waveCompletionReward(state.wave)
			state.gold += reward

			// Запускаем паузу, после которой следующая волна начнётся сама.
			state.waveBreakRemaining = WAVE_BREAK_DURATION

			setStatus(
				`Волна ${state.wave} пройдена! Бонус: ${reward} золота. ` +
					`Волна ${state.wave + 1} через ${Math.ceil(WAVE_BREAK_DURATION / 1000)}…`,
			)
		}
	}

	return { requestStart, update, checkComplete }
}
