export const SIMULATOR_FLIGHT_MODES = ['STANDBY', 'TAKEOFF', 'AUTO', 'RTL', 'LAND'] as const

export const ARDUCOPTER_FLIGHT_MODES = [
  'STABILIZE',
  'ACRO',
  'ALT_HOLD',
  'AUTO',
  'GUIDED',
  'LOITER',
  'RTL',
  'CIRCLE',
  'LAND',
  'DRIFT',
  'SPORT',
  'FLIP',
  'AUTOTUNE',
  'POSHOLD',
  'BRAKE',
  'THROW',
  'AVOID_ADSB',
  'GUIDED_NOGPS',
  'SMART_RTL',
  'FLOWHOLD',
  'FOLLOW',
  'ZIGZAG',
  'SYSTEMID',
  'AUTOROTATE',
  'AUTO_RTL',
  'TURTLE',
  'RATE_ACRO',
] as const

export const FLIGHT_MODES = ['STANDBY', 'TAKEOFF', ...ARDUCOPTER_FLIGHT_MODES, 'UNKNOWN'] as const

export type FlightMode = (typeof FLIGHT_MODES)[number]
export type SimulatorFlightMode = (typeof SIMULATOR_FLIGHT_MODES)[number]
