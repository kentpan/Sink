import { generateApiKey } from '../utils/jwt'

interface ApiKey {
  id: string
  key: string
  name: string
  createdAt: number
  lastUsedAt?: number
  expiresAt?: number
  active: boolean
}

function generateUUID(): string {
  return crypto.randomUUID()
}

export async function createApiKey(name: string, expiresAt?: number): Promise<ApiKey> {
  const storage = useStorage('api-keys')
  const key = await generateApiKey()
  const apiKey: ApiKey = {
    id: generateUUID(),
    key,
    name,
    createdAt: Date.now(),
    expiresAt,
    active: true,
  }
  await storage.setItem(apiKey.id, JSON.stringify(apiKey))
  return apiKey
}

export async function getApiKey(key: string): Promise<ApiKey | null> {
  const storage = useStorage('api-keys')
  const allKeys = await storage.getKeys()

  for (const id of allKeys) {
    const data = await storage.getItem(id)
    if (!data)
      continue
    const apiKey = JSON.parse(data as string) as ApiKey
    if (apiKey.key === key && apiKey.active) {
      if (apiKey.expiresAt && Date.now() > apiKey.expiresAt) {
        apiKey.active = false
        await storage.setItem(id, JSON.stringify(apiKey))
        return null
      }
      return apiKey
    }
  }
  return null
}

export async function updateApiKey(id: string, updates: Partial<Pick<ApiKey, 'name' | 'active' | 'expiresAt'>>): Promise<ApiKey | null> {
  const storage = useStorage('api-keys')
  const data = await storage.getItem(id)
  if (!data)
    return null

  const apiKey = JSON.parse(data as string) as ApiKey
  const updated = { ...apiKey, ...updates }
  await storage.setItem(id, JSON.stringify(updated))
  return updated
}

export async function deleteApiKey(id: string): Promise<boolean> {
  const storage = useStorage('api-keys')
  const data = await storage.getItem(id)
  if (!data)
    return false

  await storage.removeItem(id)
  return true
}

export async function listApiKeys(): Promise<ApiKey[]> {
  const storage = useStorage('api-keys')
  const allKeys = await storage.getKeys()
  const apiKeys: ApiKey[] = []

  for (const id of allKeys) {
    const data = await storage.getItem(id)
    if (!data)
      continue
    const apiKey: ApiKey = typeof data === 'string' ? JSON.parse(data) as ApiKey : (data as ApiKey)
    if (apiKey.active)
      apiKeys.push(apiKey)
  }

  return apiKeys.sort((a, b) => b.createdAt - a.createdAt)
}

export async function updateApiKeyLastUsed(key: string): Promise<void> {
  const storage = useStorage('api-keys')
  const allKeys = await storage.getKeys()

  for (const id of allKeys) {
    const data = await storage.getItem(id)
    if (!data)
      continue
    const apiKey: ApiKey = typeof data === 'string' ? JSON.parse(data) as ApiKey : (data as ApiKey)
    if (apiKey.key === key) {
      apiKey.lastUsedAt = Date.now()
      await storage.setItem(id, JSON.stringify(apiKey))
      return
    }
  }
}
