'use client'

import Image from 'next/image'
import { useEffect } from 'react'

import type { PlayerProfile, PlayerScore } from '@/features/account/types'
import CloseButton from '@/components/ui/CloseButton'
import GameHistory from './GameHistory'
import { useGameHistory } from '@/hooks/useGameHistory'
import { avatarSrc, frameSrc } from '@/lib/account/avatar-options'

type Props = {
  user: PlayerProfile | null
  scores: PlayerScore[]
  onRefresh: () => void | Promise<void>
  onClose: () => void
}

export default function ProfilePanel({ user, scores, onRefresh, onClose }: Props) {
  const history = useGameHistory()

  useEffect(() => {
    void onRefresh()
  }, [onRefresh])

  const frame = frameSrc(user?.avatarFrame)
  const record = user?.record ?? 0
  const rankIndex = user ? scores.findIndex((score) => score.id === user.id) : -1
  const rank = rankIndex >= 0 ? rankIndex + 1 : null
  const wave = user?.bestWave || Math.floor(record / 25) || 1

  return (
    <div
      className="absolute inset-0 z-[85] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Статистика игрока"
    >
      <div className="max-h-[88vh] w-full max-w-md overflow-y-auto border-2 border-[#3a2a1a] bg-gradient-to-b from-[#1a1208] to-[#0f0a05] p-4 shadow-[0_0_30px_rgba(0,0,0,0.9),inset_0_0_24px_rgba(74,55,35,0.25)]">
        <div className="mb-3 flex items-center justify-between border-b border-[#3a2a1a] pb-2">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-amber-300 drop-shadow-[0_2px_0_#5c2d0e]">Статистика</h2>
          <CloseButton onClick={onClose} label="Закрыть статистику" size="md" />
        </div>

        <div className="flex items-center gap-3">
          <span className="relative block h-16 w-16 shrink-0 border-2 border-[#79502b] bg-[#0f0a05] shadow-[inset_0_0_0_2px_#21150c] sm:h-20 sm:w-20">
            <Image
              src={avatarSrc(user?.avatar)}
              alt="Аватар игрока"
              width={96}
              height={96}
              unoptimized
              className="h-full w-full [image-rendering:pixelated]"
            />
            {frame ? (
              <Image
                src={frame}
                alt=""
                width={96}
                height={96}
                unoptimized
                aria-hidden="true"
                className="absolute inset-0 h-full w-full [image-rendering:pixelated]"
              />
            ) : null}
          </span>
          <div className="min-w-0">
            <p className="text-[8px] font-black uppercase tracking-[0.24em] text-[#8a7340]">Игрок</p>
            <p className="truncate text-lg font-black uppercase tracking-[0.08em] text-amber-200 drop-shadow-[0_2px_0_#5c2d0e]">
              {user?.login || 'Герой'}
            </p>
            <p className="truncate text-[10px] font-bold text-[#8a7340]">{user?.email || '—'}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="border border-[#5c3a1a] bg-[#0f0a05]/70 px-2 py-2 text-center">
            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-[#8a7340]">Рекорд</p>
            <p className="mt-1 text-sm font-black tabular-nums text-yellow-300">{record} 🪙</p>
          </div>
          <div className="border border-[#5c3a1a] bg-[#0f0a05]/70 px-2 py-2 text-center">
            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-[#8a7340]">Место в топе</p>
            <p className="mt-1 text-sm font-black tabular-nums text-amber-200">{rank ?? '—'}</p>
          </div>
          <div className="border border-[#5c3a1a] bg-[#0f0a05]/70 px-2 py-2 text-center">
            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-[#8a7340]">Волна</p>
            <p className="mt-1 text-sm font-black tabular-nums text-lime-300">{wave}</p>
          </div>
        </div>

        <div className="mt-3 border border-[#3a2a1a] bg-[#0f0a05]/60">
          <div className="flex items-center justify-between border-b border-[#3a2a1a] px-2 py-1.5">
            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">Мои игры</span>
            <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-[#8a7340]">Последние результаты</span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            <GameHistory
              games={history.games}
              hasMore={history.hasMore}
              loading={history.loading}
              loadingMore={history.loadingMore}
              error={history.error}
              locked={history.locked}
              onLoadMore={history.loadMore}
              onRetry={history.refresh}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full border-2 border-[#6b8e32] bg-gradient-to-b from-[#527c28] to-[#304d19] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-lime-100 shadow-[inset_0_1px_0_#a3cf65,0_3px_0_#100904] transition-colors hover:from-[#628e33] hover:to-[#3d6022] active:translate-y-[1px] active:shadow-[0_1px_0_#100904] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400"
        >
          Вернуться в игру
        </button>
      </div>
    </div>
  )
}
