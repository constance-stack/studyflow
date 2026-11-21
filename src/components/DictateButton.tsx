import { useRef, useState } from 'react'
import { Mic, Square } from 'lucide-react'

interface MinimalSpeechRecognition {
  lang: string
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}

function getSpeechRecognitionCtor(): (new () => MinimalSpeechRecognition) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => MinimalSpeechRecognition
    webkitSpeechRecognition?: new () => MinimalSpeechRecognition
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

// Dictation only (speech-to-text input), not oral grading — honest substitute for a full oral exam mode.
export function DictateButton({ onResult }: { onResult: (text: string) => void }) {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null)
  const Ctor = getSpeechRecognitionCtor()

  if (!Ctor) return null

  function toggle() {
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    const recognition = new Ctor!()
    recognition.lang = 'fr-FR'
    recognition.interimResults = false
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0]?.transcript ?? '')
        .join(' ')
      onResult(transcript)
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1.5 ${
        listening ? 'bg-red-500 text-white' : 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]'
      }`}
    >
      {listening ? <Square size={12} /> : <Mic size={12} />}
      {listening ? 'Arrêter' : "Répondre à l'oral"}
    </button>
  )
}
