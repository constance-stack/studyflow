import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('StudyFlow crashed:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
          <AlertTriangle size={36} className="text-red-500" />
          <div>
            <p className="font-semibold mb-1">Une erreur inattendue est survenue</p>
            <p className="text-sm text-[var(--color-text-muted)] max-w-sm">
              Tes données ne sont pas perdues (elles restent dans ce navigateur). Recharge la page pour continuer.
              Si le problème persiste, exporte une sauvegarde depuis "Plus" avant d'investiguer plus loin.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl px-5 py-2.5 bg-[var(--color-primary)] text-white font-medium text-sm"
          >
            Recharger l'application
          </button>
          <details className="text-xs text-[var(--color-text-muted)] max-w-sm">
            <summary className="cursor-pointer">Détails techniques</summary>
            <pre className="whitespace-pre-wrap text-left mt-2">{this.state.error.message}</pre>
          </details>
        </div>
      )
    }
    return this.props.children
  }
}
