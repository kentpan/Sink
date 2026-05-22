import type { Plugin } from 'vite'

export function lowdbStubPlugin(): Plugin {
  const isCloudflare = process.env.NODE_ENV === 'production' || process.env.NUXT_USE_CLOUDFLARE === 'true'

  if (!isCloudflare) {
    return {
      name: 'lowdb-stub',
    }
  }

  return {
    name: 'lowdb-stub',
    resolveId(id) {
      if (id.includes('lowdb')) {
        return `\0${id}`
      }
      return null
    },
    load(id) {
      if (id.startsWith('\0')) {
        const originalId = id.slice(1)
        if (originalId.includes('lowdb/node')) {
          return `
            export function JSONFilePreset() {
              throw new Error('lowdb is not available in Cloudflare mode')
            }
            export * from 'lowdb/lib/node'
          `
        }
        if (originalId.includes('lowdb')) {
          return `
            export default {}
          `
        }
      }
      return null
    },
  }
}
