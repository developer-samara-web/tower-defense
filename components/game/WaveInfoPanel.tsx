'use client'

import CloseButton from '@/components/ui/CloseButton'
import type { WavePreview } from '@/features/game/engine/wave-preview'

type Props = {
  preview: WavePreview
  live: {
    waveActive: boolean
    nextWaveIn: number
    spawned: number
    alive: number
  }
  onClose: () => void
}

// Панель «Информация»: что принёс текущий (или следующий) поход —
// состав волны и характеристики каждого вида монстров.
export default function WaveInfoPanel({ preview, live, onClose }: Props) {
  const status = live.waveActive
    ? 'Волна идёт'
    : live.nextWaveIn > 0
      ? `Следующая через ${live.nextWaveIn} с`
      : 'Ждёт запуска'

  const waveRows = [
    { label: 'Монстров в волне', value: String(preview.total) },
    { label: 'Выпущено', value: `${live.spawned} / ${preview.total}` },
    { label: 'Живых на поле', value: String(live.alive) },
    { label: 'Награда за волну', value: `${preview.reward} 🪙` },
    preview.custom
      ? { label: 'Поток', value: `каждые ${(preview.spawnInterval / 1000).toFixed(2)} с` }
      : {
          label: 'Группы',
          value: `по ${preview.groupSize}, пауза ${(preview.spawnInterval / 1000).toFixed(2)} с`,
        },
  ]

  return (
    <div className="absolute bottom-full right-0 z-40 mb-1.5 w-[300px] max-w-[92vw] rounded-none border-2 border-[#79552c] bg-[#0f0a05]/95 shadow-[0_8px_24px_rgba(0,0,0,0.65),0_3px_0_#2a1d0a] backdrop-blur-md sm:mb-2">
      <div className="flex items-center justify-between gap-2 border-b border-[#3c2a16] px-2.5 py-2">
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-amber-300">
            Волна {preview.wave}
          </span>
          <span className="truncate text-[8px] font-bold uppercase tracking-[0.12em] text-[#8a7340]">
            {status}
          </span>
        </div>
        <CloseButton onClick={onClose} label="Закрыть информацию о волне" />
      </div>

      <dl className="px-2.5 py-1.5">
        {waveRows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-2 border-b border-[#3c2a16]/70 py-[3px] last:border-b-0"
          >
            <dt className="min-w-0 text-[8px] font-black uppercase tracking-[0.12em] text-[#8a7340]">
              {row.label}
            </dt>
            <dd className="whitespace-nowrap text-[10px] font-black tabular-nums text-amber-100">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="max-h-[46vh] overflow-y-auto border-t border-[#3c2a16] px-2.5 py-1.5">
        {preview.rows.length === 0 ? (
          <p className="py-2 text-center text-[9px] font-bold text-[#8a7340]">
            В этой волне монстров нет
          </p>
        ) : (
          preview.rows.map((row) => (
            <div key={row.type} className="border-b border-[#3c2a16]/70 py-1.5 last:border-b-0">
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 border border-[#0f0a05]"
                  style={{ backgroundColor: row.color }}
                />
                <span className="min-w-0 flex-1 truncate text-[9px] font-black uppercase tracking-[0.1em] text-amber-200">
                  {row.name}
                </span>
                <span className="shrink-0 text-[10px] font-black tabular-nums text-yellow-300">
                  ×{row.count}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {[
                  { label: 'HP', value: String(row.hp) },
                  { label: 'Скорость', value: `${row.speed} px/с` },
                  { label: 'Золото', value: String(row.reward) },
                  { label: 'Опыт', value: String(row.xp) },
                  { label: 'Замку', value: String(row.damage) },
                ].map((chip) => (
                  <span
                    key={chip.label}
                    className="flex items-baseline gap-1 border border-[#3c2a16] bg-[#21170d]/70 px-1 py-[1px]"
                  >
                    <span className="text-[7px] font-black uppercase tracking-[0.08em] text-[#8a7340]">
                      {chip.label}
                    </span>
                    <span className="text-[9px] font-black tabular-nums text-amber-100">
                      {chip.value}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
