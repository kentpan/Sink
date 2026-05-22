import { getUserById } from '../../lowdb/users'
import { verifyJwt } from '../../utils/jwt'
import { isLocalMode } from '../../utils/local-mode'

const BEARER_REGEX = /^Bearer\s+/

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

  if (isLocalMode()) {
    const decoded = verifyJwt(token, jwtSecret)
    if (decoded && decoded.sub) {
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
