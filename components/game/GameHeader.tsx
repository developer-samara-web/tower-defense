import Image from 'next/image'

type Props = {
  onLeaderboard: () => void
  onInfo: () => void
  onMenu: () => void
  showLeaderboard: boolean
  showInfo: boolean
}

export default function GameHeader({ onLeaderboard, onInfo, onMenu, showLeaderboard, showInfo }: Props) {
  return (
    <>
      <div className="absolute top-3 left-3 z-40 pointer-events-none drop-shadow-lg">
        <Image src="/game/logo.png" alt="Logo" width={120} height={60} className="opacity-90" />
      </div>

      <div className="absolute top-3 right-3 z-40 flex items-center gap-2">
        <button
          onClick={onLeaderboard}
          className="group relative flex h-10 w-10 items-center justify-center border-2 border-[#79502b] bg-[#21150c] text-amber-300 shadow-[inset_0_1px_0_rgba(255,220,150,0.15),0_3px_0_#100904,0_5px_10px_rgba(0,0,0,0.45)] transition-all duration-150 hover:border-yellow-400 hover:bg-[#493713] hover:text-yellow-200 hover:shadow-[inset_0_1px_0_rgba(255,220,150,0.2),0_3px_0_#100904,0_0_12px_rgba(250,204,21,0.25)] active:translate-y-[2px] active:shadow-[0_1px_0_#100904] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          aria-label="Топ игроков" title="Топ игроков" aria-expanded={showLeaderboard}
        >
          <span className="pointer-events-none absolute inset-[3px] border border-[#79502b]/40 transition-colors group-hover:border-yellow-400/40" />
          <svg viewBox="0 0 24 24" className="relative h-[21px] w-[21px] transition-transform duration-200 group-hover:scale-110" fill="none" aria-hidden="true">
            <path d="M7 3H17L15 10H9L7 3Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="miter" />
            <path d="M8 10L6 20L12 16L18 20L16 10" fill="#9b6729" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="miter" />
            <path d="M12 5L13.2 7.4L15.8 7.8L13.9 9.6L14.4 12.2L12 10.9L9.6 12.2L10.1 9.6L8.2 7.8L10.8 7.4L12 5Z" fill="currentColor" stroke="currentColor" strokeWidth="0.5" strokeLinejoin="miter" />
          </svg>
          {showLeaderboard && <span className="absolute -right-[3px] -top-[3px] h-2 w-2 border border-[#21150c] bg-yellow-400 shadow-[0_0_5px_#facc15]" />}
        </button>

        <button
          onClick={onInfo}
          className="group relative flex h-10 w-10 items-center justify-center border-2 border-[#79502b] bg-[#21150c] text-amber-300 shadow-[inset_0_1px_0_rgba(255,220,150,0.15),0_3px_0_#100904,0_5px_10px_rgba(0,0,0,0.45)] transition-all duration-150 hover:border-sky-400 hover:bg-[#1b2b33] hover:text-sky-200 hover:shadow-[inset_0_1px_0_rgba(150,220,255,0.18),0_3px_0_#100904,0_0_12px_rgba(56,189,248,0.25)] active:translate-y-[2px] active:shadow-[0_1px_0_#100904] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          aria-label="Информация об управлении" title="Управление" aria-expanded={showInfo}
        >
          <span className="pointer-events-none absolute inset-[3px] border border-[#79502b]/40 transition-colors group-hover:border-sky-400/40" />
          <svg viewBox="0 0 24 24" className="relative h-[21px] w-[21px] transition-transform duration-200 group-hover:scale-110" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            <path d="M12 11V17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" />
            <rect x="11" y="6.4" width="2" height="2.6" fill="currentColor" />
          </svg>
          {showInfo && <span className="absolute -right-[3px] -top-[3px] h-2 w-2 border border-[#21150c] bg-sky-400 shadow-[0_0_5px_#38bdf8]" />}
        </button>

        <button
          onClick={onMenu}
          className="group relative flex h-10 w-10 items-center justify-center border-2 border-[#79502b] bg-[#21150c] text-amber-300 shadow-[inset_0_1px_0_rgba(255,220,150,0.15),0_3px_0_#100904,0_5px_10px_rgba(0,0,0,0.45)] transition-all duration-150 hover:border-amber-400 hover:bg-[#493713] hover:text-yellow-200 hover:shadow-[inset_0_1px_0_rgba(255,220,150,0.2),0_3px_0_#100904,0_0_12px_rgba(250,204,21,0.25)] active:translate-y-[2px] active:shadow-[0_1px_0_#100904] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          aria-label="Меню игры" title="Меню игры"
        >
          <span className="pointer-events-none absolute inset-[3px] border border-[#79502b]/40 transition-colors group-hover:border-yellow-400/40" />
          <svg viewBox="0 0 16 16" className="relative h-5 w-5 transition-transform duration-150 group-hover:scale-110" fill="none" aria-hidden="true">
            <path d="M3 4H13M3 8H13M3 12H13" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
          </svg>
        </button>
      </div>
    </>
  )
}
