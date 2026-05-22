defineRouteMeta({
  openAPI: {
    description: 'Delete an API key',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
      },
    ],
  },
})

export default eventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const { deleteApiKey } = await import('../../lowdb/api-keys')
  const deleted = await deleteApiKey(id!)

  if (!deleted) {
    throw createError({ status: 404, statusText: 'API key not found' })
  }

  return { success: true }
})
