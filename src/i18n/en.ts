import { pluralize } from './plural'

function count(value: number, one: string, other: string): string {
  return `${String(value)} ${pluralize('en', value, { one, other })}`
}

export const en = {
  app: {
    language: 'Language',
  },
  units: {
    meters: 'm',
    kilometers: 'km',
    metersPerSecond: 'm/s',
    seconds: 's',
    milliseconds: 'ms',
    percent: '%',
    satellites: 'sats',
  },
  connection: {
    status: {
      disconnected: 'Disconnected',
      connecting: 'Connecting…',
      connected: 'Connected',
      reconnecting: 'Reconnecting…',
    },
    connect: 'Connect',
    disconnect: 'Disconnect',
  },
  alerts: {
    region: 'Alerts',
    none: 'No active alerts',
    active: (total: number) => count(total, 'active alert', 'active alerts'),
    severity: { critical: 'Critical', warning: 'Warning' },
    acknowledge: 'Acknowledge',
    acknowledgeAlert: (message: string) => `Acknowledge: ${message}`,
    linkLost: (seconds: number) => `Link lost: no heartbeat for over ${String(seconds)} s`,
    geofenceBreach: 'Vehicle is outside the geofence',
    batteryBelow: (percent: number) => `Battery below ${String(percent)}%`,
    gpsFixLost: 'GPS fix lost in flight',
  },
  telemetry: {
    title: 'Telemetry',
    attitudeIndicator: 'Attitude indicator',
    readouts: {
      flightMode: 'Flight mode',
      arming: 'Arming',
      altitude: 'Above home',
      aboveGround: 'Above ground',
      aboveSeaLevel: 'Above sea level',
      groundSpeed: 'Ground speed',
      heading: 'Heading',
      roll: 'Roll',
      pitch: 'Pitch',
      battery: 'Battery',
      gps: 'GPS',
      linkQuality: 'Link quality',
    },
    armed: 'Armed',
    disarmed: 'Disarmed',
    noGpsFix: 'No fix',
  },
  map: {
    title: 'Map',
    followVehicle: 'Follow vehicle',
    terrain3d: '3D terrain',
    loading: 'Loading map…',
    vehicle: 'Vehicle',
    home: 'Home',
    controls: {
      'AttributionControl.ToggleAttribution': 'Toggle attribution',
      'AttributionControl.MapFeedback': 'Map feedback',
      'Map.Title': 'Map',
      'Marker.Title': 'Map marker',
      'NavigationControl.ResetBearing': 'Drag to rotate map, click to reset north',
      'NavigationControl.ZoomIn': 'Zoom in',
      'NavigationControl.ZoomOut': 'Zoom out',
    },
  },
  charts: {
    title: (seconds: number) => `Last ${String(seconds)} seconds`,
    loading: 'Loading charts…',
    titles: {
      altitude: 'Altitude',
      groundSpeed: 'Ground speed',
      batteryAndLink: 'Battery and link',
    },
    series: {
      altitude: 'Altitude',
      groundSpeed: 'Ground speed',
      battery: 'Battery',
      linkQuality: 'Link quality',
    },
  },
  controls: {
    title: 'Controls',
    tabs: {
      mission: 'Mission',
      geofence: 'Geofence',
      simulator: 'Simulator',
      flightLog: 'Flight log',
    },
  },
  planning: {
    finishDrawing: 'Finish drawing',
    done: 'Done',
    loadFromVehicle: 'Load from vehicle',
    clear: 'Clear',
    uploadToVehicle: 'Upload to vehicle',
    removeFromVehicle: 'Remove from vehicle',
    upload: {
      pending: 'Uploading…',
      accepted: 'Accepted by the vehicle',
      rejected: (reason: string) => `Rejected: ${reason}`,
      rejectedByVehicle: 'Rejected by the vehicle',
      noResponse: 'No response from the vehicle',
    },
    mission: {
      draw: 'Draw route on map',
      drawingHint: 'Drawing the route: click the map to add a waypoint, drag a number to move it.',
      empty: (button: string) =>
        `No waypoints yet. Press “${button}” and click the map, or load the vehicle mission.`,
      uploadNote: 'A vehicle flying its mission switches to the new route right after the upload.',
      listLabel: 'Mission waypoints',
      shortName: 'WP',
      moveUp: (number: number) => `Move waypoint ${String(number)} up`,
      moveDown: (number: number) => `Move waypoint ${String(number)} down`,
      remove: (number: number) => `Remove waypoint ${String(number)}`,
      draftMarker: (number: number) => `Draft waypoint ${String(number)}`,
      problems: 'Mission problems',
      route: (distance: string) => `Route ${distance} from home and back`,
      waitingForVehicle: 'Waiting for the vehicle mission',
      onVehicle: (missionId: number, waypoints: number, activeWaypoint: number | null) =>
        `Vehicle mission ${String(missionId)}: ${count(waypoints, 'waypoint', 'waypoints')}${
          activeWaypoint === null ? '' : `, flying to WP ${String(activeWaypoint)}`
        }`,
    },
    geofence: {
      draw: 'Draw geofence on map',
      drawingHint: 'Drawing the geofence: click the map to add a vertex, drag a square to move it.',
      empty: (button: string) =>
        `No vertices yet. Press “${button}” and click the map, or load the vehicle geofence.`,
      listLabel: 'Geofence vertices',
      shortName: 'V',
      moveUp: (number: number) => `Move vertex ${String(number)} up`,
      moveDown: (number: number) => `Move vertex ${String(number)} down`,
      remove: (number: number) => `Remove vertex ${String(number)}`,
      draftMarker: (number: number) => `Draft geofence vertex ${String(number)}`,
      problems: 'Geofence problems',
      waitingForVehicle: 'Waiting for the vehicle geofence',
      noneOnVehicle: 'No geofence on the vehicle',
      onVehicle: (vertices: number) => `Vehicle geofence: ${count(vertices, 'vertex', 'vertices')}`,
      waypointsOutside: (waypoints: number) =>
        `${count(waypoints, 'waypoint', 'waypoints')} of the vehicle mission ${
          waypoints === 1 ? 'is' : 'are'
        } outside this geofence. The vehicle will return home when it crosses the border.`,
    },
  },
  planIssues: {
    noWaypoints: 'Add at least one waypoint',
    tooManyWaypoints: (max: number) => `Use at most ${String(max)} waypoints`,
    waypointTooFar: (number: number, kilometers: number) =>
      `Waypoint ${String(number)} is more than ${String(kilometers)} km from home`,
    waypointOutsideGeofence: (number: number) =>
      `Waypoint ${String(number)} is outside the geofence`,
    tooFewVertices: (min: number) => `Add at least ${String(min)} vertices`,
    tooManyVertices: (max: number) => `Use at most ${String(max)} vertices`,
    homeOutsideGeofence: 'Home must be inside the geofence',
    waitingForHome: 'Waiting for the home position',
  },
  faults: {
    note: 'These controls change the simulation, not the vehicle. Use them to see how the station reacts to failures.',
    linkLoss: 'Drop the link for 10 s',
    gpsLoss: 'Lose GPS for 15 s',
    batteryDrop: 'Drain the battery to 32%',
    started: (fault: string) => `Started: ${fault}`,
    failed: (fault: string) => `Failed: ${fault}`,
  },
  flightLog: {
    note: (minutes: number) =>
      `The station records the last ${String(minutes)} minutes of telemetry, like a flight recorder.`,
    recorded: (duration: string) => `Recorded ${duration}`,
    replayRecording: 'Replay recording',
    download: 'Download log',
    open: 'Open a flight log',
    formats:
      'Mini GCS logs (.json) and MAVLink telemetry logs (.tlog) from ArduPilot, Mission Planner or QGroundControl.',
    openSample: 'Replay a real ArduPilot flight',
    sampleName: 'ArduCopter SITL flight',
    sampleError: 'The sample flight could not be loaded.',
    fileError: (fileName: string, error: string) => `${fileName}: ${error}`,
    recordingSource: 'Recording from this session',
    errors: {
      tooLarge: (megabytes: number) => `The file is larger than ${String(megabytes)} MB.`,
      notJson: 'The file is not valid JSON.',
      notFlightLog: 'This file is not a Mini GCS flight log.',
      invalid: 'The flight log is damaged or was saved by an unsupported version.',
      notTlog: 'This file is not a MAVLink telemetry log or has no vehicle data.',
    },
    title: 'Flight log',
    source: 'Source',
    saved: 'Saved',
    length: 'Length',
    messages: 'Messages',
    commandsUnavailable: 'Commands are not available while replaying a flight.',
  },
  replay: {
    status: 'Replay',
    backToLive: 'Back to live',
    title: 'Flight replay',
    play: 'Play',
    pause: 'Pause',
    back: (seconds: number) => `Back ${String(seconds)} s`,
    forward: (seconds: number) => `Forward ${String(seconds)} s`,
    speed: 'Speed',
    position: 'Replay position',
    positionOf: (position: string, duration: string) => `${position} of ${duration}`,
    noLink: 'No link',
  },
}

export type Messages = typeof en
