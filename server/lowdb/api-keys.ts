interface ApiKey {
  id: string
  key: string
  name: string
  createdAt: number
  lastUsedAt?: number
  expiresAt?: number
  active: boolean
}

const isCloudflare = process.env.NODE_ENV === 'production' || process.env.NUXT_USE_CLOUDFLARE === 'true'

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
  const dbPath = path.join(dataDir, 'api-keys.json')

  if (!fs.default.existsSync(dataDir)) {
    fs.default.mkdirSync(dataDir, { recursive: true })
  }

  db = await JSONFilePreset(dbPath, { keys: [] })
  return db
}

async function getCrypto() {
  if (isCloudflare) {
    throw new Error('crypto is not available in local mode functions')
  }
  return await import('node:crypto')
}

export async function createApiKey(name: string, expiresAt?: number): Promise<ApiKey> {
  const database = await getDB()
  const crypto = await getCrypto()
  const apiKey: ApiKey = {
    id: crypto.randomUUID(),
    key: crypto.randomBytes(32).toString('base64url'),
    name,
    createdAt: Date.now(),
    expiresAt,
    active: true,
  }
  database.data.keys.push(apiKey)
  await database.write()
  return apiKey
}

export async function getApiKey(key: string): Promise<ApiKey | null> {
  const database = await getDB()
  const apiKey = database.data.keys.find((k: ApiKey) => k.key === key)

  if (!apiKey || !apiKey.active)
    return null

  if (apiKey.expiresAt && Date.now() > apiKey.expiresAt) {
    apiKey.active = false
    await database.write()
    return null
  }

  return apiKey
}

export async function updateApiKey(id: string, updates: Partial<Pick<ApiKey, 'name' | 'active' | 'expiresAt'>>): Promise<ApiKey | null> {
  const database = await getDB()
  const index = database.data.keys.findIndex((k: ApiKey) => k.id === id)

  if (index === -1)
    return null

  database.data.keys[index] = { ...database.data.keys[index], ...updates }
  await database.write()
  return database.data.keys[index]
}

export async function deleteApiKey(id: string): Promise<boolean> {
  const database = await getDB()
  const initialLength = database.data.keys.length
  database.data.keys = database.data.keys.filter((k: ApiKey) => k.id !== id)

  if (database.data.keys.length !== initialLength) {
    await database.write()
    return true
  }

  return false
}

export async function listApiKeys(): Promise<ApiKey[]> {
  const database = await getDB()
  return database.data.keys.filter((k: ApiKey) => k.active).sort((a: ApiKey, b: ApiKey) => b.createdAt - a.createdAt)
}

export async function updateApiKeyLastUsed(key: string): Promise<void> {
  const database = await getDB()
  const apiKey = database.data.keys.find((k: ApiKey) => k.key === key)

  if (apiKey) {
    apiKey.lastUsedAt = Date.now()
    await database.write()
  }
}
