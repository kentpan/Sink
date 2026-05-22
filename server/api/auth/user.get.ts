import { verifyJwt } from '../../utils/jwt'
import { isLocalMode } from '../../utils/local-mode'

const BEARER_REGEX = /^Bearer\s+/

async function getUsersModule() {
  return await import('../../lowdb/users')
}

defineRouteMeta({
  openAPI: {
    description: 'Get current authenticated user',
  },
})

export default eventHandler(async (event) => {
  const token = getHeader(event, 'Authorization')?.replace(BEARER_REGEX, '')

  if (!token) {
    return { authenticated: false }
  }

  const { jwtSecret } = useRuntimeConfig(event)

  if (isLocalMode(event)) {
    const decoded = await verifyJwt(token, jwtSecret)
    if (decoded && decoded.sub) {
      const { getUserById } = await getUsersModule()
      const user = await getUserById(decoded.sub)
      if (user) {
        return {
          authenticated: true,
          user: {
            id: user.id,
            githubLogin: user.githubLogin,
            githubName: user.githubName,
            githubEmail: user.githubEmail,
            avatarUrl: user.avatarUrl,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
          },
        }
      }
    }
  }

  return { authenticated: false }
})
