defineRouteMeta({
  openAPI: {
    description: 'List all API keys',
    security: [{ bearerAuth: [] }],
  },
})

export default eventHandler(async () => {
  const { listApiKeys } = await import('../../lowdb/api-keys')
  const keys = await listApiKeys()
  return { keys }
})
