import { Fragment, useEffect, useState } from 'react'

type Segment = { type: 'text'; value: string } | { type: 'math'; value: string; block: boolean }

// Splits on $$...$$, \[...\], $...$, \(...\) delimiters.
function splitSegments(input: string): Segment[] {
  const regex = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\$([^$\n]+?)\$|\\\(([\s\S]+?)\\\)/g
  const segments: Segment[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(input))) {
    if (match.index > lastIndex) segments.push({ type: 'text', value: input.slice(lastIndex, match.index) })
    if (match[1] !== undefined) segments.push({ type: 'math', value: match[1], block: true })
    else if (match[2] !== undefined) segments.push({ type: 'math', value: match[2], block: true })
    else if (match[3] !== undefined) segments.push({ type: 'math', value: match[3], block: false })
    else if (match[4] !== undefined) segments.push({ type: 'math', value: match[4], block: false })
    lastIndex = regex.lastIndex
  }
  if (lastIndex < input.length) segments.push({ type: 'text', value: input.slice(lastIndex) })
  return segments
}

let katexModule: typeof import('katex') | null = null
async function loadKatex() {
  if (!katexModule) {
    const mod = await import('katex')
    katexModule = (mod.default ?? mod) as typeof import('katex')
    await import('katex/dist/katex.min.css')
  }
  return katexModule
}

function MathSegment({ value, block }: { value: string; block: boolean }) {
  const [html, setHtml] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadKatex()
      .then((katex) => {
        if (cancelled) return
        try {
          setHtml(katex.renderToString(value, { throwOnError: false, displayMode: block }))
        } catch {
          setFailed(true)
        }
      })
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [value, block])

  if (failed) return <code>{value}</code>
  if (!html) return <span className="opacity-50">{value}</span>
  return block ? (
    <span className="block my-1" dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <span dangerouslySetInnerHTML={{ __html: html }} />
  )
}

// Renders plain text with inline/block LaTeX math ($...$, $$...$$, \(...\), \[...\]) interspersed.
export function MathText({ text, className }: { text: string; className?: string }) {
  if (!text) return null
  const segments = splitSegments(text)
  if (segments.length === 1 && segments[0].type === 'text') {
    return <span className={className}>{text}</span>
  }
  return (
    <span className={className}>
      {segments.map((seg, i) => (
        <Fragment key={i}>
          {seg.type === 'text' ? seg.value : <MathSegment value={seg.value} block={seg.block} />}
        </Fragment>
      ))}
    </span>
  )
}
