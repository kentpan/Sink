import type { H3Event } from 'h3'
import type { z } from 'zod'
import type { LinkSchema } from '#shared/schemas/link'
import { parseURL, stringifyParsedURL } from 'ufo'
import { kvDelete, kvGet, kvGetWithMetadata, kvList, kvPut } from '../lowdb/kv'

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

function isLocalMode(_event: H3Event): boolean {
  return process.env.NUXT_USE_CLOUDFLARE !== 'true'
}

export async function putLink(event: H3Event, link: Link): Promise<void> {
  if (isLocalMode(event)) {
    const expiration = getExpiration(event, link.expiration)
    await kvPut(`link:${link.slug}`, JSON.stringify(link), {
      expiration,
      metadata: {
        expiration,
        url: withoutQuery(link.url),
        comment: link.comment,
      },
    })
    return
  }

  const { cloudflare } = event.context
  const { KV } = cloudflare.env
  const expiration = getExpiration(event, link.expiration)

  await KV.put(`link:${link.slug}`, JSON.stringify(link), {
    expiration,
    metadata: {
      expiration,
      url: withoutQuery(link.url),
      comment: link.comment,
    },
  })
}

export async function getLink(event: H3Event, slug: string, cacheTtl?: number): Promise<Link | null> {
  if (isLocalMode(event)) {
    return kvGet(`link:${slug}`, { type: 'json', cacheTtl })
  }

  const { cloudflare } = event.context
  const { KV } = cloudflare.env
  return await KV.get(`link:${slug}`, { type: 'json', cacheTtl }) as Link | null
}

export async function getLinkWithMetadata(event: H3Event, slug: string): Promise<{ link: Link | null, metadata: Record<string, unknown> | null }> {
  if (isLocalMode(event)) {
    const { value: link, metadata } = await kvGetWithMetadata(`link:${slug}`, { type: 'json' })
    return { link, metadata }
  }

  const { cloudflare } = event.context
  const { KV } = cloudflare.env
  const { metadata, value: link } = await KV.getWithMetadata(`link:${slug}`, { type: 'json' })
  return { link: link as Link | null, metadata: metadata as Record<string, unknown> | null }
}

export async function deleteLink(event: H3Event, slug: string): Promise<void> {
  if (isLocalMode(event)) {
    await kvDelete(`link:${slug}`)
    return
  }

  const { cloudflare } = event.context
  const { KV } = cloudflare.env
  await KV.delete(`link:${slug}`)
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
  if (isLocalMode(event)) {
    const list = await kvList({
      prefix: 'link:',
      limit: options.limit,
      cursor: options.cursor || undefined,
    })

    const links = await Promise.all(
      (list.keys || []).map(async (key: { name: string }) => {
        const { metadata, value: link } = await kvGetWithMetadata(key.name, { type: 'json' }) as { metadata: Record<string, unknown> | null, value: Link | null }
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

function getExpiration(event: H3Event, linkExpiration?: number): number | undefined {
  if (!linkExpiration)
    return undefined

  const now = Math.floor(Date.now() / 1000)
  if (linkExpiration <= now)
    return undefined

  return linkExpiration
}
