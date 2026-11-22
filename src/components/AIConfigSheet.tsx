import { useEffect, useState } from 'react'
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle, ShieldAlert, ListChecks, ExternalLink } from 'lucide-react'
import { Sheet } from './Sheet'
import { PROVIDER_PRESETS, type AIConfig, type AIProviderKind, type ModelInfo } from '../ai/types'
import { buildProvider } from '../ai/client'
import { setAIConfig, clearAIConfig } from '../ai/settings'

export function AIConfigSheet({
  open,
  onClose,
  initial,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  initial: AIConfig | null
  onSaved: () => void
}) {
  const [provider, setProvider] = useState<AIProviderKind>('gemini')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [testState, setTestState] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [testError, setTestError] = useState('')
  const [modelsState, setModelsState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [modelsError, setModelsError] = useState('')
  const [availableModels, setAvailableModels] = useState<ModelInfo[] | null>(null)

  useEffect(() => {
    if (!open) return
    setProvider(initial?.provider ?? 'gemini')
    setApiKey(initial?.apiKey ?? '')
    setModel(initial?.model ?? PROVIDER_PRESETS.gemini.defaultModel)
    setBaseUrl(initial?.baseUrl ?? '')
    setTestState('idle')
    setTestError('')
    setModelsState('idle')
    setAvailableModels(null)
  }, [open, initial])

  function handleProviderChange(p: AIProviderKind) {
    setProvider(p)
    setModel(PROVIDER_PRESETS[p].defaultModel)
    setTestState('idle')
    setModelsState('idle')
    setAvailableModels(null)
  }

  async function handleListModels() {
    setModelsState('loading')
    setModelsError('')
    setAvailableModels(null)
    try {
      const cfg: AIConfig = { provider, apiKey: apiKey.trim(), model: model.trim(), baseUrl: baseUrl.trim() }
      const models = await buildProvider(cfg).listModels()
      if (models.length === 0) throw new Error('Aucun modèle compatible trouvé pour cette clé.')
      setAvailableModels(models)
      setModelsState('idle')
    } catch (e) {
      setModelsState('error')
      setModelsError(e instanceof Error ? e.message : 'Impossible de lister les modèles.')
    }
  }

  const preset = PROVIDER_PRESETS[provider]
  const canSave = apiKey.trim().length > 0 && model.trim().length > 0 && (!preset.needsBaseUrl || baseUrl.trim().length > 0)

  async function handleTest() {
    setTestState('testing')
    setTestError('')
    try {
      const cfg: AIConfig = { provider, apiKey: apiKey.trim(), model: model.trim(), baseUrl: baseUrl.trim() }
      await buildProvider(cfg).testConnection()
      setTestState('ok')
    } catch (e) {
      setTestState('error')
      setTestError(e instanceof Error ? e.message : 'Connexion impossible.')
    }
  }

  async function handleSave() {
    await setAIConfig({ provider, apiKey: apiKey.trim(), model: model.trim(), baseUrl: baseUrl.trim() })
    onSaved()
    onClose()
  }

  async function handleRemove() {
    await clearAIConfig()
    onSaved()
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Configurer l'IA"
      footer={
        <div className="flex flex-col gap-2">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="w-full rounded-xl py-3 font-medium text-white bg-[var(--color-primary)] disabled:opacity-40"
          >
            Enregistrer
          </button>
          {initial && (
            <button onClick={handleRemove} className="w-full rounded-xl py-2.5 font-medium text-red-500 text-sm">
              Supprimer la configuration
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        {initial && (
          <div className="rounded-xl bg-green-500/10 px-3.5 py-2.5 flex items-center gap-2 text-sm">
            <CheckCircle2 size={16} className="text-green-500 shrink-0" />
            <span>
              IA actuelle : <strong>{PROVIDER_PRESETS[initial.provider].label.split(' (')[0]}</strong> ·{' '}
              {initial.model}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {(Object.keys(PROVIDER_PRESETS) as AIProviderKind[]).map((p) => (
            <button
              key={p}
              onClick={() => handleProviderChange(p)}
              className={`text-left rounded-xl p-3.5 border-2 transition-colors ${
                provider === p
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                  : 'border-transparent bg-[var(--color-surface-muted)]'
              }`}
            >
              <p className="font-medium text-sm">{PROVIDER_PRESETS[p].label}</p>
            </button>
          ))}
        </div>

        <div className="rounded-xl bg-[var(--color-surface-muted)] p-3.5 flex gap-2.5 text-xs text-[var(--color-text-muted)]">
          <ShieldAlert size={16} className="shrink-0 mt-0.5" />
          <p>
            {preset.costNote} Tes documents et questions seront envoyés à ce fournisseur pour générer les réponses —
            ta clé reste stockée uniquement sur cet appareil et n'est jamais incluse dans tes sauvegardes exportées.
          </p>
        </div>

        {preset.needsBaseUrl && (
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-muted)]">
              URL de l'API (compatible OpenAI)
            </label>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.groq.com/openai/v1"
              className="w-full rounded-xl px-3.5 py-2.5 bg-[var(--color-surface-muted)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-muted)]">Modèle</label>
          <input
            value={model}
            onChange={(e) => {
              setModel(e.target.value)
              setTestState('idle')
            }}
            placeholder="gemini-2.5-flash"
            className="w-full rounded-xl px-3.5 py-2.5 bg-[var(--color-surface-muted)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm mb-2"
          />
          <button
            type="button"
            onClick={handleListModels}
            disabled={apiKey.trim().length === 0 || modelsState === 'loading'}
            className="flex items-center gap-1.5 text-sm text-[var(--color-primary)] font-medium disabled:opacity-40"
          >
            {modelsState === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <ListChecks size={14} />}
            Lister les modèles disponibles
          </button>
          {modelsState === 'error' && <p className="text-sm text-red-500 mt-1.5">{modelsError}</p>}
          {availableModels && (
            <div className="flex flex-col gap-1 mt-2 max-h-48 overflow-y-auto rounded-xl bg-[var(--color-surface-muted)] p-1.5">
              {availableModels.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setModel(m.id)
                    setTestState('idle')
                  }}
                  className={`text-left rounded-lg px-3 py-2 text-sm ${
                    model === m.id ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-[var(--color-surface)]'
                  }`}
                >
                  <p className="font-medium">{m.id}</p>
                  {m.label !== m.id && <p className="text-xs opacity-75">{m.label}</p>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-muted)]">Clé API</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value)
                setTestState('idle')
              }}
              placeholder={provider === 'gemini' ? 'Clé Google AI Studio (gratuite)' : "Laisse vide si l'API n'en requiert pas"}
              className="w-full rounded-xl pl-3.5 pr-10 py-2.5 bg-[var(--color-surface-muted)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {provider === 'gemini' && (
            <div className="text-xs text-[var(--color-text-muted)] mt-1.5 space-y-1">
              <p className="font-medium text-[var(--color-text)]">Pour obtenir une clé gratuite (2 min, sans carte bancaire) :</p>
              <p>
                1. Ouvre{' '}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-primary)] font-medium inline-flex items-center gap-0.5"
                >
                  aistudio.google.com/apikey <ExternalLink size={11} />
                </a>
              </p>
              <p>2. Connecte-toi avec un compte Google, puis clique "Create API key".</p>
              <p>3. Copie la clé et colle-la ci-dessus.</p>
            </div>
          )}
        </div>

        <button
          onClick={handleTest}
          disabled={!canSave || testState === 'testing'}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 bg-[var(--color-surface-muted)] font-medium text-sm disabled:opacity-40"
        >
          {testState === 'testing' && <Loader2 size={16} className="animate-spin" />}
          {testState === 'ok' && <CheckCircle2 size={16} className="text-green-500" />}
          {testState === 'error' && <XCircle size={16} className="text-red-500" />}
          Tester la connexion
        </button>
        {testState === 'ok' && <p className="text-sm text-green-500 text-center">Connexion réussie.</p>}
        {testState === 'error' && <p className="text-sm text-red-500 text-center">{testError}</p>}
      </div>
    </Sheet>
  )
}
