'use client'

import { useEffect, useRef, useState } from 'react'

import type { TutorialGame, TutorialStep } from '@/lib/tutorial/steps'
import { TUTORIAL_STEPS } from '@/lib/tutorial/steps'
import { tutorialCellCenter } from '@/lib/tutorial/tutorial-map'

type Props = {
  game: TutorialGame
  onExit: () => void
  onRandomGame: () => void
  onRestart: () => void
}

// Подсказка появляется и сразу требует действия — игрок не успевает её
// прочитать. Поэтому шаг проверяется не раньше, чем через выдержку.
const STEP_DWELL_MS = 1400
// Снимок боя приходит десять раз в секунду, проверять чаще нет смысла.
const CHECK_INTERVAL_MS = 250
// Подсказка указывает на конкретную клетку, а тренировочное поле целиком
// влезает в окно: без приближения камера не сойдётся с указанием.
const FOCUS_ZOOM = 1.9

const PANEL =
  'pointer-events-auto w-[min(560px,92vw)] border-2 border-[#79502b] bg-[#0f0a05]/95 px-3 py-2 shadow-[0_8px_20px_rgba(0,0,0,0.7)] backdrop-blur-sm'
const BUTTON =
  'border-2 border-[#79502b] bg-[#21150c] px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-amber-200 transition-colors hover:border-amber-400 hover:text-amber-50'

export default function TutorialHints({ game, onExit, onRandomGame, onRestart }: Props) {
  const [index, setIndex] = useState(0)
  const [skipped, setSkipped] = useState(false)
  // Снимок держим в ref: шаг проверяется по таймеру, а не на каждый его
  // обновлении, иначе эффект перезапускался бы десять раз в секунду.
  const gameRef = useRef(game)

  useEffect(() => {
    gameRef.current = game
  }, [game])

  const step: TutorialStep | undefined = TUTORIAL_STEPS[index]

  // Новый шаг обязан показать камеру на том месте, о котором говорит текст.
  useEffect(() => {
    const current = TUTORIAL_STEPS[index]
    if (!current?.focus) return
    const [x, y] = current.focus
    window.dispatchEvent(
      new CustomEvent('td:camera-focus', {
        detail: { ...tutorialCellCenter(x, y), zoom: FOCUS_ZOOM },
      }),
    )
  }, [index])

  // Шаг закрывается, только когда игрок сделал то, о чём просили.
  useEffect(() => {
    const current = TUTORIAL_STEPS[index]
    if (skipped || !current?.done) return

    const shownAt = Date.now()
    const timer = setInterval(() => {
      if (Date.now() - shownAt < STEP_DWELL_MS) return
      if (!current.done!(gameRef.current)) return
      clearInterval(timer)
      setIndex((value) => value + 1)
    }, CHECK_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [index, skipped])

  if (game.victory) {
    return (
      <div className="pointer-events-none absolute inset-0 z-[96] flex items-center justify-center bg-[#0f0a05]/70 px-4">
        <div className={`${PANEL} text-center`}>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-lime-300">
            Обучение пройдено
          </p>
          <p className="mt-1.5 text-[10px] font-bold leading-snug text-amber-100">
            Пять волн отбиты: башни ставятся, улучшаются и ждут своё золото в очереди.
            Дальше — обычная карта или рейтинг.
          </p>
          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
            <button
              type="button"
              className={BUTTON}
              onClick={() => {
                // Рестарт не пересоздаёт компонент, поэтому шаги сбрасываем сами.
                setIndex(0)
                setSkipped(false)
                onRestart()
              }}
            >
              Пройти заново
            </button>
            <button type="button" className={BUTTON} onClick={onRandomGame}>
              Обычная игра
            </button>
            <button type="button" className={BUTTON} onClick={onExit}>
              В меню
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (skipped || !step) return null

  return (
    <div className="pointer-events-none absolute bottom-[148px] left-1/2 z-[92] -translate-x-1/2 px-2 sm:bottom-[208px]">
      <div className={PANEL}>
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-300">
            {step.title}
          </p>
          <p className="text-[8px] font-black uppercase tracking-[0.12em] text-[#8a7340]">
            Шаг {index + 1} / {TUTORIAL_STEPS.length}
          </p>
        </div>
        <p className="mt-1 text-[10px] font-bold leading-snug text-amber-100">{step.text}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          {step.done ? (
            <span className="text-[8px] font-black uppercase tracking-[0.12em] text-[#8a7340]">
              Выполни действие на поле
            </span>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-1.5">
            {!step.done && (
              <button type="button" className={BUTTON} onClick={() => setIndex((value) => value + 1)}>
                Дальше
              </button>
            )}
            <button type="button" className={BUTTON} onClick={() => setSkipped(true)}>
              Пропустить
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
