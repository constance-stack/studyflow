import type { AIProvider, ChatMessage, GenerateJSONOptions, ModelInfo } from '../types'
import { parseLenientJSON } from '../parseJson'

interface GeminiPart {
  text?: string
  inlineData?: { mimeType: string; data: string }
}

// Raised from Gemini's stricter defaults: legitimate school content (history, chemistry, biology...)
// routinely trips HARASSMENT/DANGEROUS_CONTENT at the default threshold. Still blocks genuinely severe content.
const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
]

const BLOCK_REASON_LABELS: Record<string, string> = {
  SAFETY: 'contenu jugé sensible',
  OTHER: 'raison non précisée',
  BLOCKLIST: 'terme bloqué',
  PROHIBITED_CONTENT: 'contenu interdit',
}

async function callGemini(
  apiKey: string,
  model: string,
  contents: Array<{ role: 'user' | 'model'; parts: GeminiPart[] }>,
  systemInstruction?: string,
  jsonMode?: boolean,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`

  const body: Record<string, unknown> = {
    contents,
    generationConfig: jsonMode ? { responseMimeType: 'application/json' } : {},
    safetySettings: SAFETY_SETTINGS,
  }
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    if (res.status === 400 && errText.includes('API_KEY_INVALID')) {
      throw new Error('Clé API Gemini invalide.')
    }
    if (res.status === 429) {
      throw new Error("Quota gratuit Gemini atteint pour l'instant — réessaie dans quelques minutes.")
    }
    if (res.status === 404) {
      throw new Error(
        `Le modèle "${model}" n'existe plus ou n'est pas accessible avec ta clé. Dans Configurer l'IA, utilise "Lister les modèles" pour choisir un modèle actuellement disponible.`,
      )
    }
    throw new Error(`Erreur Gemini (${res.status}) : ${errText.slice(0, 200) || res.statusText}`)
  }

  const json = await res.json()
  const text = json?.candidates?.[0]?.content?.parts?.map((p: GeminiPart) => p.text ?? '').join('') ?? ''
  if (!text) {
    const blockReason = json?.promptFeedback?.blockReason
    const finishReason = json?.candidates?.[0]?.finishReason
    const reason = blockReason ?? (finishReason === 'SAFETY' || finishReason === 'PROHIBITED_CONTENT' ? finishReason : null)
    if (reason) {
      const label = BLOCK_REASON_LABELS[reason] ?? reason
      throw new Error(
        `Réponse bloquée par les filtres de sécurité de Gemini (${label}). Essaie de reformuler, de réduire le contenu envoyé, ou change de document/chapitre.`,
      )
    }
    if (finishReason === 'MAX_TOKENS') {
      throw new Error("La réponse de l'IA a dépassé la longueur maximale — réduis le nombre d'éléments demandés.")
    }
    throw new Error("Réponse vide de l'IA.")
  }
  return text
}

export function createGeminiProvider(apiKey: string, model: string): AIProvider {
  return {
    async generateText(messages: ChatMessage[], systemPrompt?: string) {
      const contents = messages.map((m) => ({
        role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
        parts: [{ text: m.content }],
      }))
      return callGemini(apiKey, model, contents, systemPrompt, false)
    },

    async generateJSON({ systemPrompt, userPrompt, images }: GenerateJSONOptions) {
      const parts: GeminiPart[] = [{ text: userPrompt }]
      for (const img of images ?? []) {
        parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } })
      }
      const text = await callGemini(apiKey, model, [{ role: 'user', parts }], systemPrompt, true)
      return parseLenientJSON(text)
    },

    async testConnection() {
      await callGemini(apiKey, model, [{ role: 'user', parts: [{ text: 'Réponds juste "ok".' }] }])
    },

    async listModels(): Promise<ModelInfo[]> {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=200`
      const res = await fetch(url)
      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        if (res.status === 400 && errText.includes('API_KEY_INVALID')) throw new Error('Clé API Gemini invalide.')
        throw new Error(`Erreur Gemini (${res.status}) : ${errText.slice(0, 200) || res.statusText}`)
      }
      const json = await res.json()
      const models = (json?.models ?? []) as Array<{
        name: string
        displayName?: string
        supportedGenerationMethods?: string[]
      }>
      return models
        .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m) => ({ id: m.name.replace(/^models\//, ''), label: m.displayName || m.name }))
        .sort((a, b) => a.id.localeCompare(b.id))
    },
  }
}
