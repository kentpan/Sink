interface User {
  id: string
  githubId: string
  githubLogin: string
  githubName: string
  githubEmail: string
  avatarUrl: string
  createdAt: number
  lastLoginAt: number
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
  const dbPath = path.join(dataDir, 'users.json')

  if (!fs.default.existsSync(dataDir)) {
    fs.default.mkdirSync(dataDir, { recursive: true })
  }

  db = await JSONFilePreset(dbPath, { users: [] })
  return db
}

async function getCrypto() {
  if (isCloudflare) {
    throw new Error('crypto is not available in local mode functions')
  }
  return await import('node:crypto')
}

export async function getUserByGithubId(githubId: string): Promise<User | null> {
  const database = await getDB()
  return database.data.users.find((u: User) => u.githubId === githubId) || null
}

export async function createOrUpdateUser(githubData: {
  id: string
  login: string
  name: string
  email: string
  avatar_url: string
}): Promise<User> {
  const database = await getDB()
  const crypto = await getCrypto()
  const existingUser = database.data.users.find((u: User) => u.githubId === githubData.id)

  if (existingUser) {
    existingUser.githubLogin = githubData.login
    existingUser.githubName = githubData.name
    existingUser.githubEmail = githubData.email
    existingUser.avatarUrl = githubData.avatar_url
    existingUser.lastLoginAt = Date.now()
  }
  else {
    database.data.users.push({
      id: crypto.randomUUID(),
      githubId: githubData.id,
      githubLogin: githubData.login,
      githubName: githubData.name,
      githubEmail: githubData.email,
      avatarUrl: githubData.avatar_url,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    })
  }

  await database.write()
  const user = existingUser || database.data.users.at(-1)
  if (!user) {
    throw new Error('Failed to create or update user')
  }
  return user
}

export async function getUserById(id: string): Promise<User | null> {
  const database = await getDB()
  return database.data.users.find((u: User) => u.id === id) || null
}
