import Image from 'next/image'
import { TOWER_TYPES, type TowerType } from '@/features/game/config/game.config'

type Props = {
  gold: number
  lives: number
  wave: number
  waveActive: boolean
  gameOver: boolean
  selectedTower: TowerType | null
  status: string
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
  gold, lives, wave, waveActive, gameOver, selectedTower,
  status, onSelectTower, onStartWave, onRestart, waveButtonDisabled,
}: Props) {
  return (
    <>
      {/* Status above bar */}
      <div className="absolute bottom-[140px] left-1/2 -translate-x-1/2 z-30 w-full max-w-[640px] px-2 pointer-events-none">
        <div className="flex justify-center">
          <div className="rounded-none bg-[#0f0a05]/90 border-[3px] border-[#2a1d0a] px-4 py-1 shadow-[4px_4px_0_#1a0f05,0_0_0_#000] backdrop-blur-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#f5e6c8] drop-shadow-[0_2px_4px_rgba(0,0,0,1),0_1px_0_#5c2d0e]">{status}</p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-[16px] sm:bottom-[50px] left-1/2 z-40 w-[98vw] sm:w-max max-w-[calc(100vw-16px)] sm:max-w-[calc(100vw-24px)] -translate-x-1/2 px-1 sm:px-2">
        {/* HP */}
        <div className="relative h-[13px] w-full overflow-hidden border-2 border-[#68451f] bg-[#21100c] shadow-[inset_0_1px_3px_#000]" role="progressbar" aria-label="Здоровье замка" aria-valuemin={0} aria-valuemax={20} aria-valuenow={Math.max(0, Math.min(20, lives))}>
          <div className={`absolute inset-y-0 left-0 transition-[width] duration-300 ${lives / 20 <= 0.25 ? 'bg-[#e53935]' : lives / 20 <= 0.5 ? 'bg-[#f2b632]' : 'bg-[#65c943]'}`} style={{ width: `${Math.max(0, Math.min(100, (lives / 20) * 100))}%` }}>
            <div className="absolute inset-x-0 top-0 h-[2px] bg-white/30" />
          </div>
          <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(to right, transparent 0, transparent calc(5% - 1px), #21100c calc(5% - 1px), #21100c 5%)' }} />
          <div className="pointer-events-none absolute inset-0 border-t border-white/10 border-b border-black/40" />
        </div>

        <div className="relative flex h-[52px] sm:h-[72px] max-w-full items-center gap-1.5 sm:gap-2 rounded-b-sm border-2 border-t-0 border-[#79552c] bg-[#0f0a05]/90 px-1.5 sm:px-2 shadow-[0_8px_24px_rgba(0,0,0,0.65),0_3px_0_#2a1d0a,0_0_14px_rgba(0,0,0,0.25)] backdrop-blur-md">
          {/* Gold */}
          <div className="flex h-[36px] sm:h-[48px] shrink-0 items-center gap-1.5 sm:gap-2 border border-[#8b651f] bg-gradient-to-b from-[#49300e] to-[#241606] px-2 sm:px-3 shadow-[inset_0_1px_0_#c99b3b]">
            <span className="text-xl drop-shadow-[0_0_5px_#facc15]">🪙</span>
            <div className="flex flex-col leading-tight">
              <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-[#c5a76b]">Золото</span>
              <span className="text-sm sm:text-base font-black tabular-nums text-yellow-300 drop-shadow-[0_0_4px_#ca8a04]">{gold}</span>
            </div>
          </div>

          <div className="h-8 sm:h-10 w-px shrink-0 bg-[#5c3a1a]" />

          {/* Tower cards */}
          <div className="flex min-w-0 items-center gap-1 sm:gap-2">
            {towerDefs.map((tower) => {
              const isSelected = selectedTower === tower.id
              const canAfford = gold >= tower.cost
              return (
                <button
                  key={tower.id}
                  type="button"
                  onClick={() => onSelectTower(tower.id as TowerType)}
                  title={tower.name}
                  aria-label={`${tower.name}, цена ${tower.cost} золота`}
                  aria-pressed={isSelected}
                  className={`group relative flex h-[38px] sm:h-[48px] w-[60px] sm:w-[76px] shrink-0 flex-col items-center justify-center border-2 transition-colors cursor-pointer ${isSelected ? 'border-yellow-400 bg-[#493713] shadow-[0_0_8px_#eab30866]' : 'border-[#5c3a1a] bg-[#21170d] hover:border-[#a67c36] hover:bg-[#352411]'}`}
                >
                  <Image src={tower.image} alt={tower.name} width={30} height={30} className="h-[22px] w-[22px] sm:h-[30px] sm:w-[30px] object-contain [image-rendering:pixelated]" />
                  <span className={`mt-0.5 max-w-full truncate px-1 text-[8px] sm:text-[10px] font-bold leading-none ${isSelected ? 'text-yellow-200' : 'text-[#d6c4a3]'}`}>{tower.name}</span>
                  <span className={`pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 translate-y-1 opacity-0 transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 ${canAfford ? 'border border-[#a67c36] bg-[#eabf4b] text-[#38230a]' : 'border border-[#79503a] bg-[#34251b] text-red-300'} whitespace-nowrap px-3 py-1.5 text-xs font-black shadow-[2px_3px_0_#1a1006]`}>
                    🪙 {tower.cost} золота
                    <span className={`absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r ${canAfford ? 'border-[#a67c36] bg-[#eabf4b]' : 'border-[#79503a] bg-[#34251b]'}`} />
                  </span>
                </button>
              )
            })}
          </div>

          <div className="h-8 sm:h-10 w-px shrink-0 bg-[#5c3a1a]" />

          {/* Wave button */}
          <button
            type="button"
            onClick={gameOver ? onRestart : onStartWave}
            disabled={waveButtonDisabled}
            className={`flex h-[42px] sm:h-[48px] shrink-0 flex-col items-center justify-center border-2 px-2 sm:px-3 text-center font-black transition-colors ${gameOver ? 'border-red-400 bg-red-900 text-red-100 hover:bg-red-800' : waveActive ? 'cursor-not-allowed border-[#5c3a1a] bg-[#21170d] text-[#8c785a]' : 'border-[#6b8e32] bg-gradient-to-b from-[#527c28] to-[#304d19] text-lime-100 shadow-[inset_0_1px_0_#a3cf65] hover:from-[#628e33] hover:to-[#3d6022]'}`}
          >
            <span className="text-[9px] sm:text-[11px] uppercase tracking-wide">{gameOver ? 'Заново' : waveActive ? 'Волна идёт' : wave > 0 ? 'Следующая волна' : 'Начать волну'}</span>
            {!gameOver && <span className="mt-0.5 text-[8px] sm:text-[10px] font-semibold opacity-80">{waveActive ? `Волна ${wave}` : wave > 0 ? `Волна ${wave}` : `Волна 1`}</span>}
          </button>
        </div>
      </div>
    </>
  )
}
