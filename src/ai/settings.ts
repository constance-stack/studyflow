import { db } from '../db/schema'
import type { AIConfig } from './types'

const SETTINGS_KEY = 'ai_config'

export async function getAIConfig(): Promise<AIConfig | null> {
  const row = await db.settings.get(SETTINGS_KEY)
  return (row?.value as AIConfig | undefined) ?? null
}

export async function setAIConfig(config: AIConfig): Promise<void> {
  await db.settings.put({ key: SETTINGS_KEY, value: config })
}

export async function clearAIConfig(): Promise<void> {
  await db.settings.delete(SETTINGS_KEY)
}

// Excluded from backup exports: an API key should never leave the device inside a shareable file.
export const AI_SETTINGS_KEY = SETTINGS_KEY
