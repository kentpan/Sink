export const mockStats = {
  visits: 1234,
  visitors: 567,
  referers: 89,
}

export const mockViews = [
  { time: '2024-01-01 00:00', visits: 100, visitors: 50 },
  { time: '2024-01-01 01:00', visits: 80, visitors: 45 },
  { time: '2024-01-01 02:00', visits: 60, visitors: 30 },
]

export const mockHeatmap = [
  { weekday: 1, hour: 0, visits: 10, visitors: 5 },
  { weekday: 1, hour: 1, visits: 8, visitors: 4 },
]

export const mockMetrics = [
  { name: 'Chrome', count: 500 },
  { name: 'Safari', count: 300 },
  { name: 'Firefox', count: 200 },
]

export const mockEvents = [
  {
    slug: 'test',
    url: 'https://example.com',
    ua: 'Mozilla/5.0',
    referer: 'google.com',
    country: 'US',
    region: 'CA',
    city: 'San Francisco',
    timezone: 'America/Los_Angeles',
    language: 'en',
    os: 'macOS',
    browser: 'Chrome',
    browserType: 'browser',
    device: 'MacBook',
    deviceType: 'desktop',
    COLO: 'SFO',
    latitude: 37.7749,
    longitude: -122.4194,
    id: crypto.randomUUID(),
    timestamp: Date.now() / 1000,
  },
]

export const mockLocations = [
  { region: 'US-CA', latitude: 37.7749, longitude: -122.4194, count: 100 },
  { region: 'US-NY', latitude: 40.7128, longitude: -74.0060, count: 80 },
]

export const mockAccessExport = [
  { slug: 'test', url: 'https://example.com', viewer: 100, views: 200, referer: 10 },
]
