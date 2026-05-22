import { getApiKey, updateApiKeyLastUsed } from '../lowdb/api-keys'
import { verifyJwt } from '../utils/jwt'
import { isLocalMode } from '../utils/local-mode'

const BEARER_REGEX = /^Bearer\s+/

export default eventHandler(async (event) => {
  if (event.path === '/api/login')
    return

  if (event.path.startsWith('/api/auth/'))
    return

  if (!event.path.startsWith('/api/'))
    return

  const token = getHeader(event, 'Authorization')?.replace(BEARER_REGEX, '')

  if (!token) {
    throw createError({
      status: 401,
      statusText: 'Unauthorized',
    })
  }

  if (token.length < 8) {
    throw createError({
      status: 401,
      statusText: 'Token is too short',
    })
  }

  const { siteToken, jwtSecret } = useRuntimeConfig(event)

  if (isLocalMode()) {
    if (token === siteToken) {
      return
    }

    const decoded = verifyJwt(token, jwtSecret)
    if (decoded) {
      return
    }

    const apiKey = await getApiKey(token)
    if (apiKey) {
      await updateApiKeyLastUsed(token)
      return
    }

    throw createError({
      status: 401,
      statusText: 'Unauthorized',
    })
  }

  if (token !== siteToken) {
    throw createError({
      status: 401,
      statusText: 'Unauthorized',
    })
  }
})
