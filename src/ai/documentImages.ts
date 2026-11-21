import { blobToBase64 } from '../lib/base64'
import type { ImagePart } from './types'

const MAX_PDF_PAGES = 5

export async function documentToImageParts(
  blob: Blob,
  mimeType: string,
): Promise<{ images: ImagePart[]; truncatedPages: number | null }> {
  if (mimeType === 'application/pdf') {
    const [pdfjsLib, { default: pdfWorkerUrl }] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ])
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

    const buf = await blob.arrayBuffer()
    const doc = await pdfjsLib.getDocument({ data: buf }).promise
    const pageCount = Math.min(doc.numPages, MAX_PDF_PAGES)
    const images: ImagePart[] = []
    for (let i = 1; i <= pageCount; i++) {
      const page = await doc.getPage(i)
      const viewport = page.getViewport({ scale: 1.5 })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')!
      await page.render({ canvasContext: ctx, viewport, canvas }).promise
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      images.push({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' })
    }
    return { images, truncatedPages: doc.numPages > MAX_PDF_PAGES ? doc.numPages : null }
  }

  const base64 = await blobToBase64(blob)
  return { images: [{ base64, mimeType }], truncatedPages: null }
}
