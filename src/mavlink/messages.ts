export interface Heartbeat {
  name: 'HEARTBEAT'
  customMode: number
  type: number
  autopilot: number
  baseMode: number
}

export interface SysStatus {
  name: 'SYS_STATUS'
  batteryRemaining: number
}

export interface GpsRawInt {
  name: 'GPS_RAW_INT'
  fixType: number
  satellitesVisible: number
}

export interface Attitude {
  name: 'ATTITUDE'
  roll: number
  pitch: number
  yaw: number
}

export interface GlobalPositionInt {
  name: 'GLOBAL_POSITION_INT'
  lat: number
  lon: number
  relativeAlt: number
  vx: number
  vy: number
  hdg: number
}

export interface MissionCurrent {
  name: 'MISSION_CURRENT'
  seq: number
}

export interface MissionCount {
  name: 'MISSION_COUNT'
  count: number
  targetSystem: number
  missionType: number
}

export interface MissionClearAll {
  name: 'MISSION_CLEAR_ALL'
  targetSystem: number
  missionType: number
}

export interface MissionAck {
  name: 'MISSION_ACK'
  targetSystem: number
  type: number
  missionType: number
}

export interface MissionItemInt {
  name: 'MISSION_ITEM_INT'
  param1: number
  x: number
  y: number
  seq: number
  command: number
  targetSystem: number
  missionType: number
}

export interface FenceStatus {
  name: 'FENCE_STATUS'
  breachStatus: number
}

export interface HomePosition {
  name: 'HOME_POSITION'
  latitude: number
  longitude: number
}

export type MavlinkMessage =
  | Heartbeat
  | SysStatus
  | GpsRawInt
  | Attitude
  | GlobalPositionInt
  | MissionCurrent
  | MissionCount
  | MissionClearAll
  | MissionAck
  | MissionItemInt
  | FenceStatus
  | HomePosition

export interface MessageDefinition {
  crcExtra: number
  length: number
  decode: (view: DataView) => MavlinkMessage
}

export const MESSAGE_DEFINITIONS: ReadonlyMap<number, MessageDefinition> = new Map([
  [
    0,
    {
      crcExtra: 50,
      length: 9,
      decode: (view) => ({
        name: 'HEARTBEAT',
        customMode: view.getUint32(0, true),
        type: view.getUint8(4),
        autopilot: view.getUint8(5),
        baseMode: view.getUint8(6),
      }),
    },
  ],
  [
    1,
    {
      crcExtra: 124,
      length: 43,
      decode: (view) => ({ name: 'SYS_STATUS', batteryRemaining: view.getInt8(30) }),
    },
  ],
  [
    24,
    {
      crcExtra: 24,
      length: 52,
      decode: (view) => ({
        name: 'GPS_RAW_INT',
        fixType: view.getUint8(28),
        satellitesVisible: view.getUint8(29),
      }),
    },
  ],
  [
    30,
    {
      crcExtra: 39,
      length: 28,
      decode: (view) => ({
        name: 'ATTITUDE',
        roll: view.getFloat32(4, true),
        pitch: view.getFloat32(8, true),
        yaw: view.getFloat32(12, true),
      }),
    },
  ],
  [
    33,
    {
      crcExtra: 104,
      length: 28,
      decode: (view) => ({
        name: 'GLOBAL_POSITION_INT',
        lat: view.getInt32(4, true),
        lon: view.getInt32(8, true),
        relativeAlt: view.getInt32(16, true),
        vx: view.getInt16(20, true),
        vy: view.getInt16(22, true),
        hdg: view.getUint16(26, true),
      }),
    },
  ],
  [
    42,
    {
      crcExtra: 28,
      length: 6,
      decode: (view) => ({ name: 'MISSION_CURRENT', seq: view.getUint16(0, true) }),
    },
  ],
  [
    44,
    {
      crcExtra: 221,
      length: 5,
      decode: (view) => ({
        name: 'MISSION_COUNT',
        count: view.getUint16(0, true),
        targetSystem: view.getUint8(2),
        missionType: view.getUint8(4),
      }),
    },
  ],
  [
    45,
    {
      crcExtra: 232,
      length: 3,
      decode: (view) => ({
        name: 'MISSION_CLEAR_ALL',
        targetSystem: view.getUint8(0),
        missionType: view.getUint8(2),
      }),
    },
  ],
  [
    47,
    {
      crcExtra: 153,
      length: 4,
      decode: (view) => ({
        name: 'MISSION_ACK',
        targetSystem: view.getUint8(0),
        type: view.getUint8(2),
        missionType: view.getUint8(3),
      }),
    },
  ],
  [
    73,
    {
      crcExtra: 38,
      length: 38,
      decode: (view) => ({
        name: 'MISSION_ITEM_INT',
        param1: view.getFloat32(0, true),
        x: view.getInt32(16, true),
        y: view.getInt32(20, true),
        seq: view.getUint16(28, true),
        command: view.getUint16(30, true),
        targetSystem: view.getUint8(32),
        missionType: view.getUint8(37),
      }),
    },
  ],
  [
    162,
    {
      crcExtra: 189,
      length: 9,
      decode: (view) => ({ name: 'FENCE_STATUS', breachStatus: view.getUint8(6) }),
    },
  ],
  [
    242,
    {
      crcExtra: 104,
      length: 60,
      decode: (view) => ({
        name: 'HOME_POSITION',
        latitude: view.getInt32(0, true),
        longitude: view.getInt32(4, true),
      }),
    },
  ],
])
