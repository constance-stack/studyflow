import type { AIProvider, ChatMessage, GenerateJSONOptions, ImagePart, ModelInfo } from '../types'
import { parseLenientJSON } from '../parseJson'

type ContentPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }

function imagesToParts(text: string, images?: ImagePart[]): string | ContentPart[] {
  if (!images || images.length === 0) return text
  const parts: ContentPart[] = [{ type: 'text', text }]
  for (const img of images) {
    parts.push({ type: 'image_url', image_url: { url: `data:${img.mimeType};base64,${img.base64}` } })
  }
  return parts
}

async function callChatCompletions(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string | ContentPart[] }>,
  jsonMode?: boolean,
): Promise<string> {
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`

  const body: Record<string, unknown> = { model, messages }
  if (jsonMode) {
    body.response_format = { type: 'json_object' }
    // Raised past most providers' default so large exhaustive generations don't get cut off mid-JSON.
    body.max_tokens = 16384
  }

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    if (res.status === 401) throw new Error('Clé API invalide ou manquante.')
    if (res.status === 429) throw new Error('Limite de requêtes atteinte — réessaie plus tard.')
    throw new Error(`Erreur API (${res.status}) : ${errText.slice(0, 200) || res.statusText}`)
  }

  const json = await res.json()
  const text = json?.choices?.[0]?.message?.content
  if (!text) throw new Error("Réponse vide de l'IA.")
  return text
}

export function createOpenAICompatibleProvider(baseUrl: string, apiKey: string, model: string): AIProvider {
  return {
    async generateText(messages: ChatMessage[], systemPrompt?: string) {
      const chatMessages = [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ]
      return callChatCompletions(baseUrl, apiKey, model, chatMessages, false)
    },

    async generateJSON({ systemPrompt, userPrompt, images }: GenerateJSONOptions) {
      const chatMessages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: imagesToParts(userPrompt, images) },
      ]
      const text = await callChatCompletions(baseUrl, apiKey, model, chatMessages, true)
      return parseLenientJSON(text)
    },

    async testConnection() {
      await callChatCompletions(baseUrl, apiKey, model, [{ role: 'user', content: 'Réponds juste "ok".' }])
    },

    async listModels(): Promise<ModelInfo[]> {
      const url = `${baseUrl.replace(/\/+$/, '')}/models`
      const headers: Record<string, string> = {}
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`
      const res = await fetch(url, { headers })
      if (!res.ok) throw new Error(`Ce fournisseur ne permet pas de lister les modèles (${res.status}).`)
      const json = await res.json()
      const models = (json?.data ?? []) as Array<{ id: string }>
      return models.map((m) => ({ id: m.id, label: m.id })).sort((a, b) => a.id.localeCompare(b.id))
    },
  }
}
