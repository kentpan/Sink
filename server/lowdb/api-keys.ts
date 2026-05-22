import crypto from 'node:crypto'
import * as fs from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSONFilePreset } from 'lowdb/node'

interface ApiKey {
  id: string
  key: string
  name: string
  createdAt: number
  lastUsedAt?: number
  expiresAt?: number
  active: boolean
}

interface ApiKeyData {
  keys: ApiKey[]
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dirname, '../data')
const dbPath = join(dataDir, 'api-keys.json')

let db: ReturnType<typeof JSONFilePreset<ApiKeyData>> | null = null

async function getDB() {
  if (db)
    return db

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  db = await JSONFilePreset<ApiKeyData>(dbPath, { keys: [] })
  return db
}

export async function createApiKey(name: string, expiresAt?: number): Promise<ApiKey> {
  const database = await getDB()
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
  const apiKey = database.data.keys.find(k => k.key === key)

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
  const index = database.data.keys.findIndex(k => k.id === id)

  if (index === -1)
    return null

  database.data.keys[index] = { ...database.data.keys[index], ...updates }
  await database.write()
  return database.data.keys[index]
}

export async function deleteApiKey(id: string): Promise<boolean> {
  const database = await getDB()
  const initialLength = database.data.keys.length
  database.data.keys = database.data.keys.filter(k => k.id !== id)

  if (database.data.keys.length !== initialLength) {
    await database.write()
    return true
  }

  return false
}

export async function listApiKeys(): Promise<ApiKey[]> {
  const database = await getDB()
  return database.data.keys.filter(k => k.active).sort((a, b) => b.createdAt - a.createdAt)
}

export async function updateApiKeyLastUsed(key: string): Promise<void> {
  const database = await getDB()
  const apiKey = database.data.keys.find(k => k.key === key)

  if (apiKey) {
    apiKey.lastUsedAt = Date.now()
    await database.write()
  }
}
