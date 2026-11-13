import { Map as MapLibreMap, type SkySpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef, useState } from 'react'
import '../map/maplibreWorker'
import { addTerrainLayers, LIGHT_HILLSHADE, showTerrainSurface } from '../map/terrainLayers'
import type { CameraMessage, PositionMessage } from '../protocol/telemetry'
import { useGroundStation } from '../station/stationContext'
import { useTerrain } from '../terrain/terrainContext'
import { cameraPoseOf } from './cameraGeometry'
import styles from './CameraPanel.module.css'
import { MAX_VIDEO_PITCH_DEG, videoCameraOf } from './videoCamera'

const VIDEO_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'
const TRUE_SCALE = 1

const SKY: SkySpecification = {
  'sky-color': '#6f9fcb',
  'horizon-color': '#c9dbe8',
  'fog-color': '#c9dbe8',
  'sky-horizon-blend': 0.6,
  'horizon-fog-blend': 0.7,
  'fog-ground-blend': 0.6,
}

interface CameraVideoProps {
  label: string
}

export default function CameraVideo({ label }: CameraVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isAimed, setIsAimed] = useState(false)
  const { telemetry } = useGroundStation()
  const terrain = useTerrain()

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const map = new MapLibreMap({
      container,
      style: VIDEO_STYLE_URL,
      interactive: false,
      attributionControl: false,
      maxPitch: MAX_VIDEO_PITCH_DEG,
      centerClampedToGround: false,
      locale: { 'Map.Title': label },
    })
    let unsubscribe: () => void = () => undefined
    let shownPosition: PositionMessage | null = null
    let shownCamera: CameraMessage | null = null

    function aim(): void {
      const { position, camera, home } = telemetry.getSnapshot()
      if (!position || !camera || !home) {
        return
      }
      if (position === shownPosition && camera === shownCamera) {
        return
      }
      const homeElevation = terrain.elevationAt(home)
      if (homeElevation === null) {
        return
      }
      shownPosition = position
      shownCamera = camera
      const view = videoCameraOf(cameraPoseOf(position, camera), homeElevation)
      if (map.getVerticalFieldOfView() !== view.verticalFovDeg) {
        map.setVerticalFieldOfView(view.verticalFovDeg)
      }
      map.jumpTo(
        map.calculateCameraOptionsFromCameraLngLatAltRotation(
          view.lngLat,
          view.altitudeM,
          view.bearingDeg,
          view.pitchDeg,
        ),
      )
      setIsAimed(true)
    }

    map.on('load', () => {
      addTerrainLayers(map, LIGHT_HILLSHADE)
      showTerrainSurface(map, true, TRUE_SCALE)
      map.setSky(SKY)
      aim()
      unsubscribe = telemetry.subscribe(aim)
    })

    return () => {
      unsubscribe()
      map.remove()
    }
  }, [telemetry, terrain, label])

  return <div ref={containerRef} className={styles.video} data-aimed={isAimed} />
}
