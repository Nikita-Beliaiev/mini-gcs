import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { initialAlertData, useAlertStore } from '../alerts/alertStore'
import { initialLatencyData, useLatencyStore } from '../connection/latencyStore'
import { initialLocaleData, useLocaleStore } from '../i18n/localeStore'
import { initialMapPointsData, useMapPointsStore } from '../map/mapPointsStore'
import { initialPlanningData, usePlanningStore } from '../planning/planningStore'

afterEach(() => {
  cleanup()
  usePlanningStore.setState(initialPlanningData)
  useAlertStore.setState(initialAlertData)
  useLatencyStore.setState(initialLatencyData)
  useLocaleStore.setState(initialLocaleData)
  useMapPointsStore.setState(initialMapPointsData)
})
