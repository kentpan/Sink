import { z } from 'zod'

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
        description: 'Login successful, returns site token',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                token: { type: 'string' },
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
  const { loginPassword, siteToken } = useRuntimeConfig(event)

  const body = await readValidatedBody(event, LoginSchema.parse)

  if (body.password === loginPassword) {
    return { token: siteToken }
  }

  throw createError({ status: 401, statusText: 'Incorrect password' })
})
