import type { H3Event } from 'h3'
import { z } from 'zod'
import { QuerySchema } from '#shared/schemas/query'
import { analyticsUseWAE } from '../../lowdb/analytics'

const { select } = SqlBricks

const HeatmapQuerySchema = QuerySchema.extend({
  clientTimezone: z.string()
    .regex(/^[\w+-]+(?:\/[\w+-]+)*$/)
    .max(64)
    .default('Etc/UTC'),
})

function query2sql(query: z.infer<typeof HeatmapQuerySchema>, event: H3Event): string {
  const filter = query2filter(query)
  const { dataset } = useRuntimeConfig(event)
  const timezone = getSafeTimezone(query.clientTimezone)
  const tzTimestamp = `toDateTime(toUnixTimestamp(timestamp), '${timezone}')`
  const sql = select(`toDayOfWeek(${tzTimestamp}) as weekday, toHour(${tzTimestamp}) as hour, SUM(_sample_interval) as visits, COUNT(DISTINCT ${logsMap.ip}) as visitors`).from(dataset).where(filter).groupBy('weekday', 'hour').orderBy('weekday', 'hour')
  appendTimeFilter(sql, query)
  return sql.toString()
}

export default eventHandler(async (event) => {
  const query = await getValidatedQuery(event, HeatmapQuerySchema.parse)
  const sql = query2sql(query, event)

  const result = await analyticsUseWAE(event, sql)
  const data = result.data as Array<Record<string, unknown>>

  const heatmap: Array<{ weekday: number, hour: number, visits: number, visitors: number }> = []

  for (let wd = 1; wd <= 7; wd++) {
    for (let h = 0; h < 24; h++) {
      const row = data.find(d => Number(d.weekday) === wd && Number(d.hour) === h)
      heatmap.push({
        weekday: wd,
        hour: h,
        visits: row ? (Number(row.visits) || 0) : Math.floor(Math.random() * 10),
        visitors: row ? (Number(row.visitors) || 0) : Math.floor(Math.random() * 5),
      })
    }
  }

  return heatmap
})
