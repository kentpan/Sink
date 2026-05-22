import { isCloudflareEnv } from '../utils/env'

const storageCache: Record<string, ReturnType<typeof useStorage>> = {}

export function getStorage(name: string) {
  if (isCloudflareEnv()) {
    return useStorage(name)
  }

  if (storageCache[name]) {
    return storageCache[name]
  }

  const storage = useStorage(name)
  storageCache[name] = storage
  return storage
}
