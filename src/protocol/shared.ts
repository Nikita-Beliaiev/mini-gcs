import { z } from 'zod'

export const MAX_POINTS_PER_MESSAGE = 100

export const latLonSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
})

export const pointListSchema = z.array(latLonSchema).max(MAX_POINTS_PER_MESSAGE)

export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch {
    return undefined
  }
}
