import { Buffer } from 'node:buffer'

export async function r2Put(key: string, value: ArrayBuffer | string, options?: {
  httpMetadata?: {
    contentType: string
  }
}): Promise<void> {
  const storage = useStorage('r2')
  const content = value instanceof ArrayBuffer
    ? Buffer.from(value).toString('base64')
    : Buffer.from(value).toString('base64')

  await storage.setItem(key, JSON.stringify({
    key,
    content,
    contentType: options?.httpMetadata?.contentType || 'application/octet-stream',
    httpMetadata: options?.httpMetadata || { contentType: 'application/octet-stream' },
  }))
}

export async function r2Get(key: string): Promise<{ body: Uint8Array, httpMetadata: { contentType: string } } | null> {
  const storage = useStorage('r2')
  const data = await storage.getItem(key)
  if (!data)
    return null

  const obj = JSON.parse(data as string)
  return {
    body: new Uint8Array(Buffer.from(obj.content, 'base64').buffer, Buffer.from(obj.content, 'base64').byteOffset, Buffer.from(obj.content, 'base64').byteLength),
    httpMetadata: obj.httpMetadata,
  }
}

export async function r2Delete(key: string): Promise<void> {
  const storage = useStorage('r2')
  await storage.removeItem(key)
}

export interface R2ListResult {
  objects: Array<{ key: string }>
  truncated: boolean
}

export async function r2List(options?: {
  prefix?: string
  limit?: number
}): Promise<R2ListResult> {
  const storage = useStorage('r2')
  let keys = await storage.getKeys()

  if (options?.prefix) {
    keys = keys.filter(key => key.startsWith(options.prefix!))
  }

  if (options?.limit) {
    keys = keys.slice(0, options.limit)
  }

  return {
    objects: keys.map(key => ({ key })),
    truncated: false,
  }
}
