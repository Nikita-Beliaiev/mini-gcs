import { useSyncExternalStore } from 'react'
import { useReplaySession } from '../session/sessionContext'
import type { PlaybackState } from './replayPlayer'

export function usePlayback<T>(selector: (state: PlaybackState) => T): T {
  const { player } = useReplaySession()
  return useSyncExternalStore(player.subscribe, () => selector(player.getState()))
}
