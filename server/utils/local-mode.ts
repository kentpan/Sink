export function isLocalMode(): boolean {
  return process.env.NUXT_USE_CLOUDFLARE !== 'true'
}

export function assertCloudflare(event: Event | undefined, service: string): void {
  if (isLocalMode()) {
    throw createError({
      status: 501,
      statusText: `${service} not available in local development mode`,
    })
  }
}
