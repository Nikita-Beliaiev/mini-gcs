import fixtures from '../mavlink/fixtures/frames.json'
import type { MavlinkMessage } from '../mavlink/messages'

type Fields = Record<string, unknown>

export interface FrameFixture {
  label: string
  bytes: Uint8Array
  fields: Fields
}

export function hexToBytes(hex: string): Uint8Array {
  return new Uint8Array(hex.match(/../g)?.map((pair) => Number.parseInt(pair, 16)) ?? [])
}

export const frameFixtures: readonly FrameFixture[] = fixtures.frames.map((fixture) => ({
  label: fixture.label,
  bytes: hexToBytes(fixture.hex),
  fields: fixture.fields,
}))

export const v1Heartbeat = hexToBytes(fixtures.v1Heartbeat)
export const signedMissionCurrent = hexToBytes(fixtures.signedMissionCurrent)

export function frameFixture(label: string): FrameFixture {
  const fixture = frameFixtures.find((candidate) => candidate.label === label)
  if (!fixture) {
    throw new Error(`No frame fixture named ${label}`)
  }
  return fixture
}

export function expectedMessage(fields: Fields): MavlinkMessage | null {
  const field = (name: string) => fields[name] as number
  switch (fields.mavpackettype) {
    case 'HEARTBEAT':
      return {
        name: 'HEARTBEAT',
        customMode: field('custom_mode'),
        type: field('type'),
        autopilot: field('autopilot'),
        baseMode: field('base_mode'),
      }
    case 'SYS_STATUS':
      return { name: 'SYS_STATUS', batteryRemaining: field('battery_remaining') }
    case 'GPS_RAW_INT':
      return {
        name: 'GPS_RAW_INT',
        fixType: field('fix_type'),
        satellitesVisible: field('satellites_visible'),
      }
    case 'ATTITUDE':
      return { name: 'ATTITUDE', roll: field('roll'), pitch: field('pitch'), yaw: field('yaw') }
    case 'GLOBAL_POSITION_INT':
      return {
        name: 'GLOBAL_POSITION_INT',
        lat: field('lat'),
        lon: field('lon'),
        relativeAlt: field('relative_alt'),
        vx: field('vx'),
        vy: field('vy'),
        hdg: field('hdg'),
      }
    case 'MISSION_CURRENT':
      return { name: 'MISSION_CURRENT', seq: field('seq') }
    case 'MISSION_COUNT':
      return {
        name: 'MISSION_COUNT',
        count: field('count'),
        targetSystem: field('target_system'),
        missionType: field('mission_type'),
      }
    case 'MISSION_CLEAR_ALL':
      return {
        name: 'MISSION_CLEAR_ALL',
        targetSystem: field('target_system'),
        missionType: field('mission_type'),
      }
    case 'MISSION_ACK':
      return {
        name: 'MISSION_ACK',
        targetSystem: field('target_system'),
        type: field('type'),
        missionType: field('mission_type'),
      }
    case 'MISSION_ITEM_INT':
      return {
        name: 'MISSION_ITEM_INT',
        param1: field('param1'),
        x: field('x'),
        y: field('y'),
        seq: field('seq'),
        command: field('command'),
        targetSystem: field('target_system'),
        missionType: field('mission_type'),
      }
    case 'FENCE_STATUS':
      return { name: 'FENCE_STATUS', breachStatus: field('breach_status') }
    case 'HOME_POSITION':
      return {
        name: 'HOME_POSITION',
        latitude: field('latitude'),
        longitude: field('longitude'),
      }
    default:
      return null
  }
}
