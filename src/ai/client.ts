import type { AIConfig, AIProvider } from './types'
import { createGeminiProvider } from './providers/gemini'
import { createOpenAICompatibleProvider } from './providers/openaiCompatible'
import { getAIConfig } from './settings'

export function buildProvider(config: AIConfig): AIProvider {
  if (config.provider === 'gemini') {
    return createGeminiProvider(config.apiKey, config.model)
  }
  return createOpenAICompatibleProvider(config.baseUrl ?? '', config.apiKey, config.model)
}

export async function getActiveProvider(): Promise<AIProvider | null> {
  const config = await getAIConfig()
  if (!config || !config.model || (config.provider === 'gemini' && !config.apiKey)) return null
  if (config.provider === 'openai-compatible' && !config.baseUrl) return null
  return buildProvider(config)
}
