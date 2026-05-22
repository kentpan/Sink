export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

export function isCloudflareEnv(): boolean {
  return isProduction() || process.env.NUXT_CLOUDFLARE === 'true'
}

export function isLocalEnv(): boolean {
  return !isCloudflareEnv()
}

export function assertCloudflare(service: string): never {
  throw createError({
    status: 501,
    statusText: `${service} is only available in Cloudflare environment`,
  })
}
