export function isLocalMode(event?: { context?: { cloudflare?: unknown } }): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false
  }
  if (process.env.NUXT_USE_CLOUDFLARE === 'true') {
    return false
  }
  if (event?.context?.cloudflare) {
    return false
  }
  return true
}

export function isCloudflareWorker(event?: { context?: { cloudflare?: unknown } }): boolean {
  if (process.env.NODE_ENV === 'production') {
    return true
  }
  if (process.env.NUXT_USE_CLOUDFLARE === 'true') {
    return true
  }
  if (event?.context?.cloudflare) {
    return true
  }
  return false
}

export function assertCloudflare(event: Event | undefined, service: string): void {
  if (isLocalMode()) {
    throw createError({
      status: 501,
      statusText: `${service} not available in local development mode`,
    })
  }
}
