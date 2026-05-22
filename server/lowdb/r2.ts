import { Buffer } from 'node:buffer'
import * as fs from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSONFilePreset } from 'lowdb/node'

interface R2Object {
  key: string
  content: string
  contentType: string
  httpMetadata: {
    contentType: string
  }
}

interface R2Data {
  objects: Record<string, R2Object>
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbPath = join(__dirname, '../data/r2.json')
const filesDir = join(__dirname, '../data/r2-files')

let db: ReturnType<typeof JSONFilePreset<R2Data>> | null = null

async function getDB() {
  if (db)
    return db

  if (!fs.existsSync(filesDir)) {
    fs.mkdirSync(filesDir, { recursive: true })
  }

  db = await JSONFilePreset<R2Data>(dbPath, { objects: {} })
  return db
}

export async function r2Put(key: string, value: ArrayBuffer | string, options?: {
  httpMetadata?: {
    contentType: string
  }
}): Promise<void> {
  const database = await getDB()

  const filePath = join(filesDir, encodeURIComponent(key))

  if (value instanceof ArrayBuffer) {
    fs.writeFileSync(filePath, Buffer.from(value))
  }
  else {
    fs.writeFileSync(filePath, value)
  }

  database.data.objects[key] = {
    key,
    content: filePath,
    contentType: options?.httpMetadata?.contentType || 'application/octet-stream',
    httpMetadata: options?.httpMetadata || { contentType: 'application/octet-stream' },
  }

  await database.write()
}

export async function r2Get(key: string): Promise<{ body: Buffer, httpMetadata: { contentType: string } } | null> {
  const database = await getDB()
  const obj = database.data.objects[key]

  if (!obj)
    return null

  const filePath = obj.content
  if (!fs.existsSync(filePath))
    return null

  const content = fs.readFileSync(filePath)
  return {
    body: content,
    httpMetadata: obj.httpMetadata,
  }
}

export async function r2Delete(key: string): Promise<void> {
  const database = await getDB()
  const obj = database.data.objects[key]

  if (obj) {
    const filePath = obj.content
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
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
