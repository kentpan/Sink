import crypto from 'node:crypto'
import * as fs from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSONFilePreset } from 'lowdb/node'

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

interface UserData {
  users: User[]
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dirname, '../data')
const dbPath = join(dataDir, 'users.json')

let db: ReturnType<typeof JSONFilePreset<UserData>> | null = null

async function getDB() {
  if (db)
    return db

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  db = await JSONFilePreset<UserData>(dbPath, { users: [] }) as unknown as ReturnType<typeof JSONFilePreset<UserData>>
  return db
}

export async function getUserByGithubId(githubId: string): Promise<User | null> {
  const database = await getDB()
  return database.data.users.find(u => u.githubId === githubId) || null
}

export async function createOrUpdateUser(githubData: {
  id: string
  login: string
  name: string
  email: string
  avatar_url: string
}): Promise<User> {
  const database = await getDB()
  const existingUser = database.data.users.find(u => u.githubId === githubData.id)

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
  return database.data.users.find(u => u.id === id) || null
}
