export async function analyticsWriteDataPoint(data: {
  indexes: string[]
  blobs: string[]
  doubles: number[]
}): Promise<void> {
  const storage = useStorage('analytics')
  await storage.setItem(`${Date.now()}-${Math.random().toString(36).slice(2)}`, JSON.stringify({
    ...data,
    timestamp: Date.now(),
  }))
}

export async function analyticsQuery(_sql: string): Promise<{ data: Record<string, unknown>[] }> {
  const storage = useStorage('analytics')
  const keys = await storage.getKeys()

  const points: Array<{ timestamp: number, indexes: string[], blobs: string[], doubles: number[] }> = []
  for (const key of keys.slice(-100)) {
    const data = await storage.getItem(key)
    if (data) {
      points.push(JSON.parse(data as string))
    }
  }

  const result = points.map((point, index) => {
    const obj: Record<string, unknown> = {
      time: new Date(point.timestamp).toISOString().replace('T', ' ').substring(0, 19),
      timestamp: new Date(point.timestamp).toISOString(),
      _sample_interval: 1,
      index1: point.indexes[0] || '',
    }

    const blobsMap: Record<string, number> = {
      slug: 0,
      url: 1,
      ua: 2,
      ip: 3,
      referer: 4,
      country: 5,
      region: 6,
      city: 7,
      timezone: 8,
      language: 9,
      os: 10,
      browser: 11,
      browserType: 12,
      device: 13,
      deviceType: 14,
      COLO: 15,
    }

    const doublesMap: Record<string, number> = {
      latitude: 0,
      longitude: 1,
    }

    Object.entries(blobsMap).forEach(([key, idx]) => {
      obj[`blob${idx + 1}`] = point.blobs[idx] || ''
      obj[key] = point.blobs[idx] || ''
    })

    Object.entries(doublesMap).forEach(([key, idx]) => {
      obj[`double${idx + 1}`] = point.doubles[idx] || 0
      obj[key] = point.doubles[idx] || 0
    })

    obj.id = `event-${index}-${Date.now()}`
    return obj
  })

  return { data: result }
}

export function analyticsUseWAE(event: unknown, sql: string) {
  return analyticsQuery(sql)
}
