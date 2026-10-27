'use client'

import { useRouter } from 'next/navigation'

import GameCanvas from '@/components/game/GameCanvas'
import MiniMap from '@/components/game/MiniMap'
import GameMenu from '@/components/game/GameMenu'
import GameHeader from '@/components/game/GameHeader'
import GameHUD from '@/components/game/GameHUD'
import GameOverlays from '@/components/game/GameOverlays'
import { useGameUI } from '@/hooks/useGameUI'
import { useGame } from '@/hooks/useGame'

export default function GamePage() {
  const router = useRouter()
  const ui = useGameUI()
  const {
    game, checkingSession, resuming, upgradeCards, scores, mapSeed,
    restartGame, resumeGame, startNew,
    selectTower, startWave, upgradeTower, sellTower, deselectTower, pickUpgrade,
    waveButtonDisabled,
  } = useGame()

  return (
    <main className="h-[100dvh] w-full overflow-hidden bg-[#4a7f2a] text-[#e2c8a0] font-mono selection:bg-amber-900 selection:text-amber-100 relative flex flex-col">
      <GameHeader
        onLeaderboard={ui.toggleLeaderboard}
        onInfo={ui.toggleInfo}
        onMenu={ui.openMenu}
        showLeaderboard={ui.showLeaderboard}
        showInfo={ui.showInfo}
      />
      {ui.showGameMenu && (
        <GameMenu
          onClose={ui.closeMenu}
          onProfile={() => router.push('/profile')}
          onMainMenu={() => { startNew(); router.push('/menu') }}
          onLogout={() => router.push('/auth')}
        />
      )}
      <section className="relative min-h-0 flex-1 overflow-hidden">
        {/* Сцену не создаём, пока не решено, продолжать сохранение или нет. */}
        {!checkingSession && !resuming && <GameCanvas key={mapSeed} mapSeed={mapSeed} />}
        {checkingSession && (
          <div className="absolute inset-0 z-[95] flex items-center justify-center bg-[#0f0a05]/70">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">Загрузка…</p>
          </div>
        )}
        <MiniMap pathCells={new Set(game.pathCells)} towerCells={game.towerCells} towers={game.towers} viewport={game.viewport ?? undefined} />
      </section>

      <GameOverlays
        gameOver={game.gameOver}
        resuming={resuming}
        upgradeCards={upgradeCards}
        game={{
          wave: game.wave,
          gold: game.gold,
          lives: game.lives,
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
        onBackToMenu={() => router.push('/menu')}
        onPickUpgrade={pickUpgrade}
        onUpgrade={upgradeTower}
        onSell={sellTower}
        onDeselect={deselectTower}
        showInfo={ui.showInfo}
        onCloseInfo={ui.closeInfo}
      />

      <GameHUD
        gold={game.gold}
        lives={game.lives}
        wave={game.wave}
        waveActive={game.waveActive}
        gameOver={game.gameOver}
        selectedTower={game.selectedTower}
        status={game.status}
        onSelectTower={selectTower}
        onStartWave={startWave}
        onRestart={restartGame}
        waveButtonDisabled={waveButtonDisabled}
      />
    </main>
  )
}
