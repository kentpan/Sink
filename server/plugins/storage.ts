import { isCloudflareEnv } from '../utils/env'

export default defineNitroPlugin(async (nitroApp) => {
  if (isCloudflareEnv()) {
    return
  }

  try {
    const fs = await import('node:fs')
    const path = await import('node:path')

    const { JSONFilePreset } = await import('lowdb/node')

    const projectRoot = process.cwd()
    const dataDir = path.join(projectRoot, 'server/data')

    if (!fs.default.existsSync(dataDir)) {
      fs.default.mkdirSync(dataDir, { recursive: true })
    }

    const storage = (nitroApp as any).storage

    if (!storage || typeof storage.defineDriver !== 'function') {
      return
    }

    storage.defineDriver('lowdb-kv', async () => {
      const db: any = await JSONFilePreset(path.join(dataDir, 'kv.json'), { links: {} })
      return {
        hasItem(key: string) {
          return key in db.data.links
        },
        getItem(key: string) {
          const entry = db.data.links[key]
          if (!entry)
            return null
          if (entry.expiration && Date.now() / 1000 > entry.expiration) {
            delete db.data.links[key]
            db.write()
            return null
          }
          return JSON.stringify(entry.value)
        },
        setItem(key: string, value: string) {
          db.data.links[key] = JSON.parse(value)
          return db.write()
        },
        removeItem(key: string) {
          delete db.data.links[key]
          return db.write()
        },
        getKeys() {
          return Object.keys(db.data.links)
        },
      }
    })

    storage.defineDriver('lowdb-api-keys', async () => {
      const db: any = await JSONFilePreset(path.join(dataDir, 'api-keys.json'), { keys: [] })
      return {
        hasItem(key: string) {
          return db.data.keys.some((k: { id: string }) => k.id === key)
        },
        getItem(key: string) {
          const item = db.data.keys.find((k: { id: string }) => k.id === key)
          return item ? JSON.stringify(item) : null
        },
        setItem(key: string, value: string) {
          const index = db.data.keys.findIndex((k: { id: string }) => k.id === key)
          const item = JSON.parse(value)
          if (index >= 0) {
            db.data.keys[index] = item
          }
          else {
            db.data.keys.push(item)
          }
          return db.write()
        },
        removeItem(key: string) {
          db.data.keys = db.data.keys.filter((k: { id: string }) => k.id !== key)
          return db.write()
        },
        getKeys() {
          return db.data.keys.map((k: { id: string }) => k.id)
        },
      }
    })

    storage.defineDriver('lowdb-users', async () => {
      const db: any = await JSONFilePreset(path.join(dataDir, 'users.json'), { users: [] })
      return {
        hasItem(key: string) {
          return db.data.users.some((u: { id: string }) => u.id === key)
        },
        getItem(key: string) {
          const item = db.data.users.find((u: { id: string }) => u.id === key)
          return item ? JSON.stringify(item) : null
        },
        setItem(key: string, value: string) {
          const index = db.data.users.findIndex((u: { id: string }) => u.id === key)
          const item = JSON.parse(value)
          if (index >= 0) {
            db.data.users[index] = item
          }
          else {
            db.data.users.push(item)
          }
          return db.write()
        },
        removeItem(key: string) {
          db.data.users = db.data.users.filter((u: { id: string }) => u.id !== key)
          return db.write()
        },
        getKeys() {
          return db.data.users.map((u: { id: string }) => u.id)
        },
      }
    })

    storage.defineDriver('lowdb-analytics', async () => {
      const db: any = await JSONFilePreset(path.join(dataDir, 'analytics.json'), { events: [] })
      return {
        hasItem() {
          return false
        },
        getItem() {
          return null
        },
        setItem(_key: string, value: string) {
          db.data.events.push(JSON.parse(value))
          return db.write()
        },
        removeItem() {
          return Promise.resolve()
        },
        getKeys() {
          return []
        },
      }
    })

    storage.defineDriver('lowdb-r2', async () => {
      const r2Dir = path.join(dataDir, 'r2-files')
      if (!fs.default.existsSync(r2Dir)) {
        fs.default.mkdirSync(r2Dir, { recursive: true })
      }
      return {
        hasItem(key: string) {
          return fs.default.existsSync(path.join(r2Dir, key))
        },
        getItem(key: string) {
          const filePath = path.join(r2Dir, key)
          if (!fs.default.existsSync(filePath))
            return null
          return fs.default.readFileSync(filePath)
        },
        setItem(key: string, value: string) {
          const filePath = path.join(r2Dir, key)
          fs.default.writeFileSync(filePath, value)
          return Promise.resolve()
        },
        removeItem(key: string) {
          const filePath = path.join(r2Dir, key)
          if (fs.default.existsSync(filePath)) {
            fs.default.unlinkSync(filePath)
          }
          return Promise.resolve()
        },
        getKeys() {
          return fs.default.readdirSync(r2Dir)
        },
      }
    })

    if (typeof storage.setup === 'function') {
      await storage.setup({
        mounts: {
          'kv': { driver: 'lowdb-kv' },
          'api-keys': { driver: 'lowdb-api-keys' },
          'users': { driver: 'lowdb-users' },
          'analytics': { driver: 'lowdb-analytics' },
          'r2': { driver: 'lowdb-r2' },
        },
      })
    }
  }
  catch {
    // Ignore errors during prerender
  }
})
