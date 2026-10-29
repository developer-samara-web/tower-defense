import Image from 'next/image'
import type { ReactNode } from 'react'
import { TOWER_TYPES, type TowerType } from '@/features/game/config/game.config'
import { towerStats, type TowerBuffs } from '@/features/game/domain/game-rules'

type Props = {
  gold: number
  lives: number
  // Прочность замка на старте: у пользовательской карты она своя.
  maxLives: number
  wave: number
  waveActive: boolean
  gameOver: boolean
  selectedTower: TowerType | null
  status: string
  level: number
  xp: number
  xpToNextLevel: number
  buffs: TowerBuffs
  minimap?: ReactNode
  onSelectTower: (id: TowerType) => void
  onStartWave: () => void
  onRestart: () => void
  waveButtonDisabled: boolean
}

const towerDefs = (
  Object.entries(TOWER_TYPES) as [TowerType, (typeof TOWER_TYPES)[TowerType]][]
).map(([id, tower], index) => ({
  id,
  name: tower.name,
  cost: tower.cost,
  key: String(index + 1),
  image: tower.image,
}))

export default function GameHUD({
  gold, lives, maxLives, wave, waveActive, gameOver, selectedTower,
  status, level, xp, xpToNextLevel, buffs, minimap,
  onSelectTower, onStartWave, onRestart, waveButtonDisabled,
}: Props) {
  const xpPercent = xpToNextLevel > 0 ? Math.max(0, Math.min(100, (xp / xpToNextLevel) * 100)) : 0
  const livesTotal = Math.max(1, maxLives)
  const livesRatio = lives / livesTotal
  const livesPercent = Math.max(0, Math.min(100, livesRatio * 100))
  return (
    <>
      {/* Status above bar */}
      <div className="absolute left-1/2 bottom-[114px] sm:bottom-[172px] -translate-x-1/2 z-30 w-full max-w-[640px] px-2 pointer-events-none">
        <div className="flex justify-center">
          <div className="rounded-none bg-[#0f0a05]/90 border-[3px] border-[#2a1d0a] px-4 py-1 shadow-[4px_4px_0_#1a0f05,0_0_0_#000] backdrop-blur-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#f5e6c8] drop-shadow-[0_2px_4px_rgba(0,0,0,1),0_1px_0_#5c2d0e]">{status}</p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-[16px] sm:bottom-[50px] left-1/2 z-40 w-[98vw] sm:w-max max-w-[calc(100vw-16px)] sm:max-w-[calc(100vw-24px)] -translate-x-1/2 px-1 sm:px-2">
        <div className="relative rounded-b-sm border-2 border-[#79552c] bg-[#0f0a05]/90 shadow-[0_8px_24px_rgba(0,0,0,0.65),0_3px_0_#2a1d0a,0_0_14px_rgba(0,0,0,0.25)] backdrop-blur-md">
          <div className="flex min-w-0 items-stretch gap-1.5 p-1.5 sm:gap-2 sm:p-2">
            {/* Minimap */}
            {minimap}

            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:w-[244px] sm:flex-none sm:gap-1.5">
              {/* Health and experience */}
              <div className="flex flex-col gap-1 border-b-2 border-[#3c2a16] pb-1">
                {/* Health */}
                <div className="group relative h-[12px] sm:h-[14px] w-full overflow-hidden border-2 border-[#68451f] bg-[#21100c] shadow-[inset_0_1px_3px_#000]" role="progressbar" aria-label="Здоровье замка" aria-valuemin={0} aria-valuemax={livesTotal} aria-valuenow={Math.max(0, Math.min(livesTotal, lives))}>
                  <div className={`absolute inset-y-0 left-0 transition-[width] duration-300 ${livesRatio <= 0.25 ? 'bg-[#e53935]' : livesRatio <= 0.5 ? 'bg-[#f2b632]' : 'bg-[#65c943]'}`} style={{ width: `${livesPercent}%` }}>
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-white/30" />
                  </div>
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[8px] font-black tabular-nums text-white/90 drop-shadow-[0_1px_1px_#000] transition-opacity duration-150 group-hover:opacity-0">{Math.max(0, lives)} / {livesTotal}</span>
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    <span className="bg-[#0b0703]/85 px-2 py-[1px] text-[8px] font-black uppercase tracking-[0.14em] text-[#f5cf9a]">Здоровье замка</span>
                  </span>
                </div>
                {/* Experience */}
                <div className="group relative h-[12px] sm:h-[14px] w-full overflow-hidden border-2 border-[#4c3a6b] bg-[#120d22] shadow-[inset_0_1px_3px_#000]" role="progressbar" aria-label={`Опыт уровня ${level}`} aria-valuemin={0} aria-valuemax={xpToNextLevel} aria-valuenow={Math.min(xp, xpToNextLevel)}>
                  <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-700 to-fuchsia-400 transition-[width] duration-300" style={{ width: `${xpPercent}%` }}>
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-white/30" />
                  </div>
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[8px] font-black tabular-nums text-white/90 drop-shadow-[0_1px_1px_#000] transition-opacity duration-150 group-hover:opacity-0">{xp} / {xpToNextLevel}</span>
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    <span className="bg-[#0b0703]/85 px-2 py-[1px] text-[8px] font-black uppercase tracking-[0.14em] text-violet-200">Опыт · уровень {level}</span>
                  </span>
                </div>
              </div>

              {/* Tower cards */}
              <div className="grid min-w-0 grid-cols-3 gap-1 sm:gap-2">
                {towerDefs.map((tower) => {
                  const isSelected = selectedTower === tower.id
                  const canAfford = gold >= tower.cost
                  const stats = towerStats(tower.id, 1, buffs)
                  const statRows = [
                    { label: 'Урон', value: String(stats.damage), tone: 'text-amber-100' },
                    { label: 'Радиус', value: String(stats.range), tone: 'text-amber-100' },
                    { label: 'Перезарядка', value: `${(stats.attackSpeed / 1000).toFixed(2)} с`, tone: 'text-amber-100' },
                    stats.crit > 0 && { label: 'Крит', value: `${Math.round(stats.crit * 100)}%`, tone: 'text-yellow-300' },
                    stats.burn > 0 && { label: 'Поджог', value: `${stats.burn}/с`, tone: 'text-orange-300' },
                    stats.chain > 0 && { label: 'Цепь', value: `+${stats.chain}`, tone: 'text-sky-300' },
                    stats.execute > 0 && { label: 'Добивание', value: `${Math.round(stats.execute * 100)}%`, tone: 'text-rose-300' },
                  ].filter((row): row is { label: string; value: string; tone: string } => Boolean(row))
                  return (
                    <button
                      key={tower.id}
                      type="button"
                      onClick={() => onSelectTower(tower.id as TowerType)}
                      aria-label={`${tower.name}, цена ${tower.cost} золота`}
                      aria-pressed={isSelected}
                      className={`group relative flex h-[38px] sm:h-[48px] w-full flex-col items-center justify-center border-2 transition-colors cursor-pointer ${isSelected ? 'border-yellow-400 bg-[#493713] shadow-[0_0_8px_#eab30866]' : 'border-[#5c3a1a] bg-[#21170d] hover:border-[#a67c36] hover:bg-[#352411]'}`}
                    >
                      <Image src={tower.image} alt={tower.name} width={30} height={30} className="h-[22px] w-[22px] sm:h-[30px] sm:w-[30px] object-contain [image-rendering:pixelated]" />
                      <span className={`mt-0.5 max-w-full truncate px-1 text-[8px] sm:text-[10px] font-bold leading-none ${isSelected ? 'text-yellow-200' : 'text-[#d6c4a3]'}`}>{tower.name}</span>
                      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-[196px] -translate-x-1/2 translate-y-1 border-2 border-[#3a2a1a] bg-[#0f0a05]/95 px-2.5 py-2 text-left opacity-0 shadow-[0_8px_20px_rgba(0,0,0,0.85)] backdrop-blur-sm transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                        <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-amber-300">{tower.name}</span>
                        <span className="mt-1 flex flex-col gap-[3px] border-t border-[#3a2a1a] pt-1">
                          {statRows.map((row) => (
                            <span key={row.label} className="flex items-baseline justify-between gap-3">
                              <span className="text-[8px] font-black uppercase tracking-[0.12em] text-[#8a7340]">{row.label}</span>
                              <span className={`whitespace-nowrap text-[10px] font-black tabular-nums ${row.tone}`}>{row.value}</span>
                            </span>
                          ))}
                          <span className="mt-0.5 flex items-baseline justify-between gap-3 border-t border-[#3a2a1a] pt-1">
                            <span className="text-[8px] font-black uppercase tracking-[0.12em] text-[#8a7340]">Цена</span>
                            <span className={`whitespace-nowrap text-[10px] font-black tabular-nums ${canAfford ? 'text-yellow-300' : 'text-red-300'}`}>🪙 {tower.cost}</span>
                          </span>
                        </span>
                        <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b-2 border-r-2 border-[#3a2a1a] bg-[#0f0a05]" />
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Gold and wave */}
            <div className="flex w-[96px] sm:w-[124px] shrink-0 flex-col gap-1">
              <div className="flex min-h-[30px] sm:min-h-[34px] w-full flex-1 items-center justify-center gap-1 border-2 border-[#8b651f] bg-gradient-to-b from-[#49300e] to-[#241606] px-1 shadow-[inset_0_1px_0_#c99b3b] sm:gap-1.5">
                <span className="text-base leading-none">🪙</span>
                <div className="flex flex-col items-center text-center leading-none">
                  <span className="text-[7px] font-bold uppercase leading-none tracking-wider text-[#c5a76b] sm:text-[8px]">Золото</span>
                  <span className="text-sm font-black leading-none tabular-nums text-yellow-300 sm:text-base">{gold}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={gameOver ? onRestart : onStartWave}
                disabled={waveButtonDisabled}
                className={`flex min-h-[42px] sm:min-h-[48px] w-full flex-1 flex-col items-center justify-center border-2 px-1 text-center font-black transition-colors ${gameOver ? 'border-red-400 bg-red-900 text-red-100 hover:bg-red-800' : waveActive ? 'cursor-not-allowed border-[#5c3a1a] bg-[#21170d] text-[#8c785a]' : 'border-[#6b8e32] bg-gradient-to-b from-[#527c28] to-[#304d19] text-lime-100 shadow-[inset_0_1px_0_#a3cf65] hover:from-[#628e33] hover:to-[#3d6022]'}`}
              >
                <span className="text-[9px] sm:text-[11px] uppercase leading-tight tracking-wide">{gameOver ? 'Заново' : waveActive ? 'Волна идёт' : wave > 0 ? 'Завершено' : 'Начать волну'}</span>
                {!gameOver && <span className="mt-0.5 text-[8px] sm:text-[10px] font-semibold opacity-80">{waveActive ? `Волна ${wave}` : wave > 0 ? `Волна ${wave}` : `Волна 1`}</span>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
