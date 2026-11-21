import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export function PdfViewer({ blob }: { blob: Blob }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [pageNum, setPageNum] = useState(1)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    blob.arrayBuffer().then((buf) => {
      pdfjsLib
        .getDocument({ data: buf })
        .promise.then((doc) => {
          if (!cancelled) {
            setPdf(doc)
            setPageNum(1)
          }
        })
        .catch(() => !cancelled && setError('Impossible de lire ce PDF.'))
    })
    return () => {
      cancelled = true
    }
  }, [blob])

  useEffect(() => {
    if (!pdf || !canvasRef.current) return
    let cancelled = false
    pdf.getPage(pageNum).then((page) => {
      if (cancelled) return
      const canvas = canvasRef.current!
      const viewport = page.getViewport({ scale: Math.min(2, (canvas.parentElement?.clientWidth ?? 600) / page.getViewport({ scale: 1 }).width) })
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')!
      page.render({ canvasContext: ctx, viewport, canvas })
    })
    return () => {
      cancelled = true
    }
  }, [pdf, pageNum])

  if (error) return <p className="text-sm text-[var(--color-text-muted)] text-center py-10">{error}</p>

  return (
    <div className="flex flex-col items-center">
      <div className="w-full flex justify-center rounded-2xl overflow-hidden bg-[var(--color-surface-muted)]">
        <canvas ref={canvasRef} className="max-w-full" />
      </div>
      {pdf && pdf.numPages > 1 && (
        <div className="flex items-center gap-4 mt-3">
          <button
            onClick={() => setPageNum((p) => Math.max(1, p - 1))}
            disabled={pageNum <= 1}
            className="p-2 rounded-full bg-[var(--color-surface-muted)] disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm text-[var(--color-text-muted)]">
            {pageNum} / {pdf.numPages}
          </span>
          <button
            onClick={() => setPageNum((p) => Math.min(pdf.numPages, p + 1))}
            disabled={pageNum >= pdf.numPages}
            className="p-2 rounded-full bg-[var(--color-surface-muted)] disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  )
}
