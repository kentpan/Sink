import { isCloudflareEnv } from '../utils/env'
import { verifyJwt } from '../utils/jwt'

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

  if (isCloudflareEnv()) {
    if (token === siteToken) {
      return
    }

    const decoded = await verifyJwt(token, jwtSecret)
    if (decoded) {
      event.context.user = decoded
      return
    }

    throw createError({
      status: 401,
      statusText: 'Unauthorized',
    })
  }

  if (token === siteToken) {
    return
  }

  const decoded = await verifyJwt(token, jwtSecret)
  if (decoded) {
    event.context.user = decoded
    return
  }

  const storage = useStorage('api-keys')
  const allKeys = await storage.getKeys()
  for (const keyId of allKeys) {
    const data = await storage.getItem(keyId)
    if (!data)
      continue
    const apiKey = JSON.parse(data as string)
    if (apiKey.key === token && apiKey.active) {
      if (apiKey.expiresAt && Date.now() > apiKey.expiresAt) {
        apiKey.active = false
        await storage.setItem(keyId, JSON.stringify(apiKey))
        break
      }
      apiKey.lastUsedAt = Date.now()
      await storage.setItem(keyId, JSON.stringify(apiKey))
      event.context.user = { sub: apiKey.id, type: 'api-key' }
      return
    }
  }

  throw createError({
    status: 401,
    statusText: 'Unauthorized',
  })
})
