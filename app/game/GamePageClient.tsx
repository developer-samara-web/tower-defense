'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import GameCanvas from '@/components/game/GameCanvas'
import MiniMap from '@/components/game/MiniMap'
import GameMenu from '@/components/game/GameMenu'
import GameHeader from '@/components/game/GameHeader'
import GameHUD from '@/components/game/GameHUD'
import GameOverlays from '@/components/game/GameOverlays'
import ProfilePanel from '@/components/game/ProfilePanel'
import TutorialHints from '@/components/game/TutorialHints'
import WaveInfoPanel from '@/components/game/WaveInfoPanel'
import AccessScreen from '@/components/ui/AccessScreen'
import { NOT_AUTHORIZED } from '@/lib/access-messages'
import { wavePreview } from '@/features/game/engine/wave-preview'
import { useGameUI } from '@/hooks/useGameUI'
import { useGame } from '@/hooks/useGame'

export default function GamePageClient() {
  const router = useRouter()
  const ui = useGameUI()
  const searchParams = useSearchParams()
  const seedParam = searchParams.get('seed')?.trim() ?? ''
  const initialSeed = seedParam ? seedParam.slice(0, 128) : undefined
  const mapParam = searchParams.get('map')?.trim() ?? ''
  // Бесконечная башня: номер этажа из URL. Игра до 15-й волны с боссами.
  const towerFloor = Number(searchParams.get('tower') ?? 0)
  // Обучение — фиксированная карта из кода с подсказками и пятью волнами.
  // Оно не грузится с сервера, не сохраняется и не попадает в рекорды.
  const tutorial = searchParams.get('tutorial') === '1'
  const {
    game, user, authorized, checkingSession, resuming, upgradeCards, topScores, mapTopRows, mapBoard, hasMapBoard,
    mapSeed, speed, paused,
    mapDraft, mapLoading, mapError,
    towerMode, towerResult, towerError, retryTowerComplete,
    waveLimit,
    needsLogin, accessError,
    restartGame, resumeGame, startNew, leaveGame, refreshScores, markTutorialDone,
    selectTower, startWave, upgradeTower, sellTower, deselectTower, pickUpgrade,
    rerollUpgrades,
    toggleAutoUpgrade, cycleSpeed, togglePause,
    waveButtonDisabled,
  } = useGame(initialSeed, mapParam || undefined, tutorial, towerFloor)

  // Сцену на пользовательской карте создаём только после загрузки черновика.
  // Карта без черновика (старая библиотека по сиду) готова сразу: поле строит
  // движок, но id карты всё равно привязывает забег к её топу.
  // Обучение собирается из кода, но всё равно ждёт проверку аккаунта:
  // иначе гость успевает увидеть поле до заглушки входа.
  const sceneReady =
    authorized &&
    !checkingSession &&
    !resuming &&
    (tutorial ||
      (towerMode
        ? !mapLoading && !mapError && Boolean(mapDraft)
        : !mapParam || (!mapLoading && !mapError)))

  // Кнопка рестарта сверху спрашивает подтверждение: партия сбрасывается
  // без возможности вернуться к прежнему состоянию.
  const [confirmRestart, setConfirmRestart] = useState(false)

  // Выход в главное меню закрывает забег: результат уходит в рекорды и топ,
  // сохранение удаляется. «В меню» после поражения ничего не пишет — игра уже
  // записана, а рестарт обнулил снимок.
  const backToMenu = () => {
    leaveGame()
    router.push('/menu')
  }

  // Меню, профиль и выбор улучшения не должны останавливать игру и уводить
  // со страницы, но бой за модальным окном лучше поставить на паузу.
  const overlayOpen =
    ui.showGameMenu || ui.showProfile || upgradeCards.length > 0 || confirmRestart

  // Ручная пауза с кнопки складывается с паузой модальных окон: игра
  // стоит, пока хоть что-то из этого открыто.
  const frozen = overlayOpen || paused

  useEffect(() => {
    window.dispatchEvent(new Event(frozen ? 'td:pause' : 'td:resume'))
  }, [frozen])

  // Обучение засчитываем на сервере один раз за забег: флаг живёт в аккаунте,
  // поэтому пройденное не придётся повторять после очистки браузера.
  const tutorialMarked = useRef(false)
  useEffect(() => {
    if (!tutorial || !game.victory || tutorialMarked.current) return
    tutorialMarked.current = true
    markTutorialDone()
  }, [game.victory, markTutorialDone, tutorial])

  // Панель информации показывает текущую волну в бою, а до её старта
  // и в перерыве — следующую, чтобы игрок успел подготовиться.
  const previewWave = game.waveActive ? game.wave : game.wave + 1
  const waveSummary = useMemo(
    () => wavePreview(mapDraft, previewWave),
    [mapDraft, previewWave],
  )

  // Без аккаунта забег некому сохранять и некому засчитать, поэтому сцену
  // не поднимаем вовсе — даже для обучения: оно тоже часть игры.
  if (needsLogin || accessError) {
    return (
      <AccessScreen
        title={accessError ? 'Игра недоступна' : 'Нужен вход в аккаунт'}
        message={accessError ?? NOT_AUTHORIZED}
        actions={[
          { label: 'Войти', onClick: () => router.push('/auth') },
          { label: 'На главную', onClick: () => router.push('/') },
        ]}
      />
    )
  }

  return (
    <main className="h-[100dvh] w-full overflow-hidden bg-[#4a7f2a] text-[#e2c8a0] font-mono selection:bg-amber-900 selection:text-amber-100 relative flex flex-col">
      <GameHeader
        onRestart={() => setConfirmRestart(true)}
        onLeaderboard={() => { ui.toggleLeaderboard(); void refreshScores() }}
        onInfo={ui.toggleInfo}
        onMenu={ui.openMenu}
        showLeaderboard={ui.showLeaderboard}
        showInfo={ui.showInfo}
        showLeaderboardButton={hasMapBoard}
      />
      {ui.showGameMenu && (
        <GameMenu
          onClose={ui.closeMenu}
          onStats={ui.openProfile}
          onMainMenu={() => { ui.closeMenu(); backToMenu() }}
        />
      )}
      {ui.showProfile && (
        <ProfilePanel
          user={user}
          scores={topScores}
          onRefresh={refreshScores}
          onClose={ui.closeProfile}
        />
      )}
      <section className="relative min-h-0 flex-1 overflow-hidden">
        {/* Сцену не создаём, пока не решено, продолжать сохранение или нет. */}
        {sceneReady && (
          <GameCanvas
            key={`${towerFloor ? `tower-${towerFloor}` : mapParam}:${mapSeed}`}
            mapSeed={mapSeed}
            customDraft={mapDraft}
            waveLimit={waveLimit}
          />
        )}
        {!sceneReady && !mapError && (
          <div className="absolute inset-0 z-[95] flex items-center justify-center bg-[#0f0a05]/70">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">Загрузка…</p>
          </div>
        )}
        {mapError && (
          <div className="absolute inset-0 z-[95] flex flex-col items-center justify-center gap-3 bg-[#0f0a05]/85 px-4 text-center">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-red-300">{mapError}</p>
            <button
              type="button"
              onClick={() => router.push(towerMode ? '/tower' : '/maps')}
              className="border-2 border-[#79502b] bg-[#21150c] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-amber-200 transition-colors hover:border-amber-400 hover:text-amber-50"
            >
              {towerMode ? 'К башне' : 'К списку карт'}
            </button>
          </div>
        )}
      </section>

      {/* Подсказки обучения: поверх поля, но под оверлеями поражения и карт. */}
      {tutorial && sceneReady && (
        <TutorialHints
          game={game}
          onExit={backToMenu}
          onRandomGame={() => router.push('/game')}
          onRestart={restartGame}
        />
      )}

      <GameOverlays
        gameOver={game.gameOver}
        resuming={resuming}
        upgradeCards={upgradeCards}
        towerFloor={towerMode ? towerFloor : undefined}
        towerResult={towerResult}
        towerError={towerError}
        onRetryTowerComplete={retryTowerComplete}
        onNextTowerFloor={() => router.push(`/game?tower=${towerFloor + 1}`)}
        game={{
          wave: game.wave,
          gold: game.gold,
          lives: game.lives,
          level: game.level,
          stats: game.stats,
          selection: game.selection,
          panelPosition: game.panelPosition,
        }}
        mapRows={mapTopRows}
        mapBoard={mapBoard}
        showLeaderboard={ui.showLeaderboard}
        onCloseLeaderboard={ui.closeLeaderboard}
        onResume={resumeGame}
        onStartNew={startNew}
        onRestart={restartGame}
        confirmRestart={confirmRestart}
        onConfirmRestart={() => { setConfirmRestart(false); restartGame() }}
        onCancelRestart={() => setConfirmRestart(false)}
        onBackToMenu={() => {
          // Этаж башни — не обычный забег: после победы и поражения игрок
          // возвращается к списку этажей, а не в главное меню.
          if (towerMode) { router.push('/tower'); return }
          restartGame()
          router.push('/menu')
        }}
        onPickUpgrade={pickUpgrade}
        onRerollUpgrade={rerollUpgrades}
        onUpgrade={upgradeTower}
        onToggleAutoUpgrade={toggleAutoUpgrade}
        onSell={sellTower}
        onDeselect={deselectTower}
        showInfo={ui.showInfo}
        onCloseInfo={ui.closeInfo}
      />

      <GameHUD
        gold={game.gold}
        lives={game.lives}
        maxLives={game.maxLives}
        wave={game.wave}
        waveActive={game.waveActive}
        gameOver={game.gameOver}
        selectedTower={game.selectedTower}
        queuedBuilds={game.buildQueue.length}
        status={game.status}
        level={game.level}
        xp={game.xp}
        xpToNextLevel={game.xpToNextLevel}
        buffs={game.buffs}
        minimap={(
          <MiniMap
            pathCells={new Set(game.pathCells)}
            waterCells={new Set(game.waterCells)}
            towerCells={game.towerCells}
            towers={game.towers}
            enemies={game.enemyStates}
            viewport={game.viewport ?? undefined}
            onNavigate={(worldX, worldY) => {
              window.dispatchEvent(new CustomEvent('td:camera-focus', { detail: { x: worldX, y: worldY } }))
            }}
          />
        )}
        onSelectTower={selectTower}
        onStartWave={startWave}
        onRestart={restartGame}
        onCycleSpeed={cycleSpeed}
        onTogglePause={togglePause}
        onToggleWaveInfo={ui.toggleWaveInfo}
        speed={speed}
        paused={paused}
        showWaveInfo={ui.showWaveInfo}
        waveInfo={ui.showWaveInfo && (
          <WaveInfoPanel
            preview={waveSummary}
            live={{
              waveActive: game.waveActive,
              nextWaveIn: game.nextWaveIn,
              spawned: game.spawnedInWave,
              alive: game.enemyStates.length,
            }}
            onClose={ui.closeWaveInfo}
          />
        )}
        waveButtonDisabled={waveButtonDisabled}
      />
    </main>
  )
}
