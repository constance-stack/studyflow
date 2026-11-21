import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { db } from '../db/schema'

export function FichePage() {
  const { sheetId } = useParams<{ sheetId: string }>()
  const navigate = useNavigate()
  const sheet = useLiveQuery(() => db.revisionSheets.get(sheetId!), [sheetId])

  if (!sheet) return null

  return (
    <div className="min-h-screen pb-10">
      <header
        className="sticky top-0 z-30 flex items-center gap-3 px-4 bg-[var(--color-bg)]/95 backdrop-blur print:hidden"
        style={{ paddingTop: 'calc(var(--safe-top) + 10px)', paddingBottom: '10px' }}
      >
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full" aria-label="Retour">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold truncate grow">{sheet.title}</h1>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] shrink-0"
        >
          <Printer size={16} /> PDF
        </button>
      </header>

      <div id="fiche-print-area" className="px-4 sm:px-8 max-w-2xl mx-auto">
        <h1 className="hidden print:block text-2xl font-bold mb-4">{sheet.title}</h1>
        <div className="flex flex-col gap-4 mt-2 print:mt-0">
          {sheet.sections.map((s, i) => (
            <div key={i} className="rounded-2xl bg-[var(--color-surface)] p-4 print:rounded-none print:bg-white print:border-b print:border-gray-300 print:p-0 print:py-3">
              <p className="font-semibold mb-1.5">{s.heading}</p>
              <p className="text-sm whitespace-pre-wrap text-[var(--color-text-muted)] print:text-black">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
