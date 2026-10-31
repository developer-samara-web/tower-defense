import { useState, useCallback } from 'react'

export function useGameUI() {
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [showWaveInfo, setShowWaveInfo] = useState(false)
  const [showGameMenu, setShowGameMenu] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  const toggleLeaderboard = useCallback(() => {
    setShowLeaderboard((prev) => {
      const next = !prev
      if (next) {
        setShowInfo(false)
        setShowProfile(false)
      }
      return next
    })
  }, [])

  const toggleInfo = useCallback(() => {
    setShowInfo((prev) => {
      const next = !prev
      if (next) {
        setShowLeaderboard(false)
        setShowProfile(false)
      }
      return next
    })
  }, [])

  const openMenu = useCallback(() => {
    setShowGameMenu(true)
    setShowInfo(false)
    setShowLeaderboard(false)
    setShowProfile(false)
    setShowWaveInfo(false)
  }, [])

  const closeMenu = useCallback(() => setShowGameMenu(false), [])

  // Панель информации о волне живёт поверх поля и игру не останавливает.
  const toggleWaveInfo = useCallback(() => setShowWaveInfo((prev) => !prev), [])

  // Профиль открывается поверх игры, не уводя со страницы /game.
  const openProfile = useCallback(() => {
    setShowProfile(true)
    setShowGameMenu(false)
    setShowInfo(false)
    setShowLeaderboard(false)
  }, [])

  const closeProfile = useCallback(() => setShowProfile(false), [])

  return {
    showLeaderboard,
    showInfo,
    showWaveInfo,
    showGameMenu,
    showProfile,
    toggleLeaderboard,
    toggleInfo,
    toggleWaveInfo,
    openMenu,
    closeMenu,
    openProfile,
    closeProfile,
    closeLeaderboard: () => setShowLeaderboard(false),
    closeInfo: () => setShowInfo(false),
    closeWaveInfo: () => setShowWaveInfo(false),
  }
}
