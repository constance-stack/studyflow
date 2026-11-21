import type { AIProvider, ChatMessage, GenerateJSONOptions } from '../types'
import { parseLenientJSON } from '../parseJson'

interface GeminiPart {
  text?: string
  inlineData?: { mimeType: string; data: string }
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
    throw new Error(`Erreur Gemini (${res.status}) : ${errText.slice(0, 200) || res.statusText}`)
  }

  const json = await res.json()
  const text = json?.candidates?.[0]?.content?.parts?.map((p: GeminiPart) => p.text ?? '').join('') ?? ''
  if (!text) {
    const blockReason = json?.promptFeedback?.blockReason
    if (blockReason) throw new Error(`Réponse bloquée par Gemini (${blockReason}).`)
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
  }
}
