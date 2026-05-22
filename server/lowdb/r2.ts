const isCloudflare = process.env.NODE_ENV === 'production' || process.env.NUXT_USE_CLOUDFLARE === 'true'

let db: any = null
let filesDir: string = ''

async function getDB() {
  if (db)
    return db

  if (isCloudflare) {
    throw new Error('lowdb is not available in Cloudflare mode')
  }

  const fs = await import('node:fs')
  const path = await import('node:path')
  const { fileURLToPath } = await import('node:url')
  const { JSONFilePreset } = await import('lowdb/node')

  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const dbPath = path.join(__dirname, '../data/r2.json')
  filesDir = path.join(__dirname, '../data/r2-files')

  if (!fs.default.existsSync(filesDir)) {
    fs.default.mkdirSync(filesDir, { recursive: true })
  }

  db = await JSONFilePreset(dbPath, { objects: {} })
  return db
}

async function getFs() {
  if (isCloudflare) {
    throw new Error('fs is not available in Cloudflare mode')
  }
  return await import('node:fs')
}

async function getPath() {
  if (isCloudflare) {
    throw new Error('path is not available in Cloudflare mode')
  }
  return await import('node:path')
}

async function getBuffer() {
  if (isCloudflare) {
    throw new Error('Buffer is not available in Cloudflare mode')
  }
  return await import('node:buffer')
}

export async function r2Put(key: string, value: ArrayBuffer | string, options?: {
  httpMetadata?: {
    contentType: string
  }
}): Promise<void> {
  const database = await getDB()
  const fs = await getFs()
  const path = await getPath()
  const { Buffer } = await getBuffer()

  const filePath = path.join(filesDir, encodeURIComponent(key))

  if (value instanceof ArrayBuffer) {
    fs.default.writeFileSync(filePath, Buffer.from(value))
  }
  else {
    fs.default.writeFileSync(filePath, value)
  }

  database.data.objects[key] = {
    key,
    content: filePath,
    contentType: options?.httpMetadata?.contentType || 'application/octet-stream',
    httpMetadata: options?.httpMetadata || { contentType: 'application/octet-stream' },
  }

  await database.write()
}

export async function r2Get(key: string): Promise<{ body: Uint8Array, httpMetadata: { contentType: string } } | null> {
  const database = await getDB()
  const fs = await getFs()

  const obj = database.data.objects[key]

  if (!obj)
    return null

  const filePath = obj.content
  if (!fs.default.existsSync(filePath))
    return null

  const content = fs.default.readFileSync(filePath)
  return {
    body: new Uint8Array(content.buffer, content.byteOffset, content.byteLength),
    httpMetadata: obj.httpMetadata,
  }
}

export async function r2Delete(key: string): Promise<void> {
  const database = await getDB()
  const fs = await getFs()

  const obj = database.data.objects[key]

  if (obj) {
    const filePath = obj.content
    if (fs.default.existsSync(filePath)) {
      fs.default.unlinkSync(filePath)
    }
    delete database.data.objects[key]
    await database.write()
  }
}

export interface R2ListResult {
  objects: Array<{ key: string }>
  truncated: boolean
}

export async function r2List(options?: {
  prefix?: string
  limit?: number
}): Promise<R2ListResult> {
  const database = await getDB()
  let keys = Object.keys(database.data.objects)

  if (options?.prefix) {
    keys = keys.filter(key => key.startsWith(options.prefix))
  }

  if (options?.limit) {
    keys = keys.slice(0, options.limit)
  }

  return {
    objects: keys.map(key => ({ key })),
    truncated: false,
  }
}
