export async function login(payload: { login: string; password: string }) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return res.json()
}

export async function register(payload: { login: string; email: string; password: string }) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return res.json()
}

export async function me(token: string) {
  const res = await fetch('/api/auth/me', {
    headers: { Authorization: 'Bearer ' + token },
  })
  return res.json()
}

export async function updateProfile(
  token: string,
  payload: { avatar?: string; avatarFrame?: string; title?: string },
) {
  const res = await fetch('/api/auth/me', {
    method: 'PATCH',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok || !data?.user) {
    throw new Error(
      typeof data?.error === 'string' ? data.error : 'Не удалось сохранить профиль',
    )
  }

  return data.user
}
