'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import GameCanvas from '@/components/game/GameCanvas'
import MiniMap from '@/components/game/MiniMap'
import GameMenu from '@/components/game/GameMenu'
import GameHeader from '@/components/game/GameHeader'
import GameHUD from '@/components/game/GameHUD'
import GameOverlays from '@/components/game/GameOverlays'
import ProfilePanel from '@/components/game/ProfilePanel'
import { useGameUI } from '@/hooks/useGameUI'
import { useGame } from '@/hooks/useGame'

export default function GamePageClient() {
  const router = useRouter()
  const ui = useGameUI()
  const searchParams = useSearchParams()
  const seedParam = searchParams.get('seed')?.trim() ?? ''
  const initialSeed = seedParam ? seedParam.slice(0, 128) : undefined
  const mapParam = searchParams.get('map')?.trim() ?? ''
  const {
    game, user, checkingSession, resuming, upgradeCards, scores, mapSeed, speed,
    mapDraft, mapLoading, mapError,
    restartGame, resumeGame, startNew, refreshScores,
    selectTower, startWave, upgradeTower, sellTower, deselectTower, pickUpgrade,
    toggleAutoUpgrade, cycleSpeed,
    waveButtonDisabled,
  } = useGame(initialSeed, mapParam || undefined)

  // Сцену на пользовательской карте создаём только после загрузки черновика.
  const sceneReady =
    !checkingSession &&
    !resuming &&
    (!mapParam || (!mapLoading && !mapError && mapDraft !== null))

  // Кнопка рестарта сверху спрашивает подтверждение: партия сбрасывается
  // без возможности вернуться к прежнему состоянию.
  const [confirmRestart, setConfirmRestart] = useState(false)

  // Меню, профиль и выбор улучшения не должны останавливать игру и уводить
  // со страницы, но бой за модальным окном лучше поставить на паузу.
  const overlayOpen =
    ui.showGameMenu || ui.showProfile || upgradeCards.length > 0 || confirmRestart

  useEffect(() => {
    window.dispatchEvent(new Event(overlayOpen ? 'td:pause' : 'td:resume'))
  }, [overlayOpen])

  return (
    <main className="h-[100dvh] w-full overflow-hidden bg-[#4a7f2a] text-[#e2c8a0] font-mono selection:bg-amber-900 selection:text-amber-100 relative flex flex-col">
      <GameHeader
        onRestart={() => setConfirmRestart(true)}
        onLeaderboard={() => { ui.toggleLeaderboard(); void refreshScores() }}
        onInfo={ui.toggleInfo}
        onMenu={ui.openMenu}
        showLeaderboard={ui.showLeaderboard}
        showInfo={ui.showInfo}
        speed={speed}
        onCycleSpeed={cycleSpeed}
      />
      {ui.showGameMenu && (
        <GameMenu
          onClose={ui.closeMenu}
          onStats={ui.openProfile}
          onMainMenu={() => { ui.closeMenu(); router.push('/menu') }}
        />
      )}
      {ui.showProfile && (
        <ProfilePanel
          user={user}
          scores={scores}
          onRefresh={refreshScores}
          onClose={ui.closeProfile}
        />
      )}
      <section className="relative min-h-0 flex-1 overflow-hidden">
        {/* Сцену не создаём, пока не решено, продолжать сохранение или нет. */}
        {sceneReady && (
          <GameCanvas
            key={`${mapParam}:${mapSeed}`}
            mapSeed={mapSeed}
            customDraft={mapDraft}
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
              onClick={() => router.push('/maps')}
              className="border-2 border-[#79502b] bg-[#21150c] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-amber-200 transition-colors hover:border-amber-400 hover:text-amber-50"
            >
              К списку карт
            </button>
          </div>
        )}
      </section>

      <GameOverlays
        gameOver={game.gameOver}
        resuming={resuming}
        upgradeCards={upgradeCards}
        game={{
          wave: game.wave,
          gold: game.gold,
          lives: game.lives,
          level: game.level,
          stats: game.stats,
          selectedBuiltTower: game.selectedBuiltTower,
          panelPosition: game.panelPosition,
        }}
        scores={scores}
        showLeaderboard={ui.showLeaderboard}
        onCloseLeaderboard={ui.closeLeaderboard}
        onResume={resumeGame}
        onStartNew={startNew}
        onRestart={restartGame}
        confirmRestart={confirmRestart}
        onConfirmRestart={() => { setConfirmRestart(false); restartGame() }}
        onCancelRestart={() => setConfirmRestart(false)}
        onBackToMenu={() => { restartGame(); router.push('/menu') }}
        onPickUpgrade={pickUpgrade}
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
        waveButtonDisabled={waveButtonDisabled}
      />
    </main>
  )
}
