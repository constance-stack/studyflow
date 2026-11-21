import { db } from './schema'
import type { Folder } from './types'

export async function getBreadcrumb(folderId: string | null): Promise<Folder[]> {
  const trail: Folder[] = []
  let current = folderId
  while (current) {
    const folder = await db.folders.get(current)
    if (!folder) break
    trail.unshift(folder)
    current = folder.parentFolderId
  }
  return trail
}

export interface FlatFolder extends Folder {
  depth: number
}

export async function flattenFolders(subjectId: string, excludeSubtreeRoot?: string): Promise<FlatFolder[]> {
  const all = await db.folders.where('subjectId').equals(subjectId).sortBy('order')
  const byParent = new Map<string | null, Folder[]>()
  for (const f of all) {
    const list = byParent.get(f.parentFolderId) ?? []
    list.push(f)
    byParent.set(f.parentFolderId, list)
  }
  const result: FlatFolder[] = []
  function walk(parentId: string | null, depth: number) {
    for (const f of byParent.get(parentId) ?? []) {
      if (f.id === excludeSubtreeRoot) continue
      result.push({ ...f, depth })
      walk(f.id, depth + 1)
    }
  }
  walk(null, 0)
  return result
}
