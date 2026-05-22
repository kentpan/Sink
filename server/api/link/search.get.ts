import type { H3Event } from 'h3'
import { isCloudflareEnv } from '../../utils/env'
import { withoutQuery } from '../../utils/link-store'

defineRouteMeta({
  openAPI: {
    description: 'Search all links (returns slug, url, comment for each link)',
    security: [{ bearerAuth: [] }],
  },
})

interface Link {
  slug: string
  url: string
  comment?: string
}

interface LinkMetadata {
  url?: string
  comment?: string
  expiration?: number
}

interface LinkData {
  url: string
  comment?: string
}

export default eventHandler(async (event: H3Event) => {
  const list: Link[] = []
  let finalCursor: string | undefined

  try {
    if (isCloudflareEnv()) {
      const { cloudflare } = event.context
      const { KV } = cloudflare.env

      while (true) {
        const result = await KV.list({
          prefix: 'link:',
          limit: 1000,
          cursor: finalCursor,
        }) as { keys: Array<{ name: string, metadata?: LinkMetadata }>, list_complete: boolean, cursor?: string }

        finalCursor = result.cursor

        if (Array.isArray(result.keys)) {
          for (const key of result.keys) {
            try {
              if (key.metadata?.url) {
                list.push({
                  slug: key.name.replace('link:', ''),
                  url: key.metadata.url,
                  comment: key.metadata.comment,
                })
              }
              else {
                const { metadata, value: link } = await KV.getWithMetadata(key.name, { type: 'json' }) as { metadata: LinkMetadata | null, value: LinkData | null }
                if (link) {
                  list.push({
                    slug: key.name.replace('link:', ''),
                    url: link.url,
                    comment: link.comment,
                  })
                  await KV.put(key.name, JSON.stringify(link), {
                    expiration: metadata?.expiration,
                    metadata: {
                      ...(metadata || {}),
                      url: withoutQuery(link.url),
                      comment: link.comment,
                    },
                  })
                }
              }
            }
            catch (err) {
              console.error(`Error processing key ${key.name}:`, err)
              continue
            }
          }
        }

        if (!result.keys || result.list_complete) {
          break
        }
      }
    }
    else {
      const storage = useStorage('kv')
      const allKeys = await storage.getKeys()
      const linkKeys = allKeys.filter(k => k.startsWith('link:')).sort()

      for (const keyName of linkKeys) {
        try {
          const data = await storage.getItem(keyName)
          if (!data)
            continue
          const entry = JSON.parse(data as string)
          if (entry.metadata?.url) {
            list.push({
              slug: keyName.replace('link:', ''),
              url: entry.metadata.url,
              comment: entry.metadata.comment,
            })
          }
          else if (entry.value) {
            list.push({
              slug: keyName.replace('link:', ''),
              url: entry.value.url,
              comment: entry.value.comment,
            })
            await storage.setItem(keyName, JSON.stringify({
              ...entry,
              metadata: {
                ...(entry.metadata || {}),
                url: withoutQuery(entry.value.url),
                comment: entry.value.comment,
              },
            }))
          }
        }
        catch (err) {
          console.error(`Error processing key ${keyName}:`, err)
          continue
        }
      }
    }

    return list
  }
  catch (err) {
    console.error('Error fetching link list:', err)
    throw createError({
      status: 500,
      statusText: 'Failed to fetch link list',
    })
  }
})
