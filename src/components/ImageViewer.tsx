import { useEffect, useState } from 'react'

export function ImageViewer({ blob, alt }: { blob: Blob; alt: string }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])

  if (!url) return null
  return (
    <div className="rounded-2xl overflow-hidden bg-[var(--color-surface-muted)] flex justify-center">
      <img src={url} alt={alt} className="max-w-full max-h-[70vh] object-contain" />
    </div>
  )
}
