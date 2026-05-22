import { z } from 'zod'
import { generateJwt } from '../utils/jwt'
import { isLocalMode } from '../utils/local-mode'

defineRouteMeta({
  openAPI: {
    description: 'Login with password to get access token',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              password: { type: 'string' },
            },
            required: ['password'],
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Login successful, returns JWT token',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                token: { type: 'string' },
                expiresAt: { type: 'number' },
              },
            },
          },
        },
      },
      401: {
        description: 'Incorrect password',
      },
    },
  },
})

const LoginSchema = z.object({
  password: z.string().min(1),
})

export default eventHandler(async (event) => {
  const { loginPassword, jwtSecret } = useRuntimeConfig(event)

  const body = await readValidatedBody(event, LoginSchema.parse)

  if (body.password === loginPassword) {
    if (isLocalMode()) {
      const expiresInMinutes = 60 * 24
      const token = generateJwt({ sub: 'admin' }, jwtSecret, expiresInMinutes)
      const expiresAt = Math.floor(Date.now() / 1000) + (expiresInMinutes * 60)

      return { token, expiresAt }
    }

    return { token: useRuntimeConfig(event).siteToken }
  }

  throw createError({ status: 401, statusText: 'Incorrect password' })
})
