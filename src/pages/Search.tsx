import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search as SearchIcon, Library, Folder as FolderIcon, BookOpen, FileText } from 'lucide-react'
import { db } from '../db/schema'

type Filter = 'all' | 'subject' | 'folder' | 'chapter' | 'document'

export function Search() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const subjects = useLiveQuery(() => db.subjects.toArray()) ?? []
  const folders = useLiveQuery(() => db.folders.toArray()) ?? []
  const chapters = useLiveQuery(() => db.chapters.toArray()) ?? []
  const documents = useLiveQuery(() => db.documents.toArray()) ?? []

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const items: Array<{
      key: string
      type: Filter
      label: string
      sublabel: string
      onSelect: () => void
    }> = []

    if (filter === 'all' || filter === 'subject') {
      for (const s of subjects.filter((s) => s.name.toLowerCase().includes(q))) {
        items.push({ key: s.id, type: 'subject', label: s.name, sublabel: 'Matière', onSelect: () => navigate(`/library/${s.id}`) })
      }
    }
    if (filter === 'all' || filter === 'folder') {
      for (const f of folders.filter((f) => f.name.toLowerCase().includes(q))) {
        const subject = subjects.find((s) => s.id === f.subjectId)
        items.push({
          key: f.id,
          type: 'folder',
          label: f.name,
          sublabel: subject ? `Dossier · ${subject.name}` : 'Dossier',
          onSelect: () => navigate(`/library/${f.subjectId}/folder/${f.id}`),
        })
      }
    }
    if (filter === 'all' || filter === 'chapter') {
      for (const c of chapters.filter((c) => c.name.toLowerCase().includes(q))) {
        const subject = subjects.find((s) => s.id === c.subjectId)
        items.push({
          key: c.id,
          type: 'chapter',
          label: c.name,
          sublabel: subject ? `Chapitre · ${subject.name}` : 'Chapitre',
          onSelect: () => navigate(`/chapter/${c.id}`),
        })
      }
    }
    if (filter === 'all' || filter === 'document') {
      for (const d of documents.filter(
        (d) => d.name.toLowerCase().includes(q) || (d.textContent ?? '').toLowerCase().includes(q),
      )) {
        const subject = subjects.find((s) => s.id === d.subjectId)
        items.push({
          key: d.id,
          type: 'document',
          label: d.name,
          sublabel: subject ? `Document · ${subject.name}` : 'Document',
          onSelect: () => navigate(`/document/${d.id}`),
        })
      }
    }
    return items
  }, [query, filter, subjects, folders, chapters, documents, navigate])

  const icons: Record<Filter, React.ReactNode> = {
    all: <SearchIcon size={16} />,
    subject: <Library size={16} />,
    folder: <FolderIcon size={16} />,
    chapter: <BookOpen size={16} />,
    document: <FileText size={16} />,
  }

  return (
    <div>
      <header
        className="sticky top-0 z-30 flex items-center gap-2 px-4 bg-[var(--color-bg)]/95 backdrop-blur"
        style={{ paddingTop: 'calc(var(--safe-top) + 10px)', paddingBottom: '10px' }}
      >
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full" aria-label="Retour">
          <ArrowLeft size={20} />
        </button>
        <div className="relative grow">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une matière, un chapitre, un document..."
            className="w-full rounded-xl pl-9 pr-3 py-2.5 bg-[var(--color-surface-muted)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
          />
        </div>
      </header>

      <div className="px-4 max-w-2xl mx-auto">
        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
          {([
            ['all', 'Tout'],
            ['subject', 'Matières'],
            ['folder', 'Dossiers'],
            ['chapter', 'Chapitres'],
            ['document', 'Documents'],
          ] as [Filter, string][]).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                filter === value ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-muted)]'
              }`}
            >
              {icons[value]}
              {label}
            </button>
          ))}
        </div>

        {query.trim() === '' ? (
          <p className="text-center text-sm text-[var(--color-text-muted)] py-16">
            Commence à écrire pour rechercher dans toute ta bibliothèque.
          </p>
        ) : results.length === 0 ? (
          <p className="text-center text-sm text-[var(--color-text-muted)] py-16">Aucun résultat pour "{query}".</p>
        ) : (
          <div className="flex flex-col gap-1.5 pb-8">
            {results.map((r) => (
              <button
                key={r.type + r.key}
                onClick={r.onSelect}
                className="flex items-center gap-3 rounded-xl bg-[var(--color-surface)] px-3.5 py-3 text-left"
              >
                <span className="text-[var(--color-text-muted)]">{icons[r.type]}</span>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{r.label}</p>
                  <p className="text-xs text-[var(--color-text-muted)] truncate">{r.sublabel}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
