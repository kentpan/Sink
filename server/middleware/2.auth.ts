const BEARER_REGEX = /^Bearer\s+/

export default eventHandler((event) => {
  if (event.path === '/api/login')
    return

  const token = getHeader(event, 'Authorization')?.replace(BEARER_REGEX, '')
  if (event.path.startsWith('/api/') && token !== useRuntimeConfig(event).siteToken) {
    throw createError({
      status: 401,
      statusText: 'Unauthorized',
    })
  }
  if (token && token.length < 8) {
    throw createError({
      status: 401,
      statusText: 'Token is too short',
    })
  }
})
