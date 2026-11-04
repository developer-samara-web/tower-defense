import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { GAME_SPEED_STEPS, type TowerType } from '@/features/game/config/game.config'
import { generateUpgradeCards, UPGRADE_CHOICES, upgradeRerollCost, type UpgradeCard } from '@/features/game/domain/upgrade-cards'
import {
  createEmptyBuffs,
  initialResources,
  towerFootprintKeys,
  type QueuedBuild,
  type TowerBuffs,
  type TowerSelectionSummary,
  xpToNextLevel,
} from '@/features/game/domain/game-rules'
import type { GameSnapshot } from '@/features/game/domain/game-state'
import type { MapDraft } from '@/features/game/engine/map/custom-map'
import {
  hasSessionProgress,
  toSessionGameState,
  type SessionPayload,
} from '@/features/game/domain/session-state'
import type { LivePlayerScore, PlayerScore } from '@/features/account/types'
import type { MapBoardRowView, MapLeaderboard } from '@/types'
import { runPoints } from '@/lib/map-points'
import { TUTORIAL_WAVES, buildTutorialDraft } from '@/lib/tutorial/tutorial-map'
import { useAuth } from './useAuth'
import { saveSession, loadSession, deleteSession, fetchLatestSession } from '@/lib/services/session-service'
import { fetchMap, fetchMapBoard } from '@/lib/services/map-service'
import { fetchTopScores, updateUserScore } from '@/lib/services/score-service'
import { markProgress } from '@/lib/services/progress-service'
import { recordGame } from '@/lib/services/game-service'
import { ApiError, isUnauthorized } from '@/lib/services/api-error'
import { NOT_AUTHORIZED } from '@/lib/access-messages'

type GameState = {
  wave: number; gold: number; lives: number; maxLives: number; enemies: number; selectedTower: TowerType | null
  selection: TowerSelectionSummary | null; panelPosition: { x: number; y: number } | null
  status: string; waveActive: boolean; nextWaveIn: number; gameOver: boolean
  // Пройдены все волны урока: у обычной игры лимит нулевой, поэтому флаг
  // всегда false и оверлей обучения не показывается.
  victory: boolean
  spawnRemaining: number; spawnedInWave: number; spawnCooldown: number; waveBreakRemaining: number
  // Уровень и автоулучшение в зеркале снимка нужны подсказкам обучения:
  // они проверяют, улучшил ли игрок башню и включил ли автоулучшение.
  towers: Array<{ id: string; x: number; y: number; type: TowerType; level: number; autoUpgrade: boolean }>
  // Заявки очереди стройки: нужны счётчиком в панели, чтобы игрок видел,
  // что полупрозрачные башни на поле чего-то ждут.
  buildQueue: QueuedBuild[]
  enemyStates: Array<{ x: number; y: number }>
  towerCells: string[]; pathCells: string[]; waterCells: string[]
  viewport: { worldX: number; worldY: number; width: number; height: number; zoom: number } | null
  stats: { monstersKilled: number; buildingsBuilt: number; moneySpent: number; damageDealt: number }
  buffs: TowerBuffs
  level: number; xp: number; xpToNextLevel: number; pendingUpgrades: number
}

const initialState: GameState = {
  wave: 0, gold: initialResources.gold, lives: initialResources.lives, maxLives: initialResources.lives, enemies: 0,
  selectedTower: null, selection: null, panelPosition: null,
  status: 'Выбери башню и подготовь оборону', waveActive: false, nextWaveIn: 0, gameOver: false,
  victory: false,
  spawnRemaining: 0, spawnedInWave: 0, spawnCooldown: 0, waveBreakRemaining: 0,
  towers: [], enemyStates: [], towerCells: [], pathCells: [], waterCells: [], viewport: null,
  buildQueue: [],
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

// Турнирная таблица не должна мешать игре: при сбое сети оставляем прошлый топ.
async function loadTopScores(): Promise<PlayerScore[] | null> {
  try {
    return await fetchTopScores(8)
  } catch {
    return null
  }
}

// Сколько строк топа карты показывает игровая панель: остальное игрок
// смотрит в карточке карты.
const BOARD_ROWS = 8

export function useGame(initialSeed?: string, initialMapId?: string, tutorial = false) {
  const { token, user, checked } = useAuth()
  // Сид из URL означает, что игрок выбрал конкретную сохранённую карту.
  // Для такой игры не показываем предложение продолжить старый забег.
  const explicitSeed = initialSeed?.trim() || null
  // id карты из редактора: черновик загружается с сервера до создания сцены.
  const explicitMap = initialMapId?.trim() || null
  const [game, setGame] = useState<GameState>(initialState)
  // Черновик обучения лежит в коде: он не грузится с сервера и не сохраняется,
  // поэтому готов до первого кадра сцены.
  const [mapDraft, setMapDraft] = useState<MapDraft | null>(() =>
    tutorial ? buildTutorialDraft() : null,
  )
  const [mapLoading, setMapLoading] = useState(Boolean(explicitMap) && !tutorial)
  const [mapError, setMapError] = useState<string | null>(null)
  // 401 из игровых запросов: забег продолжаться не может, показываем вход.
  const [accessError, setAccessError] = useState<string | null>(null)
  const [upgradeCards, setUpgradeCards] = useState<UpgradeCard[]>([])
  const [scores, setScores] = useState<PlayerScore[]>([])
  // Топ конкретной карты и её звёзды: без них живая строка не считает очки.
  const [mapBoard, setMapBoard] = useState<MapLeaderboard | null>(null)
  const [mapStars, setMapStars] = useState<number | null>(null)
  const [checkedToken, setCheckedToken] = useState<string | null>(null)
  const [resuming, setResuming] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  // Токен читается из localStorage, которого нет на сервере: до монтирования
  // не показываем ветку «Загрузка…», иначе ломается гидратация.
  const [mounted, setMounted] = useState(false)
  // Ускорение боя выбирает игрок: сцена применяет множитель и при своём
  // создании, поэтому выбранная ступень лежит ещё и на window.
  const [speed, setSpeed] = useState(1)
  // Ручная пауза с кнопки HUD. Меню, профиль и выбор карточек останавливают
  // бой сами, поэтому здесь хранится только явное желание игрока.
  const [paused, setPaused] = useState(false)
  // На сервере сид должен быть стабильным: randomUUID во время пререндера
  // считается нестабильным значением и ломает сборку /game.
  const [mapSeed, setMapSeed] = useState(() =>
    explicitSeed ?? (typeof window === 'undefined' ? 'default' : createMapSeed()),
  )
  const latestSnapshotRef = useRef<GameSnapshot | null>(null)
  const mapSeedRef = useRef(mapSeed)
  const cardsShownRef = useRef(false)
  const lastSavedRef = useRef('')
  // Одна завершённая игра должна попасть в историю ровно один раз.
  const gameRecordedRef = useRef(false)
  // После выхода в меню сессия закрыта: автосейв больше не имеет права её
  // пересоздать, иначе удалённое сохранение вернётся.
  const sessionClosedRef = useRef(false)
  // Данные сохранённой игры нужны, если игрок начнёт новую вместо продолжения:
  // старый забег тоже закрывается и должен попасть в историю.
  const savedSessionRef = useRef<SessionPayload | null>(null)
  // После 401 автосейв останавливаем: повторять заведомо отвергнутый запрос
  // раз в секунду — значит грузить сервер и терять причину ошибки.
  const autosaveStoppedRef = useRef(false)

  // Игра без аккаунта не играется: забег некуда сохранять и некому засчитать.
  // Обучение тоже требует входа — гостю нечего подтверждать на сервере.
  const authorized = Boolean(token && user)
  // Экран входа включается только после проверки токена: до неё первая
  // клиентская отрисовка совпадает с серверной, и гидратация не ломается.
  const needsLogin = checked && !authorized

  // Обучение идёт вне аккаунта: сохранений инициализации не имеет смысла искать.
  const checkingSession =
    mounted && Boolean(token) && !tutorial && !explicitSeed && !explicitMap && checkedToken !== token

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  // Пользовательская карта загружается до первого кадра: сцена должна
  // получить готовый черновик, иначе отрисует карту по сиду.
  useEffect(() => {
    if (!explicitMap || !checked || tutorial) return

    let cancelled = false

    const load = async () => {
      if (!token) {
        setMapLoading(false)
        setMapError(NOT_AUTHORIZED)
        return
      }

      setMapLoading(true)
      setMapError(null)

      try {
        const map = await fetchMap(token, explicitMap)
        if (cancelled) return

        setMapSeed(map.seed)
        setMapStars(map.stars)
        // Старые карты библиотеки описаны только сидом: черновика у них нет,
        // поле строит движок — но забег всё равно привязан к id карты и
        // попадает в её топ.
        setMapDraft(map.data)
      } catch (loadError) {
        if (cancelled) return
        setMapError(
          loadError instanceof Error ? loadError.message : 'Не удалось загрузить карту',
        )
      } finally {
        if (!cancelled) setMapLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [explicitMap, token, checked, tutorial])

  // Таблица рекордов конкретной карты: у каждой карты свой топ, как у
  // битмапа в osu!. Автогенерируемая игра карты не имеет, поэтому и доски нет.
  const reloadMapBoard = useCallback(async () => {
    if (!token || !explicitMap) return

    try {
      const board = await fetchMapBoard(token, explicitMap, BOARD_ROWS)
      if (board) {
        setMapBoard(board)
        setMapStars(board.stars)
      }
    } catch {
      // Сбой сети не должен мешать игре: оставляем прошлый топ карты.
    }
  }, [token, explicitMap])

  const refreshScores = useCallback(async () => {
    const next = await loadTopScores()
    if (next) setScores(next)
    await reloadMapBoard()
  }, [reloadMapBoard])

  // Закрывает забег: результат идёт в историю и в турнирную таблицу.
  // Повторный вызов для того же забега игнорируется.
  // Обучение в рекорды не пишется: карта учебная, результаты несравнимы.
  const finishRun = useCallback(
    (run: {
      wave: number
      gold: number
      lives?: number
      maxLives?: number
      level?: number
      monstersKilled?: number
      buildingsBuilt?: number
      moneySpent?: number
      damageDealt?: number
    }) => {
      if (tutorial || !token || gameRecordedRef.current) return
      gameRecordedRef.current = true

      void recordGame(token, {
        mapId: explicitMap,
        wave: Math.max(0, Math.trunc(run.wave)),
        gold: Math.max(0, Math.trunc(run.gold)),
        // Целость замка решает, насколько «чистым» был забег: без этих чисел
        // сервер посчитал бы, что оборона пала.
        lives: run.lives ?? initialResources.lives,
        maxLives: run.maxLives ?? initialResources.lives,
        level: run.level ?? 1,
        monstersKilled: run.monstersKilled ?? 0,
        buildingsBuilt: run.buildingsBuilt ?? 0,
        moneySpent: run.moneySpent ?? 0,
        damageDealt: run.damageDealt ?? 0,
      })
        .then(() => reloadMapBoard())
        .catch(() => {})
      updateUserScore(token, run.gold, run.wave, explicitMap)
        .then(() => refreshScores())
        .catch(() => {})
    },
    [explicitMap, refreshScores, reloadMapBoard, token, tutorial],
  )

  // Закрывает прерванный забег: игрок выбрал новую игру вместо продолжения.
  const recordAbandonedGame = useCallback(
    (payload: SessionPayload | null) => {
      const saved = payload?.gameState
      if (tutorial || !token || !saved || !hasSessionProgress(saved)) return

      const stats = saved.stats ?? payload.stats

      void recordGame(token, {
        mapId: explicitMap,
        wave: Math.max(0, Math.trunc(saved.wave ?? 0)),
        gold: Math.max(0, Math.trunc(saved.gold ?? 0)),
        lives: saved.lives ?? initialResources.lives,
        maxLives: saved.maxLives ?? saved.lives ?? initialResources.lives,
        level: saved.level ?? 1,
        monstersKilled: stats?.monstersKilled ?? 0,
        buildingsBuilt: stats?.buildingsBuilt ?? 0,
        moneySpent: stats?.moneySpent ?? 0,
        damageDealt: stats?.damageDealt ?? 0,
      }).catch(() => {})
    },
    [explicitMap, token, tutorial],
  )

  useEffect(() => {
    mapSeedRef.current = mapSeed
  }, [mapSeed])

  useEffect(() => {
    const handleState = (event: Event) => {
      const detail = (event as CustomEvent<GameSnapshot>).detail
      if (!detail) return

      latestSnapshotRef.current = detail

      // Новый уровень даёт выбор карточки: окно выбора останавливает бой
      // через `overlayOpen` в GamePageClient, здесь паузу включать не нужно.
      if (!detail.gameOver && detail.pendingUpgrades > 0 && !cardsShownRef.current) {
        cardsShownRef.current = true
        setUpgradeCards(generateUpgradeCards(UPGRADE_CHOICES, { wave: detail.wave }))
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
        const snapshot = latestSnapshotRef.current
        finishRun({
          wave: detail.wave,
          gold: detail.gold,
          lives: snapshot?.lives ?? 0,
          maxLives: snapshot?.maxLives ?? initialResources.lives,
          level: snapshot?.level ?? 1,
          monstersKilled: snapshot?.stats.monstersKilled ?? 0,
          buildingsBuilt: snapshot?.stats.buildingsBuilt ?? 0,
          moneySpent: snapshot?.stats.moneySpent ?? 0,
          damageDealt: snapshot?.stats.damageDealt ?? 0,
        })
      }
    }
    window.addEventListener('td:state', handleState)
    window.addEventListener('td:game-over', handleGameOver)
    return () => {
      window.removeEventListener('td:state', handleState)
      window.removeEventListener('td:game-over', handleGameOver)
    }
  }, [finishRun])

  // Живая строка сравнивается с серверными местами, поэтому топ загружается
  // сразу при входе в бой, а не только когда игрок откроет панель рекордов.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshScores()
  }, [refreshScores])

  // Ищем сохранение до того, как автосейв получит право писать на сервер.
  // Для выбранной карты сохранение не подгружаем: игрок хочет начать её заново.
  // Обучение не имеет права трогать чужие забеги — иначе выход из урока
  // подсовывает игроку продолжение реальной партии.
  useEffect(() => {
    if (!token || tutorial || explicitSeed || explicitMap) return

    let cancelled = false

    fetchLatestSession(token)
      .then((data) => {
        if (cancelled || !data) return
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
      .catch((error: unknown) => {
        if (cancelled) return
        // Сохранение ищется по токену: 401 означает, что аккаунт уже не тот.
        if (isUnauthorized(error)) setAccessError(error.message)
      })
      .finally(() => {
        if (!cancelled) setCheckedToken(token)
      })

    return () => {
      cancelled = true
    }
  }, [token, explicitSeed, explicitMap, tutorial])

  // Интервал не зависит от кадров игры: снимок читается из ref.
  useEffect(() => {
    if (!token || tutorial || explicitMap || checkingSession || resuming) return

    const interval = setInterval(() => {
      if (sessionClosedRef.current || autosaveStoppedRef.current) return
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
        .catch((error: unknown) => {
          // Аккаунт вышел: писать дальше некому, останавливаемся и говорим почему.
          if (isUnauthorized(error)) {
            autosaveStoppedRef.current = true
            setAccessError(error.message)
          }
        })
    }, 1000)

    return () => clearInterval(interval)
  }, [token, tutorial, explicitMap, checkingSession, resuming])

  const resumeGame = useCallback(async () => {
    if (tutorial || !sessionId || !token) return false

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
      sessionClosedRef.current = false

      const waveBreakRemaining = saved.waveBreakRemaining ?? (saved.nextWaveIn ?? 0) * 1000
      const level = saved.level ?? 1

      setGame({
        ...initialState,
        wave: saved.wave ?? 0,
        gold: saved.gold ?? initialState.gold,
        lives: saved.lives ?? initialState.lives,
        // Старые сохранения не хранили запас: для сидовых карт он равен 20.
        maxLives: saved.maxLives ?? saved.lives ?? initialState.maxLives,
        waveActive: saved.waveActive ?? false,
        status: saved.status ?? initialState.status,
        spawnRemaining: saved.spawnRemaining ?? 0,
        spawnedInWave: saved.spawnedInWave ?? 0,
        spawnCooldown: saved.spawnCooldown ?? 0,
        waveBreakRemaining,
        nextWaveIn: Math.ceil(waveBreakRemaining / 1000),
        selectedTower: saved.selectedTower ?? null,
        stats: saved.stats ?? initialState.stats,
        towerCells: (saved.towers ?? []).flatMap((tower) => towerFootprintKeys(tower.id)),
        level,
        xp: saved.xp ?? 0,
        xpToNextLevel: xpToNextLevel(level),
        pendingUpgrades: saved.pendingUpgrades ?? 0,
      })
      setMapSeed(data.mapSeed || 'default')
      setResuming(false)
      return true
    } catch (error) {
      // Сервер уже объяснил причину своим текстом; свой показываем, только
      // если ответ пришёл пустой.
      setAccessError(
        error instanceof ApiError ? error.message : 'Не удалось продолжить игру',
      )
      return false
    }
  }, [token, sessionId, tutorial])

  const restartGame = useCallback(() => {
    latestSnapshotRef.current = null
    sessionClosedRef.current = false
    autosaveStoppedRef.current = false
    setAccessError(null)
    setUpgradeCards([])
    cardsShownRef.current = false
    gameRecordedRef.current = false
    setGame({ ...initialState, stats: initialState.stats })
    // Сцена после рестарта сама просит возобновить бой, поэтому и ручная
    // пауза не должна переживать перезапуск.
    setPaused(false)
    // Выбранную карту и урок перезапускаем на том же сиде: у урока поле
    // задаёт черновик, а новый сид только пересоздал бы сцену.
    setMapSeed((current) =>
      explicitSeed ?? (explicitMap || tutorial ? current : createMapSeed()),
    )
    window.dispatchEvent(new CustomEvent('td:restart'))
  }, [explicitSeed, explicitMap, tutorial])

  const startNew = useCallback(() => {
    recordAbandonedGame(savedSessionRef.current)
    savedSessionRef.current = null
    latestSnapshotRef.current = null
    sessionClosedRef.current = false
    setResuming(false)
    setSessionId(null)
    // Урок ничего не сохраняет, поэтому и удалять ему нечего: сохранение
    // реального забега игрока остаётся в силе.
    if (!tutorial && token) void deleteSession(token).catch(() => {})
    restartGame()
  }, [token, tutorial, restartGame, recordAbandonedGame])

  // Выход в главное меню: забег завершён здесь и сейчас, а не тогда, когда
  // у игрока закончатся жизни. Сессия закрывается, результат уходит в топ.
  // Обучение не забег: оно не пишет рекорд и не трогает чужое сохранение.
  const leaveGame = useCallback(() => {
    if (tutorial) return
    sessionClosedRef.current = true
    const snapshot = latestSnapshotRef.current
    if (!snapshot || !hasSessionProgress(snapshot)) return

    if (token) void deleteSession(token).catch(() => {})
    finishRun({
      wave: snapshot.wave,
      gold: snapshot.gold,
      lives: snapshot.lives,
      maxLives: snapshot.maxLives,
      level: snapshot.level,
      monstersKilled: snapshot.stats.monstersKilled,
      buildingsBuilt: snapshot.stats.buildingsBuilt,
      moneySpent: snapshot.stats.moneySpent,
      damageDealt: snapshot.stats.damageDealt,
    })
  }, [finishRun, token, tutorial])

  // Прохождение обучения — единственное, что оно оставляет в аккаунте:
  // флаг включает рассказ про рейтинг в главном меню. Ошибку гасим: без
  // сети забег всё равно пройден, а повторная подсказка лучше, чем сбой.
  const markTutorialDone = useCallback(() => {
    if (token) void markProgress(token, { tutorialCompleted: true }).catch(() => {})
  }, [token])

  // Живая строка топа: пока забег не завершён, на сервер ничего не уходит,
  // но игрок видит, какое место займут его текущие волна и золото. Значения
  // берутся из боя, поэтому строка живёт по тем же правилам, что и запись
  // сервера после завершения забега.
  const hasRun = !game.gameOver && (game.wave > 0 || game.towers.length > 0)
  const topScores = useMemo<LivePlayerScore[]>(() => {
    if (!user || !hasRun) return scores
    const row: LivePlayerScore = {
      id: user.id,
      login: user.login,
      gold: game.gold,
      wave: game.wave,
      createdAt: '',
      avatar: user.avatar,
      avatarFrame: user.avatarFrame,
      title: user.title,
      live: true,
    }
    // Стабильная сортировка держит равные результаты в серверном порядке.
    return [...scores.filter((score) => score.id !== user.id), row].sort((a, b) => b.gold - a.gold)
  }, [scores, user, hasRun, game.gold, game.wave])

  // Живая строка топа карты: забег ещё не записан, но его очки считаются той
  // же формулой, что и на сервере, поэтому место в таблице честное.
  const liveMapRow = useMemo<MapBoardRowView | null>(() => {
    if (!user || mapStars === null || !hasRun) return null

    return {
      userId: user.id,
      login: user.login,
      avatar: user.avatar ?? '',
      avatarFrame: user.avatarFrame ?? '',
      title: user.title ?? 'none',
      points: runPoints({ stars: mapStars, wave: game.wave, lives: game.lives, maxLives: game.maxLives }),
      wave: game.wave,
      gold: game.gold,
      stars: mapStars,
      plays: 0,
      rated: Boolean(mapBoard?.rated),
      achievedAt: '',
      live: true,
    }
  }, [user, mapStars, hasRun, game.wave, game.gold, game.lives, game.maxLives, mapBoard?.rated])

  // Панель топа карты: чужие рекорды, свой рекорд и текущий забег рядом.
  const mapTopRows = useMemo<MapBoardRowView[]>(() => {
    if (!mapBoard) return []
    const others = mapBoard.entries.filter((row) => row.userId !== user?.id)
    const rows = [...others]
    if (mapBoard.my) rows.push(mapBoard.my)
    if (liveMapRow) rows.push(liveMapRow)

    return rows.sort((a, b) => b.points - a.points)
  }, [mapBoard, user?.id, liveMapRow])

  useEffect(() => {
    ;(window as unknown as { __tdGameSpeed?: number }).__tdGameSpeed = speed
    window.dispatchEvent(new CustomEvent('td:game-speed', { detail: { scale: speed } }))
  }, [speed])

  const waveButtonDisabled = !game.gameOver && (game.waveActive || game.wave > 0)

  const selectTower = useCallback((towerId: TowerType) => {
    window.dispatchEvent(new CustomEvent('td:select-tower', { detail: { towerId } }))
  }, [])
  const startWave = useCallback(() => window.dispatchEvent(new CustomEvent('td:start-wave')), [])
  // Пауза живёт в сцене: событие stop/resume уже умеет останавливать
  // и возобновлять игровой цикл, а React лишь хранит состояние кнопки.
  const togglePause = useCallback(() => setPaused((current) => !current), [])
  const upgradeTower = useCallback(() => window.dispatchEvent(new CustomEvent('td:upgrade-tower')), [])
  const toggleAutoUpgrade = useCallback(() => window.dispatchEvent(new CustomEvent('td:auto-upgrade-tower')), [])
  // Кнопка ускорения проходит по ступеням 1× → 2× → 3× по кругу.
  const cycleSpeed = useCallback(
    () =>
      setSpeed((current) =>
        GAME_SPEED_STEPS[(GAME_SPEED_STEPS.indexOf(current) + 1) % GAME_SPEED_STEPS.length] ?? 1,
      ),
    [],
  )
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
        generateUpgradeCards(UPGRADE_CHOICES, { wave: latestSnapshotRef.current?.wave ?? 0 }),
      )
    }
  }, [])

  // Обновление набора платное: цену считаем от запаса золота в снимке,
  // а списывает её сцена — так HUD не разойдётся с деньгами игры.
  const rerollUpgrades = useCallback(() => {
    const snapshot = latestSnapshotRef.current
    if (!snapshot || snapshot.pendingUpgrades <= 0) return

    const cost = upgradeRerollCost(snapshot.gold)
    if (snapshot.gold < cost) return

    window.dispatchEvent(new CustomEvent('td:reroll-upgrades', { detail: { cost } }))
    setUpgradeCards(generateUpgradeCards(UPGRADE_CHOICES, { wave: snapshot.wave }))
  }, [])

  // Клавиши 1–3 выбирают карту улучшения. Оверлей открывает выбор поверх
  // боя, сцена стоит на паузе и свои клавиши не читает, поэтому слушатель
  // живёт в React — там же, где и сам набор карт.
  useEffect(() => {
    if (upgradeCards.length === 0) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return

      const target = event.target
      // В полях ввода цифры нужны тексту, а не картам.
      if (target instanceof HTMLElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return

      const card = upgradeCards[Number(event.key) - 1]
      if (!card) return

      event.preventDefault()
      pickUpgrade(card)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [upgradeCards, pickUpgrade])

  return {
    game, setGame, user,
    scores, topScores,
    // Топ карты доступен только в игре с библиотечной картой: автогенерация
    // карты не имеет, и кнопка топа там не нужна.
    mapBoard, mapTopRows, mapStars, hasMapBoard: Boolean(explicitMap),
    upgradeCards,
    speed,
    paused,
    checkingSession, resuming, sessionId, mapSeed,
    mapDraft, mapLoading, mapError,
    authorized, needsLogin, accessError,
    // Урок обрывается на пятой волне: движок берёт лимит из этих данных.
    waveLimit: tutorial ? TUTORIAL_WAVES : 0,
    restartGame, resumeGame, startNew, leaveGame,
    markTutorialDone,
    selectTower, startWave, upgradeTower, sellTower, deselectTower, pickUpgrade,
    rerollUpgrades,
    toggleAutoUpgrade, cycleSpeed, togglePause,
    waveButtonDisabled,
    refreshScores,
  }
}
