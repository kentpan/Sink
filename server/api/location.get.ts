import { isLocalMode } from '../utils/local-mode'

defineRouteMeta({
  openAPI: {
    description: 'Get the location of the user',
    responses: {
      200: {
        description: 'The location of the user',
      },
    },
  },
})

export default eventHandler((event) => {
  if (isLocalMode(event)) {
    return {
      latitude: 31.2304,
      longitude: 121.4737,
    }
  }

  const { cloudflare } = event.context
  if (!cloudflare?.request?.cf) {
    return {
      latitude: null,
      longitude: null,
    }
  }

  const { request: { cf } } = cloudflare
  return {
    latitude: cf?.latitude,
    longitude: cf?.longitude,
  }
})
