import type { H3Event } from 'h3'
import type { z } from 'zod'
import type { LinkSchema } from '#shared/schemas/link'
import { parseURL, stringifyParsedURL } from 'ufo'
import { isCloudflareEnv } from './env'

type Link = z.infer<typeof LinkSchema>

export function withoutQuery(url: string): string {
  const parsed = parseURL(url)
  return stringifyParsedURL({ ...parsed, search: '' })
}

export function normalizeSlug(event: H3Event, slug: string): string {
  const { caseSensitive } = useRuntimeConfig(event)
  return caseSensitive ? slug : slug.toLowerCase()
}

export function buildShortLink(event: H3Event, slug: string): string {
  return `${getRequestProtocol(event)}://${getRequestHost(event)}/${slug}`
}

export async function putLink(event: H3Event, link: Link): Promise<void> {
  const storage = useStorage('kv')
  const expiration = getExpiration(link.expiration)
  const entry = {
    value: link,
    metadata: {
      expiration,
      url: withoutQuery(link.url),
      comment: link.comment,
    },
  }
  await storage.setItem(`link:${link.slug}`, JSON.stringify(entry))
}

export async function getLink(event: H3Event, slug: string, cacheTtl?: number): Promise<Link | null> {
  if (isCloudflareEnv()) {
    const { cloudflare } = event.context
    const { KV } = cloudflare.env
    return await KV.get(`link:${slug}`, { type: 'json', cacheTtl }) as Link | null
  }

  const storage = useStorage('kv')
  const data = await storage.getItem(`link:${slug}`)
  if (!data)
    return null
  const entry = JSON.parse(data as string)
  return entry.value as Link
}

export async function getLinkWithMetadata(event: H3Event, slug: string): Promise<{ link: Link | null, metadata: Record<string, unknown> | null }> {
  if (isCloudflareEnv()) {
    const { cloudflare } = event.context
    const { KV } = cloudflare.env
    const { metadata, value: link } = await KV.getWithMetadata(`link:${slug}`, { type: 'json' })
    return { link: link as Link | null, metadata: metadata as Record<string, unknown> | null }
  }

  const storage = useStorage('kv')
  const data = await storage.getItem(`link:${slug}`)
  if (!data)
    return { link: null, metadata: null }
  const entry = JSON.parse(data as string)
  return { link: entry.value as Link, metadata: entry.metadata }
}

export async function deleteLink(event: H3Event, slug: string): Promise<void> {
  if (isCloudflareEnv()) {
    const { cloudflare } = event.context
    const { KV } = cloudflare.env
    await KV.delete(`link:${slug}`)
    return
  }

  const storage = useStorage('kv')
  await storage.removeItem(`link:${slug}`)
}

export async function linkExists(event: H3Event, slug: string): Promise<boolean> {
  const link = await getLink(event, slug)
  return link !== null
}

interface ListLinksOptions {
  limit: number
  cursor?: string
}

interface ListLinksResult {
  links: (Link | null)[]
  list_complete: boolean
  cursor?: string
}

export async function listLinks(event: H3Event, options: ListLinksOptions): Promise<ListLinksResult> {
  if (isCloudflareEnv()) {
    const { cloudflare } = event.context
    const { KV } = cloudflare.env
    const list = await KV.list({
      prefix: 'link:',
      limit: options.limit,
      cursor: options.cursor || undefined,
    })

    const links = await Promise.all(
      (list.keys || []).map(async (key: { name: string }) => {
        const { metadata, value: link } = await KV.getWithMetadata(key.name, { type: 'json' }) as { metadata: Record<string, unknown> | null, value: Link | null }
        if (link) {
          return {
            ...(metadata ?? {}),
            ...link,
          }
        }
        return link
      }),
    )

    return {
      links,
      list_complete: list.list_complete,
      cursor: 'cursor' in list ? list.cursor : undefined,
    }
  }

  const storage = useStorage('kv')
  const allKeys = await storage.getKeys()
  const linkKeys = allKeys.filter(k => k.startsWith('link:')).sort()

  const start = options.cursor ? Number.parseInt(options.cursor) || 0 : 0
  const end = start + options.limit
  const paginatedKeys = linkKeys.slice(start, end)

  const links = await Promise.all(
    paginatedKeys.map(async (key) => {
      const data = await storage.getItem(key)
      if (!data)
        return null
      const entry = JSON.parse(data as string)
      return entry.value as Link
    }),
  )

  return {
    links,
    list_complete: end >= linkKeys.length,
    cursor: end < linkKeys.length ? String(end) : undefined,
  }
}

function getExpiration(linkExpiration?: number): number | undefined {
  if (!linkExpiration)
    return undefined

  const now = Math.floor(Date.now() / 1000)
  if (linkExpiration <= now)
    return undefined

  return linkExpiration
}
