import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Search, FileText, Image as ImageIcon, StickyNote, Check, ChevronDown, ChevronRight } from 'lucide-react'
import { Sheet } from './Sheet'
import { db } from '../db/schema'
import type { DocumentRecord } from '../db/types'

function docIcon(type: DocumentRecord['type']) {
  if (type === 'pdf') return <FileText size={16} />
  if (type === 'image') return <ImageIcon size={16} />
  return <StickyNote size={16} />
}

export function DocumentPickerSheet({
  open,
  onClose,
  initialSelected,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  initialSelected: string[]
  onConfirm: (docIds: string[]) => void
}) {
  const subjects = useLiveQuery(() => db.subjects.orderBy('order').toArray()) ?? []
  const chapters = useLiveQuery(() => db.chapters.toArray()) ?? []
  const documents = useLiveQuery(() => db.documents.toArray()) ?? []

  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected))
  const [query, setQuery] = useState('')
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set())
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!open) return
    setSelected(new Set(initialSelected))
    setQuery('')
    setExpandedSubjects(new Set())
    setExpandedChapters(new Set())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const chaptersBySubject = useMemo(() => {
    const map = new Map<string, typeof chapters>()
    for (const c of chapters) map.set(c.subjectId, [...(map.get(c.subjectId) ?? []), c])
    return map
  }, [chapters])

  const docsByChapter = useMemo(() => {
    const map = new Map<string, DocumentRecord[]>()
    const q = query.trim().toLowerCase()
    for (const d of documents) {
      if (q && !d.name.toLowerCase().includes(q)) continue
      map.set(d.chapterId, [...(map.get(d.chapterId) ?? []), d])
    }
    return map
  }, [documents, query])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSet(set: Set<string>, setSet: (next: Set<string>) => void, id: string) {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSet(next)
  }

  const searching = query.trim().length > 0

  // When searching, only show subjects/chapters that actually contain a matching document,
  // auto-expanded so results are visible without having to open each group by hand.
  const visibleSubjects = searching
    ? subjects.filter((s) => (chaptersBySubject.get(s.id) ?? []).some((c) => (docsByChapter.get(c.id) ?? []).length > 0))
    : subjects

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Choisir des documents"
      footer={
        <button
          onClick={() => {
            onConfirm([...selected])
            onClose()
          }}
          className="w-full rounded-xl py-3 font-medium text-white bg-[var(--color-primary)]"
        >
          Valider ({selected.size} document{selected.size === 1 ? '' : 's'})
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un document..."
            className="w-full rounded-xl pl-9 pr-3 py-2.5 bg-[var(--color-surface-muted)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>

        {documents.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] py-6 text-center">
            Aucun document importé pour l'instant.
          </p>
        ) : visibleSubjects.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] py-6 text-center">Aucun résultat.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {visibleSubjects.map((s) => {
              const subjectChapters = (chaptersBySubject.get(s.id) ?? []).filter(
                (c) => (docsByChapter.get(c.id) ?? []).length > 0,
              )
              if (subjectChapters.length === 0) return null
              const docCount = subjectChapters.reduce((sum, c) => sum + (docsByChapter.get(c.id) ?? []).length, 0)
              const isOpen = searching || expandedSubjects.has(s.id)
              return (
                <div key={s.id} className="rounded-xl bg-[var(--color-surface-muted)] overflow-hidden">
                  <button
                    onClick={() => toggleSet(expandedSubjects, setExpandedSubjects, s.id)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
                  >
                    {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    <span className="font-semibold text-sm flex-1">{s.name}</span>
                    <span className="text-xs text-[var(--color-text-muted)]">{docCount}</span>
                  </button>
                  {isOpen && (
                    <div className="flex flex-col gap-2 px-3 pb-3">
                      {subjectChapters.map((c) => {
                        const chapterOpen = searching || subjectChapters.length === 1 || expandedChapters.has(c.id)
                        const chapterDocs = docsByChapter.get(c.id) ?? []
                        return (
                          <div key={c.id} className="rounded-lg bg-[var(--color-surface)] overflow-hidden">
                            <button
                              onClick={() => toggleSet(expandedChapters, setExpandedChapters, c.id)}
                              className="w-full flex items-center gap-1.5 px-2.5 py-2 text-left"
                            >
                              {chapterOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                              <span className="text-xs font-medium flex-1">{c.name}</span>
                              <span className="text-[10px] text-[var(--color-text-muted)]">{chapterDocs.length}</span>
                            </button>
                            {chapterOpen && (
                              <div className="flex flex-col gap-1 px-2 pb-2">
                                {chapterDocs.map((d) => {
                                  const isSelected = selected.has(d.id)
                                  return (
                                    <button
                                      key={d.id}
                                      onClick={() => toggle(d.id)}
                                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm ${
                                        isSelected ? 'bg-[var(--color-primary)]/10' : 'bg-[var(--color-surface-muted)]'
                                      }`}
                                    >
                                      <span
                                        className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                                          isSelected ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-muted)]'
                                        }`}
                                      >
                                        {isSelected && <Check size={13} />}
                                      </span>
                                      {docIcon(d.type)}
                                      <span className="truncate flex-1">{d.name}</span>
                                      {!d.textContent && !d.extractedText && (
                                        <span className="text-[10px] text-[var(--color-text-muted)] shrink-0">
                                          non analysé
                                        </span>
                                      )}
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Sheet>
  )
}
