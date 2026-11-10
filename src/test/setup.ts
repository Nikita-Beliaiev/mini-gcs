import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { initialPlanningData, usePlanningStore } from '../planning/planningStore'

afterEach(() => {
  cleanup()
  usePlanningStore.setState(initialPlanningData)
})
