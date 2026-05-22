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

function generateUUID(): string {
  return crypto.randomUUID()
}

export async function getUserByGithubId(githubId: string): Promise<User | null> {
  const storage = useStorage('users')
  const allKeys = await storage.getKeys()

  for (const key of allKeys) {
    const data = await storage.getItem(key)
    if (!data)
      continue
    const user = JSON.parse(data as string) as User
    if (user.githubId === githubId)
      return user
  }
  return null
}

export async function createOrUpdateUser(githubData: {
  id: string
  login: string
  name: string
  email: string
  avatar_url: string
}): Promise<User> {
  const storage = useStorage('users')
  const existingUser = await getUserByGithubId(githubData.id)

  if (existingUser) {
    existingUser.githubLogin = githubData.login
    existingUser.githubName = githubData.name
    existingUser.githubEmail = githubData.email
    existingUser.avatarUrl = githubData.avatar_url
    existingUser.lastLoginAt = Date.now()
    await storage.setItem(existingUser.id, JSON.stringify(existingUser))
    return existingUser
  }

  const newUser: User = {
    id: generateUUID(),
    githubId: githubData.id,
    githubLogin: githubData.login,
    githubName: githubData.name,
    githubEmail: githubData.email,
    avatarUrl: githubData.avatar_url,
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
  }

  await storage.setItem(newUser.id, JSON.stringify(newUser))
  return newUser
}

export async function getUserById(id: string): Promise<User | null> {
  const storage = useStorage('users')
  const data = await storage.getItem(id)
  if (!data)
    return null
  return JSON.parse(data as string) as User
}
