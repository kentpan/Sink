import { z } from 'zod'
import { createApiKey } from '../../lowdb/api-keys'

defineRouteMeta({
  openAPI: {
    description: 'Create a new API key',
    security: [{ bearerAuth: [] }],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'API key name/description' },
              expiresAt: { type: 'integer', description: 'Expiration timestamp (optional)' },
            },
            required: ['name'],
          },
        },
      },
    },
  },
})

const CreateApiKeySchema = z.object({
  name: z.string().min(1),
  expiresAt: z.number().optional(),
})

export default eventHandler(async (event) => {
  const body = await readValidatedBody(event, CreateApiKeySchema.parse)
  const apiKey = await createApiKey(body.name, body.expiresAt)
  setResponseStatus(event, 201)
  return apiKey
})
