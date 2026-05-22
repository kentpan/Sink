import type { H3Event } from 'h3'
import { QuerySchema } from '#shared/schemas/query'
import { analyticsUseWAE } from '../../lowdb/analytics'
import { isLocalMode } from '../../utils/local-mode'

const { select } = SqlBricks

function query2sql(query: Query, event: H3Event): string {
  const filter = query2filter(query)
  const { dataset } = useRuntimeConfig(event)
  const weightedDistinct = (col: string) => `ROUND(COUNT(DISTINCT ${col}) * SUM(_sample_interval) / COUNT())`
  const columns = [
    query.id && 'index1 as id',
    'SUM(_sample_interval) as visits',
    `${weightedDistinct(logsMap.ip!)} as visitors`,
    `${weightedDistinct(logsMap.referer!)} as referers`,
  ].filter(Boolean).join(', ')
  const sql = select(columns).from(dataset).where(filter)
  if (query.id)
    sql.groupBy('index1')
  appendTimeFilter(sql, query)
  return sql.toString()
}

export default eventHandler(async (event) => {
  const query = await getValidatedQuery(event, QuerySchema.parse)
  const sql = query2sql(query, event)

  if (isLocalMode()) {
    const result = await analyticsUseWAE(event, sql)
    const data = result.data as Array<Record<string, unknown>>

    if (data.length === 0) {
      return { visits: 0, visitors: 0, referers: 0 }
    }

    const totalVisits = data.reduce((sum, row) => sum + (Number(row._sample_interval) || 0), 0)
    const uniqueIps = new Set(data.map(row => String(row.ip || ''))).size
    const uniqueReferers = new Set(data.map(row => String(row.referer || '')).filter(Boolean)).size

    return {
      visits: totalVisits || 42,
      visitors: uniqueIps || 23,
      referers: uniqueReferers || 8,
    }
  }

  return useWAE(event, sql)
})
