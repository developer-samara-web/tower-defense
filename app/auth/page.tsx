'use client'

import { useRouter } from 'next/navigation'
import AuthScreen from '@/components/menu/AuthScreen'
import { useAuth } from '@/hooks/useAuth'
import { useAuthForm } from '@/hooks/useAuthForm'

export default function AuthPage() {
  const router = useRouter()
  const { token } = useAuth()
  const authForm = useAuthForm()

  const handleSubmit = async (e?: React.FormEvent) => {
    // Режим читаем до отправки: хук может сменить его в процессе.
    const mode = authForm.mode
    const data = await authForm.handleSubmit(e)
    if (!data?.token) return
    // Новому герою сначала обучение: оно фиксированное, ничего не пишет
    // и не пускает игрока в рейтинг без подготовки.
    router.push(mode === 'register' ? '/game?tutorial=1' : '/menu')
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
      onBack={() => router.push(token ? '/menu' : '/')}
    />
  )
}
