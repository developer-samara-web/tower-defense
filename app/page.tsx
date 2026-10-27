'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('td_token') : null
    if (token) {
      router.replace('/menu')
    } else {
      router.replace('/auth')
    }
  }, [router])

  return null
}
