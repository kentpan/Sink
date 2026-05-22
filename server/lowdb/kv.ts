import type { z } from 'zod'
import type { LinkSchema } from '#shared/schemas/link'

const isCloudflare = process.env.NODE_ENV === 'production' || process.env.NUXT_USE_CLOUDFLARE === 'true'

type Link = z.infer<typeof LinkSchema>

let db: any = null

async function getDB() {
  if (db)
    return db

  if (isCloudflare) {
    throw new Error('lowdb is not available in Cloudflare mode')
  }

  const fs = await import('node:fs')
  const path = await import('node:path')
  const { fileURLToPath } = await import('node:url')
  const { JSONFilePreset } = await import('lowdb/node')

  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const dataDir = path.join(__dirname, '../data')
  const dbPath = path.join(dataDir, 'kv.json')

  if (!fs.default.existsSync(dataDir)) {
    fs.default.mkdirSync(dataDir, { recursive: true })
  }

  db = await JSONFilePreset(dbPath, { links: {} })
  return db
}

export async function kvPut(key: string, value: string, options?: {
  expiration?: number
  metadata?: Record<string, unknown>
}): Promise<void> {
  const database = await getDB()
  const link = JSON.parse(value) as Link
  database.data.links[key] = {
    value: link,
    metadata: options?.metadata,
    expiration: options?.expiration,
  }
  await database.write()
}

export async function kvGet(key: string, _options?: {
  type?: 'json'
  cacheTtl?: number
}): Promise<Link | null> {
  const database = await getDB()
  const entry = database.data.links[key]

  if (!entry)
    return null

  if (entry.expiration && Date.now() / 1000 > entry.expiration) {
    delete database.data.links[key]
    await database.write()
    return null
  }

  return entry.value
}

export async function kvGetWithMetadata(key: string, _options?: {
  type?: 'json'
}): Promise<{ value: Link | null, metadata: Record<string, unknown> | null }> {
  const database = await getDB()
  const entry = database.data.links[key]

  if (!entry)
    return { value: null, metadata: null }

  if (entry.expiration && Date.now() / 1000 > entry.expiration) {
    delete database.data.links[key]
    await database.write()
    return { value: null, metadata: null }
  }

  return {
    value: entry.value,
    metadata: entry.metadata || null,
  }
}

export async function kvDelete(key: string): Promise<void> {
  const database = await getDB()
  delete database.data.links[key]
  await database.write()
}

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
  const database = await getDB()
  const keys = Object.keys(database.data.links)
    .filter(key => key.startsWith(options.prefix))
    .sort()

  const start = options.cursor ? Number.parseInt(options.cursor) || 0 : 0
  const limit = options.limit || 1000
  const end = start + limit

  const paginatedKeys = keys.slice(start, end).map(key => ({
    name: key,
    metadata: database.data.links[key]?.metadata,
  }))

  return {
    keys: paginatedKeys,
    list_complete: end >= keys.length,
    cursor: end < keys.length ? String(end) : undefined,
  }
}
