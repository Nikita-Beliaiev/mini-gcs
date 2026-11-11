import { describe, expect, it } from 'vitest'
import { en } from './en'
import { uk } from './uk'

describe('Ukrainian messages', () => {
  it('agrees the number of active alerts with the count', () => {
    expect([1, 3, 5, 21].map((count) => uk.alerts.active(count))).toEqual([
      '1 активне сповіщення',
      '3 активні сповіщення',
      '5 активних сповіщень',
      '21 активне сповіщення',
    ])
  })

  it('describes the vehicle mission with the right waypoint form', () => {
    expect(uk.planning.mission.onVehicle(2, 4, null)).toBe('Місія 2 на борту: 4 точки')
    expect(uk.planning.mission.onVehicle(2, 5, 3)).toBe(
      'Місія 2 на борту: 5 точок, летить до точки 3',
    )
  })

  it('uses the case each limit needs', () => {
    expect(uk.planIssues.tooManyWaypoints(20)).toBe('Не більше 20 точок маршруту')
    expect(uk.planIssues.tooFewVertices(3)).toBe('Додайте щонайменше 3 вершини')
    expect(uk.planIssues.tooManyVertices(20)).toBe('Не більше 20 вершин')
  })

  it('keeps the chart window title natural', () => {
    expect(uk.charts.title(60)).toBe('Останні 60 секунд')
  })
})

describe('English messages', () => {
  it('uses the singular only for one', () => {
    expect(en.alerts.active(1)).toBe('1 active alert')
    expect(en.alerts.active(2)).toBe('2 active alerts')
    expect(en.planning.geofence.waypointsOutside(1)).toMatch(
      /^1 waypoint of the vehicle mission is/,
    )
    expect(en.planning.geofence.waypointsOutside(3)).toMatch(
      /^3 waypoints of the vehicle mission are/,
    )
  })
})
