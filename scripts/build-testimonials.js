import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const TWEET_IDS = [
  '1990813013247492308',
  '1876990358250246628',
  '1931199560489251052',
  '1944683470627741966',
  '1925250262870237555',
  '1795169172873413116',
  '1953003326317920422',
  '1809763345320624271',
  '1833125667568804284',
  '1817702576629985685',
  '1846465874389356916',
  '1796478331522781460',
  '1905626254931624281',
  '1930301401323975179',
  '1961700003459862799',
  '1794746047136411723',
  '1988243083558035901',
  '1808150012058390969',
  '1893594908147270073',
  '1857623546606080350',
]

const API_BASE = 'https://react-tweet.vercel.app/api/tweet'
const TCO_REGEX = /https:\/\/t\.co\/\w+/g
const WHITESPACE_REGEX = /\s+/g

async function fetchTweet(id) {
  const res = await fetch(`${API_BASE}/${id}`)
  if (!res.ok) {
    console.warn(`Failed to fetch tweet ${id}: ${res.status}`)
    return null
  }

  const json = await res.json()
  const tweet = json.data

  if (!tweet) {
    console.warn(`No data for tweet ${id}`)
    return null
  }

  const cleanContent = tweet.text
    .replace(TCO_REGEX, '')
    .replace(WHITESPACE_REGEX, ' ')
    .trim()

  return {
    id: tweet.id_str,
    name: tweet.user.name,
    username: tweet.user.screen_name,
    content: cleanContent,
    url: `https://x.com/${tweet.user.screen_name}/status/${tweet.id_str}`,
    verified: tweet.user.is_blue_verified || false,
    date: tweet.created_at,
  }
}

async function main() {
  console.log('Fetching testimonials from Twitter...')

  const shuffledIds = [...TWEET_IDS].sort(() => Math.random() - 0.5)

  const results = await Promise.all(shuffledIds.map(fetchTweet))
  const testimonials = results.filter(Boolean)

  if (testimonials.length === 0) {
    console.error('No testimonials fetched!')
    process.exit(1)
  }

  const dataDir = join(import.meta.dirname, '../app/data')
  mkdirSync(dataDir, { recursive: true })

  const outputPath = join(dataDir, 'testimonials.json')
  writeFileSync(outputPath, JSON.stringify(testimonials, null, 2), 'utf8')

  console.log(`✓ Generated ${testimonials.length} testimonials to ${outputPath}`)
}

main().catch((err) => {
  console.error('Failed to build testimonials:', err)
  process.exit(1)
})
