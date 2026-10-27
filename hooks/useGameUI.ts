import { useState, useCallback } from 'react'

export function useGameUI() {
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [showGameMenu, setShowGameMenu] = useState(false)

  const toggleLeaderboard = useCallback(() => {
    setShowLeaderboard((prev) => {
      const next = !prev
      if (next) setShowInfo(false)
      return next
    })
  }, [])

  const toggleInfo = useCallback(() => {
    setShowInfo((prev) => {
      const next = !prev
      if (next) setShowLeaderboard(false)
      return next
    })
  }, [])

  const openMenu = useCallback(() => {
    setShowGameMenu(true)
    setShowInfo(false)
    setShowLeaderboard(false)
  }, [])

  const closeMenu = useCallback(() => setShowGameMenu(false), [])

  return {
    showLeaderboard,
    showInfo,
    showGameMenu,
    toggleLeaderboard,
    toggleInfo,
    openMenu,
    closeMenu,
    closeLeaderboard: () => setShowLeaderboard(false),
    closeInfo: () => setShowInfo(false),
  }
}
