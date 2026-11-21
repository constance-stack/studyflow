import type { ActivityType } from '../../db/types'

// 'match' and 'timeline' activities store their whole item set wrapped as a single content[0] entry
// ({pairs: [...]}, {events: [...]}), so the flat editor list needs conversion both ways.

export function contentToFlatItems(type: ActivityType, content: unknown): unknown[] {
  if (!Array.isArray(content)) return []
  if (type === 'match') return (content[0] as { pairs?: unknown[] })?.pairs ?? []
  if (type === 'timeline') return (content[0] as { events?: unknown[] })?.events ?? []
  return content
}

export function flatItemsToContent(type: ActivityType, items: unknown[]): unknown {
  if (type === 'match') return [{ pairs: items }]
  if (type === 'timeline') return [{ events: items.map((e, i) => ({ ...(e as object), order: i })) }]
  return items
}
