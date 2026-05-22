import { z } from 'zod'
import { updateApiKey } from '../../lowdb/api-keys'

defineRouteMeta({
  openAPI: {
    description: 'Update an API key',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
      },
    ],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'API key name/description' },
              active: { type: 'boolean', description: 'Enable/disable the key' },
              expiresAt: { type: 'integer', description: 'Expiration timestamp' },
            },
          },
        },
      },
    },
  },
})

const UpdateApiKeySchema = z.object({
  name: z.string().optional(),
  active: z.boolean().optional(),
  expiresAt: z.number().optional(),
})

export default eventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readValidatedBody(event, UpdateApiKeySchema.parse)

  const apiKey = await updateApiKey(id!, body)

  if (!apiKey) {
    throw createError({ status: 404, statusText: 'API key not found' })
  }

  return apiKey
})
