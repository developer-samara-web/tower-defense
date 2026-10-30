import { TOWER_TYPES } from '@/features/game/config/game.config'
import {
  RARITY_NAME,
  type UpgradeCard,
  type UpgradeRarity,
} from '@/features/game/domain/upgrade-cards'
import CloseButton from '@/components/ui/CloseButton'
import PlayerAvatar from '@/components/ui/PlayerAvatar'
import PlayerTitle from '@/components/ui/PlayerTitle'
import { NO_TITLE } from '@/lib/account/title-options'
import type { PlayerScore } from '@/features/account/types'
import { SelectedTowerInfo } from '@/types'
import TowerDetails from './TowerDetails'

// Цветовые схемы карточек по редкости: S — золото, A — фиолет,
// B — тёмно-синий, C — синий.
const RARITY_STYLE: Record<
  UpgradeRarity,
  { card: string; badge: string; accent: string }
> = {
  S: {
    card: 'border-[#a97b1f] bg-gradient-to-b from-[#3a2a08] to-[#171109] shadow-[inset_0_0_18px_rgba(250,204,21,0.14)] hover:border-yellow-300',
    badge: 'border-[#a97b1f] bg-[#4a3408] text-amber-200',
    accent: 'text-amber-300',
  },
  A: {
    card: 'border-[#6d4b9e] bg-gradient-to-b from-[#241a3a] to-[#12101c] shadow-[inset_0_0_16px_rgba(167,139,250,0.12)] hover:border-purple-300',
    badge: 'border-[#7a5bb0] bg-[#2e1f4a] text-purple-200',
    accent: 'text-purple-300',
  },
  B: {
    card: 'border-[#2f4f7a] bg-gradient-to-b from-[#111d2e] to-[#0b0f16] shadow-[inset_0_0_16px_rgba(59,130,246,0.12)] hover:border-sky-400',
    badge: 'border-[#3a6390] bg-[#15263c] text-sky-200',
    accent: 'text-sky-300',
  },
  C: {
    card: 'border-[#2c566e] bg-gradient-to-b from-[#0f2028] to-[#0b0f16] shadow-[inset_0_0_16px_rgba(34,211,238,0.1)] hover:border-cyan-400',
    badge: 'border-[#2f6a7f] bg-[#12303c] text-cyan-200',
    accent: 'text-cyan-300',
  },
}

type Props = {
  gameOver: boolean
  resuming: boolean
  upgradeCards: UpgradeCard[]
  game: {
    wave: number
    gold: number
    lives: number
    level: number
    stats?: { monstersKilled: number; buildingsBuilt: number; moneySpent: number; damageDealt: number }
    selectedBuiltTower?: SelectedTowerInfo | null
    panelPosition?: { x: number; y: number } | null
  }
  scores: PlayerScore[]
  showLeaderboard: boolean
  onCloseLeaderboard: () => void
  onResume: () => void
  onStartNew: () => void
  onRestart: () => void
  confirmRestart: boolean
  onConfirmRestart: () => void
  onCancelRestart: () => void
  onBackToMenu: () => void
  onPickUpgrade: (card: UpgradeCard) => void
  onUpgrade: () => void
  onToggleAutoUpgrade: () => void
  onSell: () => void
  onDeselect: () => void
  showInfo: boolean
  onCloseInfo: () => void
}

export default function GameOverlays({
  gameOver, resuming, upgradeCards, game, scores,
  showLeaderboard, onCloseLeaderboard, onResume, onStartNew,
  onRestart, confirmRestart, onConfirmRestart, onCancelRestart,
  onBackToMenu, onPickUpgrade, onUpgrade, onToggleAutoUpgrade, onSell,
  onDeselect, showInfo, onCloseInfo,
}: Props) {
  return (
    <>
      {/* Leaderboard mini overlay */}
      {showLeaderboard && (
        <div className="absolute top-[60px] right-3 z-50 w-56 rounded-none border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208] to-[#0f0a05] shadow-[0_8px_24px_rgba(0,0,0,0.9)] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#3a2a1a]/60 px-2 py-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-300">Топ</span>
            <CloseButton onClick={onCloseLeaderboard} label="Закрыть топ игроков" />
          </div>
          <div className="max-h-48 overflow-y-auto px-2 py-1 space-y-0.5">
            {scores.length === 0 ? (
              <p className="text-[9px] text-[#5c3a1a] font-bold px-1 py-3 text-center">Нет рекордов</p>
            ) : (
              scores.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2 text-[10px] font-bold">
                  <span className="w-4 text-center text-amber-400 font-black">{i + 1}</span>
                  <PlayerAvatar avatar={s.avatar} frame={s.avatarFrame} size={20} alt="" bordered={false} />
                  <span className="flex min-w-0 flex-1 flex-col leading-tight">
                    <span className="truncate text-amber-100">{s.login || 'Герой'}</span>
                    {s.title && s.title !== NO_TITLE ? (
                      <PlayerTitle title={s.title} className="truncate text-[7px] tracking-[0.1em]" />
                    ) : null}
                  </span>
                  <span className="ml-auto shrink-0 text-amber-300 tabular-nums">{s.wave}в · {s.gold}з</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Info overlay */}
      {showInfo && (
        <div className="absolute top-[60px] right-3 z-50 w-60 max-h-[70vh] overflow-y-auto rounded-none border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208] to-[#0f0a05] shadow-[0_8px_24px_rgba(0,0,0,0.9)]">
          <div className="sticky top-0 flex items-center justify-between border-b border-[#3a2a1a]/60 bg-[#1a1208] px-3 py-2">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-sky-300">Управление</span>
            <CloseButton onClick={onCloseInfo} label="Закрыть подсказки" />
          </div>
          <div className="space-y-2 px-3 py-2">
            <div>
              <p className="mb-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#8a7340]">Камера</p>
              <ul className="space-y-1 text-[10px] font-bold leading-snug text-amber-100">
                <li><span className="text-amber-400">WASD / стрелки</span> — движение</li>
                <li><span className="text-amber-400">ПКМ / СКМ + тянуть</span> — сдвиг карты</li>
                <li><span className="text-amber-400">Колесо</span> — зум</li>
                <li><span className="text-amber-400">Край экрана</span> — прокрутка (ПК)</li>
                <li><span className="text-amber-400">Телефон</span>: свайп — камера, два пальца — зум</li>
              </ul>
            </div>
            <div className="border-t border-[#3a2a1a]/50 pt-2">
              <p className="mb-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#8a7340]">Игра</p>
              <ul className="space-y-1 text-[10px] font-bold leading-snug text-amber-100">
                <li><span className="text-amber-400">ЛКМ</span> по клетке — построить / выбрать башню</li>
                <li><span className="text-amber-400">Наведение</span> — предпросмотр выбранной башни</li>
                <li><span className="text-amber-400">1–3</span> — тип башни, <span className="text-amber-400">4 / Esc</span> — снять выбор</li>
                <li><span className="text-amber-400">U</span> — улучшить, <span className="text-amber-400">АВТО</span> в панели — рост башни без кликов</li>
                <li><span className="text-amber-400">×2 / ×3</span> сверху — ускорить бой</li>
                <li><span className="text-amber-400">Пробел</span> — запустить волну</li>
                <li><span className="text-amber-400">R</span> — рестарт после поражения</li>
              </ul>
            </div>
            <div className="border-t border-[#3a2a1a]/50 pt-2">
              <p className="text-[10px] font-bold leading-snug text-[#b5a17b]">Цель — защитить замок в центре карты и не пропустить врагов.</p>
            </div>
          </div>
        </div>
      )}

      {/* Game over overlay */}
      {gameOver && (
        <div className="absolute inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="relative w-full max-w-md rounded-none border-2 border-[#5c2d0e] bg-gradient-to-b from-[#1a1208]/95 to-[#0f0a05]/95 p-6 shadow-[0_0_40px_rgba(0,0,0,0.9),inset_0_0_30px_rgba(74,55,35,0.25)]">
            <h2 className="text-center text-xl font-black uppercase tracking-[0.2em] text-red-300 drop-shadow-[0_2px_0_#5c2d0e]">Поражение</h2>
            <div className="mt-4 space-y-3 text-[10px] font-bold leading-snug text-amber-100">
              <div className="flex justify-between border-b border-[#3a2a1a]/60 pb-1"><span>Волна</span><span className="text-yellow-300">{game.wave}</span></div>
              <div className="flex justify-between border-b border-[#3a2a1a]/60 pb-1"><span>Убито монстров</span><span className="text-yellow-300">{game.stats?.monstersKilled ?? 0}</span></div>
              <div className="flex justify-between border-b border-[#3a2a1a]/60 pb-1"><span>Построек</span><span className="text-yellow-300">{game.stats?.buildingsBuilt ?? 0}</span></div>
              <div className="flex justify-between border-b border-[#3a2a1a]/60 pb-1"><span>Потрачено золота</span><span className="text-yellow-300">{game.stats?.moneySpent ?? 0}</span></div>
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={onBackToMenu} className="flex-1 rounded-none border-2 border-[#79502b] bg-gradient-to-b from-[#2a1d0a] to-[#171109] px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-amber-100 shadow-[0_3px_0_#100904] hover:border-amber-500 hover:from-[#3a2a12] hover:text-amber-50">Главное меню</button>
              <button onClick={onRestart} className="flex-1 rounded-none border-2 border-[#6b8e32] bg-gradient-to-b from-[#527c28] to-[#304d19] px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-lime-100 shadow-[inset_0_1px_0_#a3cf65] hover:from-[#628e33] hover:to-[#3d6022]">Заново</button>
            </div>
          </div>
        </div>
      )}

      {/* Resume session overlay */}
      {resuming && (
        <div className="absolute inset-0 z-[95] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-none border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208]/95 to-[#0f0a05]/95 p-5 shadow-[0_0_30px_rgba(0,0,0,0.9)]">
            <h2 className="text-center text-lg font-black uppercase tracking-[0.2em] text-amber-300">Найдена сохранённая игра</h2>
            <p className="mt-3 text-center text-[10px] font-bold text-[#b5a17b]">Продолжить или завершить?</p>
            <div className="mt-5 flex gap-3">
              <button onClick={onResume} className="flex-1 rounded-none border-2 border-[#6b8e32] bg-gradient-to-b from-[#527c28] to-[#304d19] px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-lime-100 shadow-[inset_0_1px_0_#a3cf65]">Продолжить</button>
              <button onClick={onStartNew} className="flex-1 rounded-none border-2 border-[#5c2d0e] bg-[#2a120c]/70 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#c98b7a] hover:border-red-500 hover:text-red-300">Начать новую</button>
            </div>
          </div>
        </div>
      )}

      {/* Restart confirmation */}
      {confirmRestart && (
        <div className="absolute inset-0 z-[93] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-none border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208]/95 to-[#0f0a05]/95 p-5 shadow-[0_0_30px_rgba(0,0,0,0.9)]">
            <h2 className="text-center text-lg font-black uppercase tracking-[0.2em] text-amber-300">Начать заново?</h2>
            <p className="mt-3 text-center text-[10px] font-bold leading-snug text-[#b5a17b]">
              Вы уверены? Текущая партия будет сброшена: волна, золото, постройки и опыт вернутся к началу.
            </p>
            <div className="mt-5 flex gap-3">
              <button onClick={onConfirmRestart} className="flex-1 rounded-none border-2 border-[#6b8e32] bg-gradient-to-b from-[#527c28] to-[#304d19] px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-lime-100 shadow-[inset_0_1px_0_#a3cf65,0_3px_0_#100904] hover:from-[#628e33] hover:to-[#3d6022]">Да, заново</button>
              <button onClick={onCancelRestart} className="flex-1 rounded-none border-2 border-[#79502b] bg-[#21150c] px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-amber-200 shadow-[0_3px_0_#100904] hover:border-amber-400 hover:text-amber-50">Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade cards overlay */}
      {upgradeCards.length > 0 && !gameOver ? (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/70 p-3">
          <div className="w-full max-w-2xl border-2 border-[#5c2d0e] bg-gradient-to-b from-[#1a1208] to-[#0f0a05] p-4 shadow-[0_0_30px_rgba(0,0,0,0.9),inset_0_0_24px_rgba(74,55,35,0.25)] sm:p-5">
            <h3 className="text-center text-sm font-black uppercase tracking-[0.18em] text-amber-300 drop-shadow-[0_2px_0_#5c2d0e]">Уровень {game.level}: выбери улучшение</h3>
            <p className="mt-1 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-[#8a7340]">Шкала опыта заполнена — одна из трёх карточек усилит башни</p>
            <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
              {(['S', 'A', 'B', 'C'] as UpgradeRarity[]).map((rarity) => (
                <span key={rarity} className={`text-[9px] font-black uppercase tracking-[0.12em] ${RARITY_STYLE[rarity].accent}`}>
                  {rarity} · {RARITY_NAME[rarity]}
                </span>
              ))}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {upgradeCards.map((card) => {
                const style = RARITY_STYLE[card.rarity]
                return (
                  <button key={card.id} onClick={() => onPickUpgrade(card)} title={RARITY_NAME[card.rarity]} className={`group flex min-h-[132px] flex-col gap-2 border-2 p-3 text-left transition-all hover:-translate-y-0.5 active:translate-y-0 ${style.card}`}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="w-fit border border-[#5c2d0e] bg-[#0f0a05]/60 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.15em] text-amber-400">{TOWER_TYPES[card.type].name}</span>
                      <span className={`border px-1.5 py-0.5 text-[10px] font-black leading-none ${style.badge}`}>{card.rarity}</span>
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-[0.08em] text-amber-100">{card.name}</span>
                    <span className={`mt-auto text-[10px] font-bold ${style.accent}`}>{card.description}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* Tower details panel */}
      {game.selectedBuiltTower && (
        <div className={game.panelPosition ? 'absolute z-50 w-[232px]' : 'absolute top-14 right-3 z-50 w-[232px]'} style={game.panelPosition ? { left: game.panelPosition.x, top: game.panelPosition.y } : undefined}>
          <TowerDetails
            name={game.selectedBuiltTower.name}
            level={game.selectedBuiltTower.level}
            maxLevel={game.selectedBuiltTower.maxLevel}
            damage={game.selectedBuiltTower.damage}
            range={game.selectedBuiltTower.range}
            attackSpeed={game.selectedBuiltTower.attackSpeed}
            crit={game.selectedBuiltTower.crit}
            burn={game.selectedBuiltTower.burn}
            chain={game.selectedBuiltTower.chain}
            execute={game.selectedBuiltTower.execute}
            upgradeCost={game.selectedBuiltTower.upgradeCost}
            sellValue={game.selectedBuiltTower.sellValue}
            gold={game.gold}
            autoUpgrade={game.selectedBuiltTower.autoUpgrade}
            onUpgrade={onUpgrade}
            onToggleAutoUpgrade={onToggleAutoUpgrade}
            onSell={onSell}
            onClose={onDeselect}
          />
        </div>
      )}
    </>
  )
}
