import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { NextConfig } from "next";

// Next.js сам подхватывает только .env, .env.local и .env.<режим>,
// поэтому игровой баланс из .env.game читаем здесь и отдаём через `env`:
// сборка подставляет значения в process.env.<КЛЮЧ> литералами.
function readGameBalance(): Record<string, string> {
  let raw: string
  try {
    raw = readFileSync(resolve(process.cwd(), '.env.game'), 'utf8')
  } catch {
    return {}
  }

  const values: Record<string, string> = {}
  for (const line of raw.split(/\r?\n/)) {
    const entry = line.trim()
    if (!entry || entry.startsWith('#')) continue

    const separator = entry.indexOf('=')
    if (separator < 0) continue

    const key = entry.slice(0, separator).trim()
    if (!key.startsWith('NEXT_PUBLIC_TD_')) continue

    const value = entry
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
    if (value) values[key] = value
  }
  return values
}

const nextConfig: NextConfig = {
  /* config options here */
  env: readGameBalance(),
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
