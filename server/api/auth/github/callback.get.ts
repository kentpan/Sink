import { z } from 'zod'
import { createOrUpdateUser } from '../../../lowdb/users'
import { generateJwt } from '../../../utils/jwt'
import { isLocalMode } from '../../../utils/local-mode'

defineRouteMeta({
  openAPI: {
    description: 'GitHub OAuth callback endpoint',
  },
})

const QuerySchema = z.object({
  code: z.string(),
  state: z.string(),
})

export default eventHandler(async (event) => {
  if (!isLocalMode()) {
    throw createError({ status: 501, statusText: 'GitHub OAuth not available in Cloudflare mode' })
  }

  const { githubClientId, githubClientSecret, githubRedirectUri, jwtSecret } = useRuntimeConfig(event)

  if (!githubClientId || !githubClientSecret) {
    throw createError({ status: 500, statusText: 'GitHub OAuth not configured' })
  }

  const query = await getValidatedQuery(event, QuerySchema.parse)

  const redirectUri = githubRedirectUri || `${getRequestProtocol(event)}://${getRequestHost(event)}/api/auth/github/callback`

  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      client_id: githubClientId,
      client_secret: githubClientSecret,
      code: query.code,
      redirect_uri: redirectUri,
      state: query.state,
    }),
  })

  const tokenData = await tokenResponse.json()

  if (!tokenData.access_token) {
    throw createError({ status: 401, statusText: 'Failed to get access token' })
  }

  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  })

  const userData = await userResponse.json()

  const emailResponse = await fetch('https://api.github.com/user/emails', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  })

  const emails = await emailResponse.json()
  const primaryEmail = emails.find((e: { primary: boolean }) => e.primary)
  const email = primaryEmail?.email || userData.email || ''

  const user = await createOrUpdateUser({
    id: String(userData.id),
    login: userData.login,
    name: userData.name || userData.login,
    email,
    avatar_url: userData.avatar_url,
  })

  const expiresInMinutes = 60 * 24
  const token = generateJwt({ sub: user.id, provider: 'github' }, jwtSecret, expiresInMinutes)
  const expiresAt = Math.floor(Date.now() / 1000) + (expiresInMinutes * 60)

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <script>
        window.opener.postMessage({
          type: 'GITHUB_LOGIN_SUCCESS',
          token: '${token}',
          expiresAt: ${expiresAt},
          user: ${JSON.stringify(user)}
        }, '*');
        window.close();
      </script>
    </head>
    <body>
      <p>Login successful, closing...</p>
    </body>
    </html>
  `

  setHeader(event, 'Content-Type', 'text/html')
  return html
})
