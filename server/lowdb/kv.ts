export interface KVListResult {
  keys: Array<{ name: string, metadata?: Record<string, unknown> }>
  list_complete: boolean
  cursor?: string
}

export async function kvList(options: {
  prefix: string
  limit?: number
  cursor?: string
}): Promise<KVListResult> {
  const storage = useStorage('kv')
  const allKeys = await storage.getKeys()
  const keys = allKeys.filter(key => key.startsWith(options.prefix)).sort()

  const start = options.cursor ? Number.parseInt(options.cursor) || 0 : 0
  const limit = options.limit || 1000
  const end = start + limit
  const paginatedKeys = keys.slice(start, end)

  const result: Array<{ name: string, metadata?: Record<string, unknown> }> = []
  for (const key of paginatedKeys) {
    const data = await storage.getItem(key)
    if (data) {
      const entry = JSON.parse(data as string)
      result.push({
        name: key,
        metadata: entry.metadata,
      })
    }
  }

  return {
    keys: result,
    list_complete: end >= keys.length,
    cursor: end < keys.length ? String(end) : undefined,
  }
}
