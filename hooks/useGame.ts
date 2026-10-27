import { SelectedTowerInfo } from '@/types'
import { useState, useEffect, useRef, useCallback } from 'react'
import type { TowerType } from '@/features/game/config/game.config'
import { generateUpgradeCards, type UpgradeCard } from '@/features/game/domain/upgrade-cards'
import { initialResources } from '@/features/game/domain/game-rules'
import type { GameSnapshot } from '@/features/game/domain/game-state'
import {
  hasSessionProgress,
  toSessionGameState,
} from '@/features/game/domain/session-state'
import type { PlayerScore } from '@/features/account/types'
import { useAuth } from './useAuth'
import { saveSession, loadSession, deleteSession, fetchLatestSession } from '@/lib/services/session-service'
import { fetchTopScores, updateUserScore } from '@/lib/services/score-service'

type GameState = {
  wave: number; gold: number; lives: number; enemies: number; selectedTower: TowerType | null
  selectedBuiltTower: SelectedTowerInfo | null; panelPosition: { x: number; y: number } | null
  status: string; waveActive: boolean; nextWaveIn: number; gameOver: boolean
  spawnRemaining: number; spawnedInWave: number; spawnCooldown: number; waveBreakRemaining: number
  towers: Array<{ id: string; x: number; y: number; type: TowerType }>
  towerCells: string[]; pathCells: string[]
  viewport: { worldX: number; worldY: number; width: number; height: number; zoom: number } | null
  stats: { monstersKilled: number; buildingsBuilt: number; moneySpent: number; damageDealt: number }
}

const initialState: GameState = {
  wave: 0, gold: initialResources.gold, lives: initialResources.lives, enemies: 0,
  selectedTower: null, selectedBuiltTower: null, panelPosition: null,
  status: 'Выбери башню и подготовь оборону', waveActive: false, nextWaveIn: 0, gameOver: false,
  spawnRemaining: 0, spawnedInWave: 0, spawnCooldown: 0, waveBreakRemaining: 0,
  towers: [], towerCells: [], pathCells: [], viewport: null,
  stats: { monstersKilled: 0, buildingsBuilt: 0, moneySpent: 0, damageDealt: 0 },
}

function createMapSeed() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return Math.random().toString(36).slice(2)
}

export function useGame() {
  const { token } = useAuth()
  const [game, setGame] = useState<GameState>(initialState)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [showGameMenu, setShowGameMenu] = useState(false)
  const [upgradeCards, setUpgradeCards] = useState<UpgradeCard[]>([])
  const [scores, setScores] = useState<PlayerScore[]>([])
  const [checkedToken, setCheckedToken] = useState<string | null>(null)
  const [resuming, setResuming] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  // На сервере сид должен быть стабильным: randomUUID во время пререндера
  // считается нестабильным значением и ломает сборку /game.
  const [mapSeed, setMapSeed] = useState(() =>
    typeof window === 'undefined' ? 'default' : createMapSeed(),
  )
  const latestSnapshotRef = useRef<GameSnapshot | null>(null)
  const mapSeedRef = useRef(mapSeed)
  const cardsShownRef = useRef(false)
  const lastSavedRef = useRef('')

  const checkingSession = Boolean(token) && checkedToken !== token

  const refreshScores = useCallback(async () => {
    try {
      setScores(await fetchTopScores(8))
    } catch {
      // Турнирная таблица не должна мешать игре.
    }
  }, [])

  useEffect(() => {
    mapSeedRef.current = mapSeed
  }, [mapSeed])

  useEffect(() => {
    const handleState = (event: Event) => {
      const detail = (event as CustomEvent<GameSnapshot>).detail
      if (!detail) return

      latestSnapshotRef.current = detail

      const isUpgradeWave = detail.wave > 0 && detail.wave % 5 === 0
      if (isUpgradeWave && !cardsShownRef.current) {
        cardsShownRef.current = true
        setUpgradeCards(generateUpgradeCards(3))
      } else if (!isUpgradeWave && cardsShownRef.current) {
        cardsShownRef.current = false
        setUpgradeCards([])
      }

      setGame((prev) => {
        if (detail.towers.length === 0 && prev.towers.length > 0) return prev
        if (detail.wave === 0 && prev.wave > 0) return prev
        return { ...prev, ...detail }
      })
    }
    const handleGameOver = (event: Event) => {
      const detail = (event as CustomEvent<Pick<{ wave: number; gold: number }, 'wave' | 'gold'>>).detail
      if (detail && Number.isFinite(detail.wave) && Number.isFinite(detail.gold)) {
        setGame((prev) => ({ ...prev, gameOver: true }))
        if (token) {
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
          setMapSeed(data.mapSeed || 'default')
          setSessionId(data.sessionId ?? null)
          setResuming(true)
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
      latestSnapshotRef.current = null

      const waveBreakRemaining = saved.waveBreakRemaining ?? (saved.nextWaveIn ?? 0) * 1000

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
    setGame({ ...initialState, stats: initialState.stats })
    setMapSeed(createMapSeed())
    window.dispatchEvent(new CustomEvent('td:restart'))
  }, [])

  const startNew = useCallback(() => {
    latestSnapshotRef.current = null
    setResuming(false)
    setSessionId(null)
    if (token) void deleteSession(token).catch(() => {})
    restartGame()
  }, [token, restartGame])

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
    cardsShownRef.current = true
  }, [])

  const toggleLeaderboard = useCallback(() => {
    const opening = !showLeaderboard
    setShowLeaderboard(opening)
    if (opening) {
      setShowInfo(false)
      void refreshScores()
    }
  }, [showLeaderboard, refreshScores])

  return {
    game, setGame,
    scores,
    showLeaderboard, setShowLeaderboard,
    showInfo, setShowInfo,
    showGameMenu, setShowGameMenu,
    upgradeCards,
    checkingSession, resuming, sessionId, mapSeed,
    restartGame, resumeGame, startNew,
    selectTower, startWave, upgradeTower, sellTower, deselectTower, pickUpgrade,
    waveButtonDisabled,
    closeLeaderboard: () => setShowLeaderboard(false),
    closeInfo: () => setShowInfo(false),
    openMenu: () => { setShowGameMenu(true); setShowInfo(false); setShowLeaderboard(false) },
    closeMenu: () => setShowGameMenu(false),
    toggleLeaderboard,
    toggleInfo: () => { setShowInfo(p => { const n = !p; if (n) setShowLeaderboard(false); return n }) },
  }
}
