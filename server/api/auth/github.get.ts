import { isLocalMode } from '../../utils/local-mode'

defineRouteMeta({
  openAPI: {
    description: 'Redirect to GitHub OAuth authorization page',
  },
})

export default eventHandler((event) => {
  if (!isLocalMode()) {
    throw createError({ status: 501, statusText: 'GitHub OAuth not available in Cloudflare mode' })
  }

  const { githubClientId, githubRedirectUri } = useRuntimeConfig(event)

  if (!githubClientId) {
    throw createError({ status: 500, statusText: 'GitHub OAuth not configured' })
  }

  const redirectUri = githubRedirectUri || `${getRequestProtocol(event)}://${getRequestHost(event)}/api/auth/github/callback`

  const params = new URLSearchParams({
    client_id: githubClientId,
    redirect_uri: redirectUri,
    scope: 'read:user user:email',
    state: crypto.randomUUID(),
  })

  return sendRedirect(event, `https://github.com/login/oauth/authorize?${params}`)
})
