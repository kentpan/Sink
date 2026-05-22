import { listApiKeys } from '../../lowdb/api-keys'

defineRouteMeta({
  openAPI: {
    description: 'List all API keys',
    security: [{ bearerAuth: [] }],
  },
})

export default eventHandler(async () => {
  const keys = await listApiKeys()
  return { keys }
})
