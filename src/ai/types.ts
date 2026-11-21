export type AIProviderKind = 'gemini' | 'openai-compatible'

export interface AIConfig {
  provider: AIProviderKind
  apiKey: string
  model: string
  baseUrl?: string // only for 'openai-compatible'
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ImagePart {
  base64: string
  mimeType: string
}

export interface GenerateJSONOptions {
  systemPrompt: string
  userPrompt: string
  images?: ImagePart[]
}

export interface AIProvider {
  generateText(messages: ChatMessage[], systemPrompt?: string): Promise<string>
  generateJSON(options: GenerateJSONOptions): Promise<unknown>
  testConnection(): Promise<void>
}

export const PROVIDER_PRESETS: Record<
  AIProviderKind,
  { label: string; defaultModel: string; costNote: string; needsBaseUrl: boolean }
> = {
  gemini: {
    label: 'Google Gemini (recommandé, gratuit)',
    defaultModel: 'gemini-2.0-flash',
    costNote:
      "Gratuit dans la limite du quota gratuit de l'API Gemini (Google AI Studio) : quelques dizaines de requêtes par minute, largement suffisant pour un usage personnel. Au-delà du quota gratuit, Google peut facturer si tu actives la facturation — ce que cette app ne fait jamais à ta place.",
    needsBaseUrl: false,
  },
  'openai-compatible': {
    label: 'Autre (compatible OpenAI : Groq, Ollama local, OpenRouter, OpenAI...)',
    defaultModel: '',
    costNote:
      "Dépend du fournisseur que tu choisis : Groq et certains modèles OpenRouter ont un niveau gratuit, Ollama en local est entièrement gratuit (rien n'est envoyé sur internet), OpenAI est payant. Vérifie les tarifs du fournisseur choisi avant de l'utiliser.",
    needsBaseUrl: true,
  },
}
