'use client'

import { useRouter } from 'next/navigation'
import AuthScreen from '@/components/menu/AuthScreen'
import LandingScreen from '@/components/menu/LandingScreen'
import { useAuth } from '@/hooks/useAuth'
import { useAuthForm } from '@/hooks/useAuthForm'
import { useState } from 'react'

export default function AuthPage() {
  const router = useRouter()
  const { token } = useAuth()
  const authForm = useAuthForm()
  const [showLanding, setShowLanding] = useState(!token)

  const handleSubmit = async (e?: React.FormEvent) => {
    const data = await authForm.handleSubmit(e)
    if (data?.token) router.push('/menu')
  }

  if (showLanding && !token) {
    return <LandingScreen onStart={() => setShowLanding(false)} />
  }

  return (
    <AuthScreen
      mode={authForm.mode}
      login={authForm.loginVal}
      email={authForm.email}
      password={authForm.password}
      loading={authForm.loading}
      error={authForm.error}
      notice={authForm.notice}
      onModeChange={(m) => { authForm.setMode(m); authForm.clearError(); authForm.clearNotice() }}
      onLoginChange={authForm.setLoginVal}
      onEmailChange={authForm.setEmail}
      onPasswordChange={authForm.setPassword}
      onSubmit={handleSubmit}
      onBack={() => setShowLanding(true)}
    />
  )
}
