import { SelectedTowerInfo } from '@/types'
import { useState, useEffect, useRef, useCallback } from 'react'
import type { TowerType } from '@/features/game/config/game.config'
import { generateUpgradeCards, type UpgradeCard } from '@/features/game/domain/upgrade-cards'
import {
  createEmptyBuffs,
  initialResources,
  type TowerBuffs,
  xpToNextLevel,
} from '@/features/game/domain/game-rules'
import type { GameSnapshot } from '@/features/game/domain/game-state'
import {
  hasSessionProgress,
  toSessionGameState,
  type SessionPayload,
} from '@/features/game/domain/session-state'
import type { PlayerScore } from '@/features/account/types'
import { useAuth } from './useAuth'
import { saveSession, loadSession, deleteSession, fetchLatestSession } from '@/lib/services/session-service'
import { fetchTopScores, updateUserScore } from '@/lib/services/score-service'
import { recordGame } from '@/lib/services/game-service'

type GameState = {
  wave: number; gold: number; lives: number; enemies: number; selectedTower: TowerType | null
  selectedBuiltTower: SelectedTowerInfo | null; panelPosition: { x: number; y: number } | null
  status: string; waveActive: boolean; nextWaveIn: number; gameOver: boolean
  spawnRemaining: number; spawnedInWave: number; spawnCooldown: number; waveBreakRemaining: number
  towers: Array<{ id: string; x: number; y: number; type: TowerType }>
  enemyStates: Array<{ x: number; y: number }>
  towerCells: string[]; pathCells: string[]; waterCells: string[]
  viewport: { worldX: number; worldY: number; width: number; height: number; zoom: number } | null
  stats: { monstersKilled: number; buildingsBuilt: number; moneySpent: number; damageDealt: number }
  buffs: TowerBuffs
  level: number; xp: number; xpToNextLevel: number; pendingUpgrades: number
}

const initialState: GameState = {
  wave: 0, gold: initialResources.gold, lives: initialResources.lives, enemies: 0,
  selectedTower: null, selectedBuiltTower: null, panelPosition: null,
  status: 'Выбери башню и подготовь оборону', waveActive: false, nextWaveIn: 0, gameOver: false,
  spawnRemaining: 0, spawnedInWave: 0, spawnCooldown: 0, waveBreakRemaining: 0,
  towers: [], enemyStates: [], towerCells: [], pathCells: [], waterCells: [], viewport: null,
  stats: { monstersKilled: 0, buildingsBuilt: 0, moneySpent: 0, damageDealt: 0 },
  buffs: createEmptyBuffs(),
  level: 1, xp: 0, xpToNextLevel: xpToNextLevel(1), pendingUpgrades: 0,
}

function createMapSeed() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return Math.random().toString(36).slice(2)
}

export function useGame() {
  const { token, user } = useAuth()
  const [game, setGame] = useState<GameState>(initialState)
  const [upgradeCards, setUpgradeCards] = useState<UpgradeCard[]>([])
  const [scores, setScores] = useState<PlayerScore[]>([])
  const [checkedToken, setCheckedToken] = useState<string | null>(null)
  const [resuming, setResuming] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  // Токен читается из localStorage, которого нет на сервере: до монтирования
  // не показываем ветку «Загрузка…», иначе ломается гидратация.
  const [mounted, setMounted] = useState(false)
  // На сервере сид должен быть стабильным: randomUUID во время пререндера
  // считается нестабильным значением и ломает сборку /game.
  const [mapSeed, setMapSeed] = useState(() =>
    typeof window === 'undefined' ? 'default' : createMapSeed(),
  )
  const latestSnapshotRef = useRef<GameSnapshot | null>(null)
  const mapSeedRef = useRef(mapSeed)
  const cardsShownRef = useRef(false)
  const lastSavedRef = useRef('')
  // Одна завершённая игра должна попасть в историю ровно один раз.
  const gameRecordedRef = useRef(false)
  // Данные сохранённой игры нужны, если игрок начнёт новую вместо продолжения:
  // старый забег тоже закрывается и должен попасть в историю.
  const savedSessionRef = useRef<SessionPayload | null>(null)

  const checkingSession = mounted && Boolean(token) && checkedToken !== token

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  const refreshScores = useCallback(async () => {
    try {
      setScores(await fetchTopScores(8))
    } catch {
      // Турнирная таблица не должна мешать игре.
    }
  }, [])

  // Закрывает прерванный забег: игрок выбрал новую игру вместо продолжения.
  const recordAbandonedGame = useCallback(
    (payload: SessionPayload | null) => {
      const saved = payload?.gameState
      if (!token || !saved || !hasSessionProgress(saved)) return

      const stats = saved.stats ?? payload.stats

      void recordGame(token, {
        wave: Math.max(0, Math.trunc(saved.wave ?? 0)),
        gold: Math.max(0, Math.trunc(saved.gold ?? 0)),
        level: saved.level ?? 1,
        monstersKilled: stats?.monstersKilled ?? 0,
        buildingsBuilt: stats?.buildingsBuilt ?? 0,
        moneySpent: stats?.moneySpent ?? 0,
        damageDealt: stats?.damageDealt ?? 0,
      }).catch(() => {})
    },
    [token],
  )

  useEffect(() => {
    mapSeedRef.current = mapSeed
  }, [mapSeed])

  useEffect(() => {
    const handleState = (event: Event) => {
      const detail = (event as CustomEvent<GameSnapshot>).detail
      if (!detail) return

      latestSnapshotRef.current = detail

      // Новый уровень даёт выбор карточки. Пока игрок выбирает,
      // сцена стоит на паузе, чтобы бой не продолжался вслепую.
      if (!detail.gameOver && detail.pendingUpgrades > 0 && !cardsShownRef.current) {
        cardsShownRef.current = true
        setUpgradeCards(generateUpgradeCards(3, { wave: detail.wave }))
        window.dispatchEvent(new Event('td:pause'))
      }

      setGame((prev) => {
        if (detail.wave === 0 && prev.wave > 0) return prev
        return { ...prev, ...detail }
      })
    }
    const handleGameOver = (event: Event) => {
      const detail = (event as CustomEvent<Pick<{ wave: number; gold: number }, 'wave' | 'gold'>>).detail
      if (detail && Number.isFinite(detail.wave) && Number.isFinite(detail.gold)) {
        setGame((prev) => ({ ...prev, gameOver: true }))
        if (token) {
          if (!gameRecordedRef.current) {
            gameRecordedRef.current = true
            const snapshot = latestSnapshotRef.current
            void recordGame(token, {
              wave: Math.max(0, Math.trunc(detail.wave)),
              gold: Math.max(0, Math.trunc(detail.gold)),
              level: snapshot?.level ?? 1,
              monstersKilled: snapshot?.stats.monstersKilled ?? 0,
              buildingsBuilt: snapshot?.stats.buildingsBuilt ?? 0,
              moneySpent: snapshot?.stats.moneySpent ?? 0,
              damageDealt: snapshot?.stats.damageDealt ?? 0,
            }).catch(() => {})
          }
          updateUserScore(token, detail.gold, detail.wave)
            .then(() => refreshScores())
            .catch(() => {})
        }
      }
    }
    window.addEventListener('td:state', handleState)
    window.addEventListener('td:game-over', handleGameOver)
    return () => {
      window.removeEventListener('td:state', handleState)
      window.removeEventListener('td:game-over', handleGameOver)
    }
  }, [token, refreshScores])

  // Ищем сохранение до того, как автосейв получит право писать на сервер.
  useEffect(() => {
    if (!token) return

    let cancelled = false

    fetchLatestSession(token)
      .then((data) => {
        if (cancelled) return
        const saved = data.gameState
        const canResume = Boolean(data.sessionId)
          && Boolean(saved)
          && (saved?.lives ?? 0) > 0
          && hasSessionProgress(saved ?? {})

        if (canResume) {
          savedSessionRef.current = data
          setMapSeed(data.mapSeed || 'default')
          setSessionId(data.sessionId ?? null)
          setResuming(true)
        } else {
          savedSessionRef.current = null
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCheckedToken(token)
      })

    return () => {
      cancelled = true
    }
  }, [token])

  // Интервал не зависит от кадров игры: снимок читается из ref.
  useEffect(() => {
    if (!token || checkingSession || resuming) return

    const interval = setInterval(() => {
      const snapshot = latestSnapshotRef.current
      if (!snapshot || !hasSessionProgress(snapshot)) return

      const gameState = toSessionGameState(snapshot)
      const payload = {
        mapSeed: mapSeedRef.current,
        gameState,
        stats: gameState.stats,
      }
      const serialized = JSON.stringify(payload)
      if (serialized === lastSavedRef.current) return

      void saveSession(token, payload)
        .then(() => {
          lastSavedRef.current = serialized
        })
        .catch(() => {})
    }, 1000)

    return () => clearInterval(interval)
  }, [token, checkingSession, resuming])

  const resumeGame = useCallback(async () => {
    if (!sessionId || !token) return false

    try {
      const data = await loadSession(token, sessionId)
      const saved = data.gameState
      if (!saved) return false

      ;(window as unknown as Record<string, unknown>).__sessionData = data
      savedSessionRef.current = null
      latestSnapshotRef.current = null
      setUpgradeCards([])
      cardsShownRef.current = false
      gameRecordedRef.current = false

      const waveBreakRemaining = saved.waveBreakRemaining ?? (saved.nextWaveIn ?? 0) * 1000
      const level = saved.level ?? 1

      setGame({
        ...initialState,
        wave: saved.wave ?? 0,
        gold: saved.gold ?? initialState.gold,
        lives: saved.lives ?? initialState.lives,
        waveActive: saved.waveActive ?? false,
        status: saved.status ?? initialState.status,
        spawnRemaining: saved.spawnRemaining ?? 0,
        spawnedInWave: saved.spawnedInWave ?? 0,
        spawnCooldown: saved.spawnCooldown ?? 0,
        waveBreakRemaining,
        nextWaveIn: Math.ceil(waveBreakRemaining / 1000),
        selectedTower: saved.selectedTower ?? null,
        stats: saved.stats ?? initialState.stats,
        towerCells: (saved.towers ?? []).map((tower) => tower.id),
        level,
        xp: saved.xp ?? 0,
        xpToNextLevel: xpToNextLevel(level),
        pendingUpgrades: saved.pendingUpgrades ?? 0,
      })
      setMapSeed(data.mapSeed || 'default')
      setResuming(false)
      return true
    } catch {
      return false
    }
  }, [token, sessionId])

  const restartGame = useCallback(() => {
    latestSnapshotRef.current = null
    setUpgradeCards([])
    cardsShownRef.current = false
    gameRecordedRef.current = false
    setGame({ ...initialState, stats: initialState.stats })
    setMapSeed(createMapSeed())
    window.dispatchEvent(new CustomEvent('td:restart'))
  }, [])

  const startNew = useCallback(() => {
    recordAbandonedGame(savedSessionRef.current)
    savedSessionRef.current = null
    latestSnapshotRef.current = null
    setResuming(false)
    setSessionId(null)
    if (token) void deleteSession(token).catch(() => {})
    restartGame()
  }, [token, restartGame, recordAbandonedGame])

  const waveButtonDisabled = !game.gameOver && (game.waveActive || game.wave > 0)

  const selectTower = useCallback((towerId: TowerType) => {
    window.dispatchEvent(new CustomEvent('td:select-tower', { detail: { towerId } }))
  }, [])
  const startWave = useCallback(() => window.dispatchEvent(new CustomEvent('td:start-wave')), [])
  const upgradeTower = useCallback(() => window.dispatchEvent(new CustomEvent('td:upgrade-tower')), [])
  const sellTower = useCallback(() => window.dispatchEvent(new CustomEvent('td:sell-tower')), [])
  const deselectTower = useCallback(() => window.dispatchEvent(new CustomEvent('td:deselect-tower')), [])
  const pickUpgrade = useCallback((card: UpgradeCard) => {
    window.dispatchEvent(new CustomEvent('td:pick-upgrade', { detail: { card } }))
    setUpgradeCards([])
    cardsShownRef.current = false

    // Если уровней накопилось несколько, сразу показываем следующий выбор.
    const pending = latestSnapshotRef.current?.pendingUpgrades ?? 0
    if (pending > 0) {
      cardsShownRef.current = true
      setUpgradeCards(
        generateUpgradeCards(3, { wave: latestSnapshotRef.current?.wave ?? 0 }),
      )
    } else {
      window.dispatchEvent(new Event('td:resume'))
    }
  }, [])

  return {
    game, setGame, user,
    scores,
    upgradeCards,
    checkingSession, resuming, sessionId, mapSeed,
    restartGame, resumeGame, startNew,
    selectTower, startWave, upgradeTower, sellTower, deselectTower, pickUpgrade,
    waveButtonDisabled,
    refreshScores,
  }
}
