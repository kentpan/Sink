import type { H3Event } from 'h3'
import type { BlobsMap, DoublesMap } from '#server/utils/access-log'
import { z } from 'zod'
import { QuerySchema } from '#shared/schemas/query'
import { isLocalMode } from '../../utils/local-mode'

const { select } = SqlBricks

type MetricType = BlobsMap[keyof BlobsMap] | DoublesMap[keyof DoublesMap]
const validMetricTypes = [...Object.values(blobsMap), ...Object.values(doublesMap)] as [MetricType, ...MetricType[]]

const MetricsQuerySchema = QuerySchema.extend({
  type: z.enum(validMetricTypes),
})

function query2sql(query: z.infer<typeof MetricsQuerySchema>, event: H3Event): string {
  const filter = query2filter(query)
  const { dataset } = useRuntimeConfig(event)

  const sql = select(`${logsMap[query.type]} as name, SUM(_sample_interval) as count`)
    .from(dataset)
    .where(filter)
    .groupBy('name')
    .orderBy('count DESC')

  appendTimeFilter(sql, query)

  const limit = Math.max(0, Math.floor(query.limit))
  return `${sql.toString()} LIMIT ${limit}`
}

export default eventHandler(async (event) => {
  const query = await getValidatedQuery(event, MetricsQuerySchema.parse)
  const sql = query2sql(query, event)

  if (isLocalMode(event)) {
    const { analyticsUseWAE } = await import('../../lowdb/analytics')
    const result = await analyticsUseWAE(event, sql)
    const data = result.data as Array<{ name: string, count: number }>

    const browsers = ['Chrome', 'Safari', 'Firefox', 'Edge', 'Opera']
    const os = ['macOS', 'Windows', 'Linux', 'iOS', 'Android']

    if (query.type === 'browser') {
      return browsers.map((name, i) => ({
        name,
        count: data.find(d => d.name === name)?.count || (500 - i * 50),
      }))
    }

    if (query.type === 'os') {
      return os.map((name, i) => ({
        name,
        count: data.find(d => d.name === name)?.count || (400 - i * 40),
      }))
    }

    return data.slice(0, Math.floor(query.limit))
  }

  return useWAE(event, sql)
})
